"use strict";

/**
 * Determine if the range calculation can be ignored
 * @param  {String} version Version of the NPM package
 * @return {[Boolean]}      Determine if the range calculation can be skipped
 */
function canRangeBeIgnored(version) {
  return /^git(\+(ssh|https?|file):\/\/)?.*/ig.test(version) ||
    /^.+:\/\/.*/ig.test(version) ||
    /file:.*/.test(version) ||
    /.+\/.+/.test(version);
}

module.exports = {
  canRangeBeIgnored
};
