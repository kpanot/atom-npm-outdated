'use babel';

import _ from 'lodash';
import { shell } from 'electron';

/**
 * Default NPM registry URL
 * @type {String}
 */
const DEFAULT_NPM_URL = 'https://www.npmjs.com/package';

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
    * @param {string} dependencyName Dependency name
    * @return {string} Package url
    */
   getNpmLink (dependencyName) {
     return `${_.trim(DEFAULT_NPM_URL, '/')}/${dependencyName.replace('/', '%2f')}`;
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
