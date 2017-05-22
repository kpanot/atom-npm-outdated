'use babel';

import atomEnv from 'atom';
import path from 'path';
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
    try {
      const depRegex = new RegExp(`"${escapeStringRegexp(dependency.name)}" *: *"${escapeStringRegexp(dependency.version)}"`, 'ig')
      const startIdx = content.search(depRegex);
      const textBuffer = textEditor.getBuffer();

      if (startIdx < 0) {
        return [];
      }
      const match = content.substring(startIdx).match(depRegex);
      return new atomEnv.Range(textBuffer.positionForCharacterIndex(startIdx), textBuffer.positionForCharacterIndex(match ? match[0].length + startIdx : startIdx));

    } catch (ex) {
      return [];
    }
  }


  getVersionPrefix(version) {
    return /^[^0-9]*/.exec(version)[0];
  }

  /**
   * Generate the Linter message for the specific dependency
   * @param {Object} dependency Dependency
   * @param {String} content Content of the current package.json
   * @param {TextEditor} textEditor Atom TextEditor
   * @return {Promise} Message to the linter with the information relative to the dependency
   */
  reportDependency(dependency, content, textEditor) {
    const latest = dependency.availableVersions[dependency.availableVersions.length - 1];
    const prefix = /^[^0-9]*/.exec(dependency.version)[0];

    let severity = 'info';
    let solutions;
    let text = `The package ${dependency.name}`;
    let description;

    if (semver.validRange(dependency.version)) {
      if (!semver.satisfies(latest, dependency.version)) {
        const filteredAvailableVersion = dependency.availableVersions.filter((version) => !semver.prerelease(version));
        const latestStable = !semver.prerelease(latest) ? latest : filteredAvailableVersion[filteredAvailableVersion.length - 1];
        severity = 'warning';
        text += ` should be upgraded to ${latest}`;
        if (latest !== latestStable) {
          description = `The latest stable version is ${latestStable}`;
        }
      } else if (dependency.availableVersions.length > 1) {
        const previousVersion = dependency.availableVersions.slice(-2)[0];
        if (!semver.satisfies(previousVersion, dependency.version)) {
          return ;
        }
        text += ` can be updated to ${prefix}${latest}`;
      } else {
        if (!semver.satisfies(latest, dependency.installedVersion)) {
          text += `The installed package ${dependency.name} is outdated`;
          severity = 'warning';
          solutions = [{
            title: `install the version ${latest} of ${dependency.name}`,
            priority: 1,
            position: range,
            apply: () => {
              textEditor.setTextInBufferRange(range, replaceWith);
              atomEnv.Task.once(path.join(__dirname, '..', 'scripts', 'npmInstall.js'), [dependency.name], atom.project.getPaths()[0]);
            }
          }];
        } else {
          return;
        }
      }

    } else {
      severity = 'error';
      text = `The package ${dependency.name} has an invalid range version`;

    }

    const range = this.getDependencyRange(dependency, content, textEditor);
    const replaceWith = `"${dependency.name}": "${prefix}${latest}"`;

    if (!solutions) {
      solutions = [{
        title: `update to ${prefix}${latest}`,
        position: range,
        priority: 1,
        replaceWith: replaceWith
      }];

      if (!semver.satisfies(latest, dependency.installedVersion)) {
        solutions.push({
          title: `update and install to the version ${latest}`,
          priority: 0,
          position: range,
          apply: () => {
            textEditor.setTextInBufferRange(range, replaceWith);
            atom.notifications.addInfo(`Installing ${dependency.name} to ${latest}`);
            atomEnv.Task.once(path.join(__dirname, '..', 'scripts', 'npmInstall.js'), [dependency.name], atom.project.getPaths()[0], (code) => {
              if (!code) {
                atom.notifications.addSuccess(`${dependency.name} is now up-to-date`);
              } else {
                atom.notifications.addError(`Failed to install ${dependency.name}`);
              }
            });
          }
        });
      }
    }

    return {
      severity: severity,
      excerpt: text,
      location: {
        file: textEditor.getPath(),
        position: range
      },
      solutions: solutions,
      description: description
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
    const text = `The package ${dependency.name} is not found`;

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
    return reports.filter((report) => report && (this.info || report.type !== 'Info'));
  }
}
