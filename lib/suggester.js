'use babel';

import semver from 'semver';
import _ from 'lodash';

/**
 * Suggester helper class
 */
export class Suggester {

  /**
   * Constructor of the Suggester class
   * @constructor
   */
  constructor() {
    this.useCaret = false;
  }

  /**
   * Generate the suggestions for the specific package
   * @param {Object} dependency Dependency
   * @return {Promise} Suggestions for the specific package
   */
  reportSuggestion (dependency) {
    return dependency.availableVersions
      .reverse()
      .map((version) => {
        const prerelease = semver.prerelease(version);
        return {
          text: this.useCaret ? `^${version}` : version,
          displayText: version,
          type: 'value',
          replacementPrefix: dependency.version,
          leftLabel: prerelease ? prerelease[0] : 'stable'
        };
      });
  }

  /**
   * Generate default report if the package is unfound
   * @param {Object} dependency Dependency
   * @return {Promise} Empty array
   */
  reportUnfound (dependency) {
    return [];
  }
}
