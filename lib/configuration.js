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
    "default": false
  },
  "npmClient": {
    "title": "NPM client to use",
    "type": "string",
    "default": "npm",
    "enum": ["npm", "yarn"]
  },
  "cacheRefreshFrequency": {
    "title": "Cache Refresh Frequency",
    "description": "Time (in minutes) before a cached package refresh",
    "type": "integer",
    "default": 120,
    "minimum": 10,
    "maximum": 1440
  },
  "requestPoolSize": {
    "title": "Number of NPM request done in parallel",
    "description": "0 for infinit",
    "type": "integer",
    "default": 10,
    "minimum": 0
  }
};
