'use babel';

import { shell } from 'electron';

/**
 * Click helper class
 */
export class Clicker {
  /**
   * Constructor of the Clicker class
   * @constructor
   */
   constructor () {
     this.npmUrl = 'https://www.npmjs.com/package';
   }

   /**
    * Get the NPM package URL
    * @param {string} dependencyName Dependency name
    * @return {string} Package url
    */
   getNpmLink (dependencyName) {
     return `${this.npmUrl.replace(/\/+$/, '')}/${dependencyName.replace('/', '%2f')}`;
   }

   /**
    * Generate the report to the click provider
    * @param {string} dependencyName Dependency name
    * @param {Range} range Range of the package name
    * @return {Promise} of the click reporting
    */
   reportDenpendencyNameClick (dependencyName, range) {
     const link = this.getNpmLink(dependencyName);
     return Promise.resolve({
       range: range,
       callback: () => shell.openExternal(link)
     });
   }
}
