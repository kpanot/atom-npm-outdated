'use babel';

import configuration from './configuration';

export default {

  config: configuration,

  activate() {
    const CompositeDisposable = require('atom').CompositeDisposable;
    const install = require('atom-package-deps').install;
    const NpmWorker = require('./worker').NpmWorker;

    install('atom-npm-outdated');

    this.npmWorker = new NpmWorker();
    this.subscriptions = new CompositeDisposable();

    this.subscriptions.add(
      atom.config.observe('atom-npm-outdated.beta', (beta) => this.npmWorker.beta = beta)
    );

    this.subscriptions.add(
      atom.config.observe('atom-npm-outdated.info', (info) => this.npmWorker.info = info)
    );

    this.subscriptions.add(
      atom.config.observe('atom-npm-outdated.npmrc', (npmrc) => this.npmWorker.npmrc = npmrc)
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
      lintOnFly: atom.config.get('atom-npm-outdated.lintOnFly'),
      lint: (textEditor) => this.npmWorker.check(textEditor)
    };
  }
};
