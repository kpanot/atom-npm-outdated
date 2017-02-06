'use babel';

import fetch from 'node-fetch';
import fs from 'fs';
import _ from 'lodash';
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
   */
  constructor(linter, suggester) {
    this.prereleases = ["stable"];
    this.npmrc = '.npmrc';
    this.packageVersions = {};
    this.linter = linter;
    this.suggester = suggester;
  }

  /**
   * Get the registry url
   * @return {Promise} URL to the npm registry
   */
  getRegistry () {
    const file = path.join(_.first(atom.project.getPaths()), this.npmrc);

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
    return _.assign({},
      ..._.keys(packageJson)
        .filter((key) => /dependencies/ig.test(key))
        .map((key) => _.get(packageJson, key))
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
      .then((registry) => fetch(`${_.trim(registry, '/')}/${dependency.name.replace('/', '%2f')}`))
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
        return !prerelease || this.prereleases.includes(_.first(prerelease));
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
        if (_.isEmpty(res) || !res.versions || res.error) {
          throw `Package ${dependency.name} not found`;
        }
        return this.packageVersions[dependency.name] = _.keys(res.versions);
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

  /**
   * Parse Json to extract dependencies
   * @param {string} content Content of the package.json file
   * @return List of dependencies
   */
  parseJson(content) {
    const packageJson = JSON.parse(content);
    const combineDependencies = this.decodeDependencies(packageJson);
    return _.map(_.keys(combineDependencies), (name) =>
      ({name: name, version: combineDependencies[name]})
    );
  }

  /**
   * Verify is the file loaded is a package.json
   * @param {TextEditor} textEditor Atom TextEditor
   */
  isTargettingFile (textEditor) {
    const filepath = textEditor.getPath();
    return _.toLower(path.basename(filepath)) === 'package.json';
  }

  /**
   * Generate the Linter messages
   * @param {TextEditor} textEditor Atom TextEditor
   * @return {Promise} Messages to the linter with the information relative to the dependencies
   */
  check(textEditor) {
    if (!this.isTargettingFile(textEditor)) {
      return [];
    }

    const content = textEditor.getText();

    try {
      const dependencies = this.parseJson(content);
      const reports = _.map(dependencies, (dependency) =>
        this.getAvailableVersions(dependency)
          .then((dependency) => this.linter.reportDependency(dependency, content, textEditor))
          .catch(() => this.linter.reportUnfound(dependency, content, textEditor))
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
    return _.includes(_.keys(combineDependencies), dependencyName);
  }

  /**
   * Generate the suggestion list
   * @param {TextEditor} textEditor Atom TextEditor
   * @param {Point} bufferPosition Current buffer position
   * @return {Promise} List of suggestion for the selected package
   */
  suggestion (textEditor, bufferPosition) {
    if (!this.isTargettingFile(textEditor)) {
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
    catch (ex) {}

    return this.getAvailableVersions(dependency)
      .then((dependency) => this.suggester.reportSuggestion(dependency))
      .catch(() => this.suggester.reportUnfound(dependency))
  }

}
