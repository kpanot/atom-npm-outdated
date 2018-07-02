'use babel';

import configuration from './configuration';

export default {

  config: configuration,

  activate() {
    const CompositeDisposable = require('atom').CompositeDisposable;
    const install = require('atom-package-deps').install;
    const NpmWorker = require('./worker').NpmWorker;
    const Linter = require('./linter').Linter;
    const Clicker = require('./clicker').Clicker;
    const Suggester = require('./suggester').Suggester;

    install('atom-npm-outdated');

    this.linter = new Linter();
    this.clicker = new Clicker();
    this.suggester = new Suggester();
    this.npmWorker = new NpmWorker(this.linter, this.suggester, this.clicker);
    this.subscriptions = new CompositeDisposable();

    this.subscriptions.add(
      atom.config.observe('atom-npm-outdated.prerelease', (prerelease) => this.npmWorker.prereleases = configuration.prerelease.enum.slice(0, configuration.prerelease.enum.indexOf(prerelease) + 1))
    );

    this.subscriptions.add(
      atom.config.observe('atom-npm-outdated.info', (info) => this.linter.info = info)
    );

    this.subscriptions.add(
      atom.config.observe('atom-npm-outdated.checkInstalled', (checkInstalled) => this.npmWorker.checkInstalled = checkInstalled)
    );

    this.subscriptions.add(
      atom.config.observe('atom-npm-outdated.npmClient', (npmClient) => this.npmWorker.npmClient = npmClient)
    );
  },

  deactivate() {
    this.subscriptions.dispose();
  },

  provideLinter() {
    return {
      name: 'Atom Npm Outdated',
      grammarScopes: ['source.json'],
      scope: 'file',
      lintsOnChange: true,
      lint: (textEditor) =>
        this.npmWorker.check(textEditor)
    };
  },

  getProvider() {
    return {
      selector: '.source.json',
      disableForSelector: '.source.json .comment',
      inclusionPriority: 1,
      excludeLowerPriority: false,
      suggestionPriority: 2,

      // Suggestion
      getSuggestions: (options) =>
        this.npmWorker.suggestion(options.editor, options.bufferPosition),

      // Hyperlink
      getSuggestionForWord: (textEditor, text, range) =>
        this.npmWorker.link(textEditor, text, range)
    };
  }
};
