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
    "title": "Display info",
    "description": "Display the information messages",
    "type": "boolean",
    "default": false
  },
  "npmrc": {
    "title": "Path to NPM config file",
    "type": "string",
    "default": ".npmrc"
  }
};
