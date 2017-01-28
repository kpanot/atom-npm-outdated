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
  constructor(linter) {
    this.prereleases = ["stable"];
    this.npmrc = '.npmrc';
    this.packageVersions = {};
    this.linter = linter;
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
        const registryLine = /\bregistry=(.*)\b/g.exec(data);

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
   * @param {String} filepath Path to package.json
   * @param {Object} dependency Dependency
   * @return {Promise} Fetch response to the registry server for the specific dependency
   */
  fecthDependency(filepath, dependency) {
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
  getAvailableVersions(filepath, dependency) {
    const registryVersions = this.fecthDependency(filepath, dependency)
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
   * Generate the Linter messages
   * @param {TextEditor} textEditor Atom TextEditor
   * @return {Promise} Messages to the linter with the information relative to the dependencies
   */
  check(textEditor) {
    const filepath = textEditor.getPath();
    if (_.toLower(path.basename(filepath)) !== 'package.json') {
      return [];
    }

    const content = textEditor.getText();

    try {
      const dependencies = this.parseJson(content);
      const reports = _.map(dependencies, (dependency) =>
        this.getAvailableVersions(filepath, dependency)
          .then((dependency) => this.linter.reportDependency(dependency, content, textEditor))
          .catch(() => this.linter.reportUnfound(dependency, content, textEditor))
      );
      return Promise.all(reports)
        .then((reports) => this.linter.filter(reports));

    } catch (err) {
      console.error(err);
      return [];

    }
  }

}
