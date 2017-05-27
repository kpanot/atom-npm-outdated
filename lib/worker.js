'use babel';

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import semver from 'semver';

/**
 * Default NPM registry URL
 * @type {String}
 */
const DEFAULT_REGISTRY = 'https://registry.npmjs.org';

/**
 * NPM Outdated Worker
 */
export class NpmWorker {

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
    this.npmrc = '.npmrc';
    this.packageVersions = {};
    this.linter = linter;
    this.suggester = suggester;
    this.clicker = clicker;
  }

  /**
   * Get the registry url
   * @return {Promise} URL to the npm registry
   */
  getRegistry () {
    const file = path.join(atom.project.getPaths()[0], this.npmrc);

    return new Promise((resolve, reject) =>
      fs.readFile(file, (err, data) => {
        if (err)  {
          return reject(err);
        }
        const registryLine = /^registry=(.*)$/gm.exec(data);

        if (registryLine && registryLine.length > 0) {
          return resolve(registryLine[1]);
        }

        resolve(DEFAULT_REGISTRY);
      })
    );
  }

  /**
   * Decode the package.json to return the list of dependencies
   * @param {Object} packageJson Package.json content
   * @return {Promise} List of package dependencies
   */
  decodeDependencies(packageJson) {
    return Object.assign({},
      ...Object.keys(packageJson)
        .filter((key) => /dependencies/ig.test(key))
        .map((key) => packageJson && packageJson[key])
    );
  }

  /**
   * Fetch the server to get the package remote information
   * @param {Object} dependency Dependency
   * @return {Promise} Fetch response to the registry server for the specific dependency
   */
  fecthDependency(dependency) {
    return this.getRegistry()
      .catch(() => DEFAULT_REGISTRY)
      .then((registry) => fetch(`${registry.replace(/\/+$/, '')}/${dependency.name.replace('/', '%2f')}`))
  }

  /**
   * Extract the valuable versions according to the configuration
   * @param {String[]} versions Full list of versions
   * @return {String[]} List of valuable versions ordered ASC
   */
  extractValuableVersions(versions) {
    return versions
      .filter((version) => {
        const prerelease = semver.prerelease(version);
        return !prerelease || this.prereleases.includes(prerelease[0]);
      })
      .sort(semver.compare);
  }

  /**
   * Get the list of available versions for a package
   * @param {String} filepath Path to package.json
   * @param {Object} dependency Dependency
   * @return {Promise} Dependency with its available versions list
   */
  getAvailableVersions(dependency) {
    const registryVersions = this.fecthDependency(dependency)
      .then((res) => res.json())
      .then((res) => {
        if (!res || !res.versions || res.error) {
          throw `Package ${dependency.name} not found`;
        }
        return this.packageVersions[dependency.name] = Object.keys(res.versions);
      });

    if (this.packageVersions[dependency.name]) {
      return Promise.resolve({
        name: dependency.name,
        version: dependency.version,
        availableVersions: this.extractValuableVersions(this.packageVersions[dependency.name])
      });
    }

    return registryVersions
      .then((versions) => ({
          name: dependency.name,
          version: dependency.version,
          availableVersions: this.extractValuableVersions(versions)
        })
      );
  }

  getInstalledVersion(dependency) {
    const file = path.join(atom.project.getPaths()[0], "node_modules", dependency.name, "package.json");

    return new Promise((resolve) =>
      fs.readFile(file, (err, data) => {
        if (err)  {
          return resolve({installedVersion: undefined});
        }

        const modulePackage = JSON.parse(data);
        resolve({installedVersion: modulePackage && modulePackage.version});
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
    return Object.keys(combineDependencies).map((name) =>
      ({name: name, version: combineDependencies[name]})
    );
  }

  /**
   * Verify is the file loaded is a package.json
   * @param {string} filepath File that is currently editing
   */
  isTargettingFile (filepath) {
    return path.basename(filepath).toLowerCase() === 'package.json';
  }

  /**
   * Generate the Linter messages
   * @param {TextEditor} textEditor Atom TextEditor
   * @return {Promise} Messages to the linter with the information relative to the dependencies
   */
  check(textEditor) {
    const filepath = textEditor.getPath();
    if (!this.isTargettingFile(filepath)) {
      return [];
    }

    const content = textEditor.getText();

    try {
      const dependencies = this.parseJson(content);
      const reports = dependencies.map((dependency) =>
        (this.checkInstalled ?
          Promise.all([this.getAvailableVersions(dependency), this.getInstalledVersion(dependency)])
            .then((dependencyPartials) => Object.assign({}, ...dependencyPartials)) :
          this.getAvailableVersions(dependency)
        )
          .then((dependency) => this.linter.reportDependency(dependency, content, textEditor))
          .catch(() => this.getRegistry ()
            .catch(() => DEFAULT_REGISTRY)
            .then((registry) => this.linter.reportUnfound(dependency, content, textEditor, registry)))
      );
      return Promise.all(reports)
        .then((reports) => this.linter.filter(reports));

    } catch (err) {
      return [];

    }
  }

  /**
   * Determine if the dependency is valid
   * @param {string} content Content of the file
   * @param {string} dependencyName Dependency name to check
   * @return {boolean} Returns true if the dependency name is in the file
   */
  isDependency (content, dependencyName) {
    const packageJson = JSON.parse(content);
    const combineDependencies = this.decodeDependencies(packageJson);
    return !!Object.keys(combineDependencies).find((dep) => dep === dependencyName);
  }

  /**
   * Generate the suggestion list
   * @param {TextEditor} textEditor Atom TextEditor
   * @param {Point} bufferPosition Current buffer position
   * @return {Promise} List of suggestion for the selected package
   */
  suggestion (textEditor, bufferPosition) {
    const filepath = textEditor.getPath();
    if (!this.isTargettingFile(filepath)) {
      return [];
    }
    const lineRegex = /^"([^"]+)" *: *"([^"]*)$/g;

    const line = textEditor.lineTextForBufferRow(bufferPosition.row);
    const lineCut = line.substring(0, bufferPosition.column).trim();
    const lineMatching = lineRegex.exec(lineCut);

    if (!lineMatching || !lineMatching.length) {
      return [];
    }

    const dependency = {name: lineMatching[1], version: lineMatching[2]};

    try {
      const content = textEditor.getText().replace(line, `"${dependency.name}": "",`);
      if (!this.isDependency(content, dependency.name)) {
        return [];
      }
    }
    catch (ex) {
      /* eslint-disable no-console */
      console.error(ex);
      /* eslint-enable no-console */
    }

    return this.getAvailableVersions(dependency)
      .then((dependency) => this.suggester.reportSuggestion(dependency))
      .catch(() => this.suggester.reportUnfound(dependency))
  }

  /**
   * Link to the definition of the package
   * @param {TextEditor} textEditor Atom TextEditor
   * @param {string} text Text clicked
   * @param {Range} range Range of the selected text
   * @return {Promise} List of suggestion for the selected package
   */
  link (textEditor, text, range) {
    const filepath = textEditor.getPath();

    if (!this.isTargettingFile(filepath)) {
      return ;
    }

    const row = range.start.row;
    const DependencyNameRegex = /^"([^"]+)" *:/g;

    const line = textEditor.lineTextForBufferRow(row);
    const dependency = DependencyNameRegex.exec(line.trim());

    if (!dependency || !dependency.length) {
      return ;
    }

    const dependencyName = dependency[1];
    const content = textEditor.getText();
    if (!this.isDependency(content, dependencyName) || dependencyName.indexOf(text) < 0) {
      return ;
    }

    range.start.column = range.start.column - dependencyName.indexOf(text);
    range.end.column = range.start.column + dependencyName.length;
    return this.clicker.reportDenpendencyNameClick(dependencyName, range);
  }
}
