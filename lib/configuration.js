'use babel';

export default {
  "prerelease": {
    "title": "Level of prerelease",
    "description": "Set the level maximum to check for the libraries versions",
    "type": "string",
    "default": "stable",
    "enum": ["stable", "rc", "beta", "alpha", "dev"]
  },
  "info": {
    "title": "Display information",
    "description": "Display information of the package that have a not enough restrictive version",
    "type": "boolean",
    "default": true
  },
  "checkInstalled": {
    "title": "Check installed package version",
    "description": "The installed package will be inspected to verify that the version satisfy the package.json dependency",
    "type": "boolean",
    "default": true
  },
  "npmrc": {
    "title": "Path to NPM config file",
    "type": "string",
    "default": ".npmrc"
  },
  "npmUrl": {
    "title": "NPM Package information base url",
    "type": "string",
    "default": "https://www.npmjs.com/package"
  }
};
