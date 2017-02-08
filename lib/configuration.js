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
  "npmrc": {
    "title": "Path to NPM config file",
    "type": "string",
    "default": ".npmrc"
  },
  "useCaret": {
    "title": "Use caret in version",
    "description": "Set to true to prefix the package auto-completed version with ^ sign.",
    "type": "boolean",
    "default": false
  }
};
