'use babel';

export default {
  "beta": {
    "title": "Check beta version",
    "description": "Look at the beta version of the libraries",
    "type": "boolean",
    "default": false
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
  },
  "lintOnFly": {
    "title": "Lint on change",
    "description": "If option is set to false, the linter is only triggered when package.json is saved. When set to true, it also invokes the linter every time the user stops typing, after a delay configurable by the user in Linter's settings.",
    "type": "boolean",
    "default": false
  }
};
