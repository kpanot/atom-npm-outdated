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

  reportSuggestion (dependency) {
    return dependency.availableVersions
      .reverse()
      .map((version) => {
        const prerelease = semver.prerelease(version);
        return {
          text: this.useCaret ? `^${version}` : version,
          displayText: this.useCaret ? `^ ${version}` : version,
          type: 'value',
          replacementPrefix: dependency.version,
          leftLabel: prerelease ? prerelease[0] : 'stable'
        };
      });
  }

  reportUnfound (dependency) {
    return [];
  }
}
