'use babel';

import fetch from 'node-fetch';
import fs from 'fs';
import _ from 'lodash';
import path from 'path';
import atom from 'atom';
import semver from 'semver';
import escapeStringRegexp from 'escape-string-regexp';

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
   * @param {Object} options Worker options
   */
  constructor(options) {
    options = options ? options : {};
    this.beta = options.beta || false;
    this.info = options.info || false;
    this.npmrc = options.npmrc || '.npmrc';

    this.packageVersions = {};
  }

  /**
   * Get the registry url
   * @param {String} basePath Base path of the inspected project
   * @return {Promise} URL to the npm registry
   */
  getRegistry (basePath) {
    const file = path.join(basePath, this.npmrc);

    return new Promise((resolve, reject) =>
      fs.readFile(file, (err, data) => {
        if (err)  {
          return reject(err);
        }
        const registryLine = /\bregistry=(.*)\b/g.exec(data);

        if (registryLine && registryLine.length > 0) {
          return resolve(registryLine[1]);
        }

        resolve('no registry specified');
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
    return this.getRegistry(path.dirname(filepath))
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
      .filter((version) => this.beta || !semver.prerelease(version))
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
        if (_.isEmpty(res)) {
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
   * Find the range to select for a specific package name
   * @param {Object} dependency Dependency
   * @param {String} content Content of the current package.json
   * @param {TextEditor} textEditor Atom TextEditor
   * @return {Range} Range of the dependency text in the package.json file
   */
  getDependencyRange(dependency, content, textEditor) {
    const depRegex = new RegExp(`"${escapeStringRegexp(dependency.name)}" *: *"${escapeStringRegexp(dependency.version)}"`, 'ig')
    const startIdx = content.search(depRegex);
    const textBuffer = textEditor.getBuffer();

    if (startIdx < 0) {
      return [];
    }
    const match = content.substring(startIdx).match(depRegex);
    return new atom.Range(textBuffer.positionForCharacterIndex(startIdx), textBuffer.positionForCharacterIndex(match ? match[0].length + startIdx : startIdx));
  }

  /**
   * Generate the Linter message for the specific dependency
   * @param {Object} dependency Dependency
   * @param {String} content Content of the current package.json
   * @param {TextEditor} textEditor Atom TextEditor
   * @return {Promise} Message to the linter with the information relative to the dependency
   */
  toLinterReport(dependency, content, textEditor) {
    const latest = _.last(dependency.availableVersions);
    const latestStable = !semver.prerelease(latest) ? latest : _.last(dependency.availableVersions.filter((version) => !semver.prerelease(version)));

    let type = 'Info';
    let text = `The package <b>${dependency.name}</b>`;
    const trace = [];

    if (!semver.satisfies(latest, dependency.version)) {
      if (semver.satisfies(latestStable, dependency.version)) {
        type = 'Warning';
        text += ` can be upgraded to <b>${latest}</b>`;
      } else {
        type = 'Error';
        text += ` should be upgraded to <b>${latest}</b>`;
        if (latest !== latestStable) {
          trace.push({
            type: 'Trace',
            html: `The latest stable version is <b>${latestStable}</b>`
          });
        }
      }
    } else {
      text += ` is up-to-date (latest version: ${latest})`;
    }

    const range = this.getDependencyRange(dependency, content, textEditor);

    return {
      type: type,
      html: text,
      fix: {
        range: range,
        newText: `"${dependency.name}": "${latest}"`
      },
      trace: trace,
      range: range,
      filePath: textEditor.getPath()
    };
  }

  toLinterNotFound(dependency, content, textEditor) {
    const type = 'Error';
    const text = `The package <b>${dependency.name}</b> is not found`;

    const range = this.getDependencyRange(dependency, content, textEditor);

    return {
      type: type,
      html: text,
      range: range,
      filePath: textEditor.getPath()
    };
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

    return this.getFileContent(filepath)
      .then((content) => this.getJson(content)
        .then((packageJson) => this.decodeDependencies(packageJson))
        .then((dependencies) => _.map(_.keys(dependencies), (name) => ({name: name, version: dependencies[name]})))
        .then((dependencies) => _.map(dependencies, (dependency) => this.getAvailableVersions(filepath, dependency)
          .then((dependency) => this.toLinterReport(dependency, content, textEditor))
          .catch((err) => this.toLinterNotFound(dependency, content, textEditor)))
        )
      )
      .catch((content) => [])
      .then((reports) => Promise.all(reports))
      .then((reports) => _.filter(reports, (report) => this.info || report.type !== 'Info'));
  }

  /**
   * Get object from Json file
   * @param {String} content Content of the current package.json
   * @return {Promise} Package.json as object
   */
  getJson(content) {
    return new Promise((resolve, reject) => resolve(JSON.parse(content)));
  }

  /**
   * Get package.json file content
   * @param {String} filepath Path to package.json
   * @return {Promise} package.json file content
   */
  getFileContent(filepath) {
    return new Promise((resolve, reject) =>
        fs.readFile(filepath, 'utf8', (err, content) => {
          if (err) {
            return reject(err);
          }

          resolve(content);
        })
    );
  }

}