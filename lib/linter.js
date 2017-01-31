'use babel';

import _ from 'lodash';
import path from 'path';
import atomEnv from 'atom';
import semver from 'semver';
import escapeStringRegexp from 'escape-string-regexp';

/**
 * Linter helper class
 */
export class Linter {

  /**
   * Constructor of the Linter class
   * @constructor
   */
  constructor() {
    this.info = false;
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
  reportDependency(dependency, content, textEditor) {
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

  /**
   * Generate the Linter message for a unfound dependency
   * @param {Object} dependency Dependency
   * @param {String} content Content of the current package.json
   * @param {TextEditor} textEditor Atom TextEditor
   * @return {Promise} Message to the linter with the information relative to the dependency
   */
  reportUnfound(dependency, content, textEditor) {
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
   * Filter of the reporting
   * @param {Object[]} reports List of linter message to report
   * @return Filtered list of reports
   */
  filter (reports) {
    return _.filter(reports, (report) => this.info || report.type !== 'Info');
  }
}
