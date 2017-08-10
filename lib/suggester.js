'use babel';

import semver from 'semver';

/**
 * Suggester helper class
 */
export class Suggester {

  /**
   * Constructor of the Suggester class
   * @constructor
   */
  constructor() {
  }

  /**
   * Generate the suggestions for the specific package
   * @param {Object} dependency Dependency
   * @return {Promise} Suggestions for the specific package
   */
  reportSuggestion (dependency) {
    const prefix = /^[^0-9]*/.exec(dependency.version)[0];

    return dependency.availableVersions
      .reverse()
      .map((version) => {
        const prerelease = semver.prerelease(version);
        return {
          text: `${prefix}${version}`,
          displayText: prefix ? `${prefix} ${version}` : version,
          type: 'value',
          replacementPrefix: dependency.version,
          leftLabel: prerelease ? prerelease[0] : 'stable'
        };
      });
  }

  /**
   * Generate default report if the package is unfound
   * @return {Promise} Empty array
   */
  reportUnfound () {
    return [];
  }
}
