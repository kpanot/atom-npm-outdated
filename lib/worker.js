"use babel";

import { BufferedProcess } from "atom";
import { readFile } from "fs";
import path from "path";
import semver from "semver";
import storage from "electron-json-storage";

import { canRangeBeIgnored } from "./helpers";

/**
 * NPM Outdated Worker
 */
export class NpmWorker {
  get CACHE_NAME() {
    return "atom-npm-outdated";
  }

  /**
   * Constructor of the NpmWorker class
   * @constructor
   * @param {Linter} linter Linter instance
   * @param {Suggester} suggester Suggester instance
   * @param {Clicker} clicker Clicker instance
   */
  constructor(linter, suggester, clicker) {
    this.prereleases = ["stable"];
    this.checkInstalled = true;
    this.npmClient = "npm";
    this.cacheRefreshFrequency = 60;
    this.packages = {};
    this.linter = linter;
    this.suggester = suggester;
    this.clicker = clicker;
    this.requestPoolSize = 10;
    this.runningRequestSize = 0;
    this.requestStack = [];
    this.enableStreamReporting = true;
  }

  /**
   * Decode the package.json to return the list of dependencies
   * @param {Object} packageJson Package.json content
   * @return {Promise} List of package dependencies
   */
  decodeDependencies(packageJson) {
    return Object.assign({},
      ...Object.keys(packageJson)
        .filter(key => /dependencies/gi.test(key))
        .map(key => packageJson && packageJson[key])
    );
  }
  /**
   * Get the package name without the scope part
   * @param  {String} dependencyName Dependency full name
   * @return {String}                Dependency base name
   */
  getDependencyPackageScope(dependencyName) {
    const split = dependencyName.split("/");
    return split.length > 0 ? split[0] : undefined;
  }

  /**
   * Get registry for a specific dependency
   * @param  {Object} registries List of registries
   * @param  {Object} dependency Dependency object
   * @return {String}            Registry to target
   */
  getPackageRegistry(registries, dependency) {
    const scope = this.getDependencyPackageScope(dependency.name);
    return (scope && registries.scoped[scope]) || registries.default;
  }

  /**
   * Process to the NPM registry info request
   * @param  {Object} dependency Dependency
   * @return {Promise}          Dependency with its available versions list
   */
  processRequest(dependency) {
    return new Promise((resolve, reject) => {
      let res = "";
      let log = "";
      new BufferedProcess({
        command: this.npmClient,
        args: ["info", dependency.name, "--json", "-d"],
        options: {
          env: process.env,
          cwd: atom.project.getPaths()[0]
        },
        stderr: output => (log += output),
        stdout: output => (res += output),
        exit: code => {
          const regexp =
            this.npmClient === "yarn"
              ? /"(.*): Not found"/
              : /http request GET (.*)/;
          const uri = regexp.exec(log);
          dependency.registry =
            uri && uri[1] && uri[1].slice(0, uri[1].lastIndexOf("/"));

          if (!code) {
            resolve({ res, dependency });
          } else {
            reject(dependency);
          }
        }
      });
    });
  }

  /**
   * Treat the request in the stack
   * @param  {Object} dependency  Dependency
   * @param  {Promise} resolve    Promise Resolve function
   * @param  {Promise} reject     Promise Reject function
   */
  requestInPool({ dependency, resolve, reject }) {
    if (
      this.requestPoolSize &&
      this.runningRequestSize >= this.requestPoolSize
    ) {
      return this.requestStack.push({ dependency, resolve, reject });
    }
    this.runningRequestSize++;

    const next = () => {
      this.runningRequestSize--;
      if (this.requestStack.length) {
        this.requestInPool(this.requestStack.shift());
      }
    };

    this.processRequest(dependency)
      .then(v => {
        resolve(v);
        next();
      })
      .catch(v => {
        reject(v);
        next();
      });
  }

  /**
   * Fetch the server to get the package remote information
   * @param {Object} dependency Dependency
   * @return {Promise} Content of the Registry information
   */
  fecthDependency(dependency) {
    return new Promise((resolve, reject) =>
      this.requestInPool({ dependency, resolve, reject })
    );
  }

  /**
   * Extract the valuable versions according to the configuration
   * @param {String[]} versions Full list of versions
   * @return {String[]} List of valuable versions ordered ASC
   */
  extractValuableVersions(versions) {
    return versions
      .filter(version => {
        const prerelease = semver.prerelease(version);
        return !prerelease || this.prereleases.includes(prerelease[0]);
      })
      .sort(semver.compare);
  }

  /**
   * Determine if the cached package need to be updated
   * @param {Object} pck        Package
   * @return {Boolean}          True if the package need to be updated
   */
  isRefreshNeeded(pck) {
    const now = new Date();
    return !pck.infoDate ||
      new Date(pck.infoDate) < new Date (now.getTime() - (this.cacheRefreshFrequency * 60000))
    ;
  }

  /**
   * Update the packages with the information retreived from the registry
   * @param {Object} dependency Dependency
   * @return {Promise}          Dependency with its available versions list
   */
  updatePackages(dependency) {
    return this.fecthDependency(dependency)
      .then(({ res, dependency }) => {
        let obj = JSON.parse(res);
        if (this.npmClient === "yarn") {
          obj = obj.data;
        }
        obj.registry = dependency.registry;
        obj.infoDate = new Date();
        return obj;
      })
      .then(res => {
        this.packages[dependency.name] = res;
        return this.updateCache()
          .then(() => res)
          .catch(() => Promise.resolve(res));
      });
  }

  /**
   * Update the application cache with the received package information
   */
  updateCache() {
    const cacheP = new Promise((resolve, reject) =>
      storage.get(this.CACHE_NAME, (error, data) => (error ? reject(error) : resolve(data)))
    )

    return cacheP
      .catch(() => Promise.resolve())
      .then((store) => storage.set(this.CACHE_NAME, Object.assign(store || {}, this.packages), () => {}));
  }

  /**
   * Retrieve a package information from dependency from package.json file
   * @param  {Object}  dependency Dependency
   * @return {Promise}            Package information if available
   */
  getPackageFromDependency(dependency) {
    const currentPackage = this.packages[dependency.name];
    if (currentPackage) {
      return Promise.resolve(currentPackage);
    }

    const cacheP = new Promise((resolve, reject) =>
      storage.get(this.CACHE_NAME, (error, data) => (error ? reject(error) : resolve(data)))
    );

    return cacheP
      .then((store) => store && store[dependency.name])
      .then((currentPackage) => {
        if (!currentPackage) {
          return Promise.reject(currentPackage);
        }

        return currentPackage;
      });
  }

  /**
   * Get the list of available versions for a package
   * @param {Object} dependency Dependency
   * @return {Promise} Dependency with its available versions list
   */
  getAvailableVersions(dependency) {
    return this.getPackageFromDependency(dependency)
      .catch(() => this.updatePackages(dependency))
      .then((currentPackage) => this.isRefreshNeeded(currentPackage) ? this.updatePackages(dependency) : Promise.resolve(currentPackage))
      .catch((currentPackage) => {
        // eslint-disable-next-line no-console
        console.warn(`Unable to update ${dependency.name}`);
        return Promise.resolve(currentPackage);
      })
      .then((currentPackage) => ({
        name: dependency.name,
        version: dependency.version,
        availableVersions: this.extractValuableVersions(currentPackage.versions)
      }));
  }

  getInstalledVersion(dependency) {
    const file = path.join(
      atom.project.getPaths()[0],
      "node_modules",
      dependency.name,
      "package.json"
    );

    return new Promise(resolve =>
      readFile(file, (err, data) => {
        if (err) {
          return resolve({ installedVersion: "0.0.0" });
        }

        const modulePackage = JSON.parse(data);
        resolve({ installedVersion: modulePackage && modulePackage.version });
      })
    );
  }

  /**
   * Parse Json to extract dependencies
   * @param {string} content Content of the package.json file
   * @return List of dependencies
   */
  parseJson(content) {
    const packageJson = JSON.parse(content);
    const combineDependencies = this.decodeDependencies(packageJson);
    return Object.keys(combineDependencies).map(name => ({
      name: name,
      version: combineDependencies[name]
    }));
  }

  /**
   * Verify is the file loaded is a package.json
   * @param {string} filepath File that is currently editing
   */
  isTargettingFile(filepath) {
    return path.basename(filepath).toLowerCase() === "package.json";
  }

  /**
   * Generate the Linter messages
   * @param {TextEditor} textEditor Atom TextEditor
   * @return {Promise} Messages to the linter with the information relative to the dependencies
   */
  check(textEditor, options) {
    const content = textEditor.getText();
    const reportMessages = [];

    let dependencies = [];
    try {
      dependencies = this.parseJson(content);
    } catch (ex) {
      // eslint-disable-next-line no-console
      console.error(ex);
    }
    const reports = dependencies
      .filter(dependency => !canRangeBeIgnored(dependency.version))
      .map(dependency =>
        (this.checkInstalled
          ? Promise.all([
              this.getAvailableVersions(dependency),
              this.getInstalledVersion(dependency)
            ]).then(dependencyPartials => Object.assign({}, ...dependencyPartials))
          : this.getAvailableVersions(dependency)
        )
          .then(dependency => dependency ? this.linter.reportDependency(dependency, content, textEditor) : undefined)
          .catch(errorDependency => Promise.resolve(this.linter.reportUnfound(errorDependency, content, textEditor)))
          .then((reportMessage) => {
            reportMessages.push(reportMessage);
            return reportMessage;
          })
          .then((reportMessage) => {
            if (this.enableStreamReporting && options.streamReporting) {
              options.report(this.linter.filter(reportMessages))
            }
            return reportMessage;
          })
      );
    return Promise.all(reports)
      .then(() => options.report(this.linter.filter(reportMessages)))
      .then(() => reportMessages);
  }

  /**
   * Determine if the dependency is valid
   * @param {string} content Content of the file
   * @param {string} dependencyName Dependency name to check
   * @return {boolean} Returns true if the dependency name is in the file
   */
  isDependency(content, dependencyName) {
    const packageJson = JSON.parse(content);
    const combineDependencies = this.decodeDependencies(packageJson);
    return !!Object.keys(combineDependencies).find(
      dep => dep === dependencyName
    );
  }

  /**
   * Generate the suggestion list
   * @param {TextEditor} textEditor Atom TextEditor
   * @param {Point} bufferPosition Current buffer position
   * @return {Promise} List of suggestion for the selected package
   */
  suggestion(textEditor, bufferPosition) {
    const filepath = textEditor.getPath();
    if (!filepath || !this.isTargettingFile(filepath)) {
      return [];
    }

    const lineRegex = /^"([^"]+)" *: *"([^"]*)$/g;

    const line = textEditor.lineTextForBufferRow(bufferPosition.row);
    const lineCut = line.substring(0, bufferPosition.column).trim();
    const lineMatching = lineRegex.exec(lineCut);

    if (!lineMatching || !lineMatching.length) {
      return [];
    }

    const dependency = { name: lineMatching[1], version: lineMatching[2] };


    this.getPackageFromDependency(dependency)
      .catch(() => this.updatePackages(dependency))
      // eslint-disable-next-line no-console
      .catch(dependency => console.error(`Unable to update ${dependency.name}`));

    try {
      const content = textEditor
        .getText()
        .replace(
          line,
          `"${dependency.name}": ""${line[line.length - 1] === "," ? "," : ""}`
        );
      if (!this.isDependency(content, dependency.name)) {
        return [];
      }
    } catch (ex) {
      // eslint-disable-next-line no-console
      console.error(ex);
    }

    return this.getAvailableVersions(dependency)
      .then(dependency => this.suggester.reportSuggestion(dependency))
      .catch(errorDependency => this.suggester.reportUnfound(errorDependency));
  }

  /**
   * Link to the definition of the package
   * @param {TextEditor} textEditor Atom TextEditor
   * @param {string} text Text clicked
   * @param {Range} range Range of the selected text
   * @return {Promise} List of suggestion for the selected package
   */
  link(textEditor, text, range) {
    const filepath = textEditor.getPath();

    if (!filepath || !this.isTargettingFile(filepath)) {
      return;
    }

    const row = range.start.row;
    const DependencyNameRegex = /^"([^"]+)" *:/g;

    const line = textEditor.lineTextForBufferRow(row);
    const dependency = DependencyNameRegex.exec(line.trim());

    if (!dependency || !dependency.length) {
      return;
    }

    const dependencyName = dependency[1];
    const content = textEditor.getText();
    if (!this.isDependency(content, dependencyName) || dependencyName.indexOf(text) < 0) {
      return;
    }

    range.start.column = range.start.column - dependencyName.indexOf(text);
    range.end.column = range.start.column + dependencyName.length;
    return this.clicker.reportDenpendencyNameClick(
      this.packages[dependencyName] || { name: dependencyName },
      range
    );
  }
}
