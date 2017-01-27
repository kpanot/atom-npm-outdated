'use babel';

import fetch from 'node-fetch';
import fs from 'fs';
import _ from 'lodash';
import path from 'path';
import atomEnv from 'atom';
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
    this.prereleases = options.prereleases || ["stable"];
    this.info = options.info || false;
    this.npmrc = options.npmrc || '.npmrc';

    this.packageVersions = {};
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
    return new atomEnv.Range(textBuffer.positionForCharacterIndex(startIdx), textBuffer.positionForCharacterIndex(match ? match[0].length + startIdx : startIdx));
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

    let type = 'Info';
    let text = `The package <b>${dependency.name}</b>`;
    const trace = [];

    if (semver.validRange(dependency.version)) {
      if (!semver.satisfies(latest, dependency.version)) {
        const latestStable = !semver.prerelease(latest) ? latest : _.last(dependency.availableVersions.filter((version) => !semver.prerelease(version)));
        type = 'Warning';
        text += ` should be upgraded to <b>${latest}</b>`;
        if (latest !== latestStable && !semver.satisfies(latestStable, dependency.version)) {
          trace.push({
            type: 'Info',
            html: `The latest stable version is <b>${latestStable}</b>`
          });
        }
      } else {
        text += ` is up-to-date (latest version: ${latest})`;
      }

    } else {
      type = 'Error';
      text = `The package <b>${dependency.name}</b> has an invalid range version`;

    }

    const range = this.getDependencyRange(dependency, content, textEditor);

    return {
      type: type,
      html: text,
      fix: {
        range: range,
        newText: `"${dependency.name}": "^${latest}"`
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

    const content = textEditor.getText();

    try {
      const packageJson = JSON.parse(content);
      const combineDependencies = this.decodeDependencies(packageJson);
      const dependencies = _.map(_.keys(combineDependencies), (name) =>
        ({name: name, version: combineDependencies[name]})
      );

      const reports = _.map(dependencies, (dependency) =>
        this.getAvailableVersions(filepath, dependency)
          .then((dependency) => this.toLinterReport(dependency, content, textEditor))
          .catch((err) => this.toLinterNotFound(dependency, content, textEditor))
      );
      return Promise.all(reports)
        .then((reports) => _.filter(reports, (report) => this.info || report.type !== 'Info'));

    } catch (err) {
      return [];

    }
  }

}
