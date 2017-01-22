'use babel';

import { CompositeDisposable } from 'atom';
import { install } from 'atom-package-deps';
import fs from 'fs';
import { NpmWorker } from './worker';
import configuration from './configuration';

export default {

  config: configuration,

  activate() {
    install('atom-npm-outdated')

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
      lintOnFly: true,
      lint: (textEditor) => this.npmWorker.check(textEditor)
    };
  }
};
