'use babel';

import { shell } from 'electron';

const DEFAULT_REGISTRY = 'https://registry.npmjs.org';

/**
 * Click helper class
 */
export class Clicker {
  /**
   * Constructor of the Clicker class
   * @constructor
   */
   constructor () {
   }

   /**
    * Get the NPM package URL
    * @param {Object} dependency Dependency object
    * @return {string} Package url
    */
   getNpmLink (dependency) {
     return `${(dependency.registry || DEFAULT_REGISTRY).replace(/\/+$/, '')}/${dependency.name.replace('/', '%2f')}`;
   }

   /**
    * Generate the report to the click provider
    * @param {Object} dependency Dependency object
    * @param {Range} range Range of the package name
    * @return {Promise} of the click reporting
    */
   reportDenpendencyNameClick (dependency, range) {
     const link = this.getNpmLink(dependency);
     return Promise.resolve({
       range: range,
       callback: () => shell.openExternal(link)
     });
   }
}
