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
      atom.commands.add('atom-workspace', {
        'atom-npm-outdated:clean cache': () => this.npmWorker.packages = {}
      })
    );

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

    this.subscriptions.add(
      atom.config.observe('atom-npm-outdated.cacheRefreshFrequency', (cacheRefreshFrequency) => this.npmWorker.cacheRefreshFrequency = cacheRefreshFrequency)
    );

    this.subscriptions.add(
      atom.config.observe('atom-npm-outdated.requestPoolSize', (requestPoolSize) => this.npmWorker.requestPoolSize = requestPoolSize)
    );

    this.subscriptions.add(
      atom.config.observe('atom-npm-outdated.streamReporting', (enableStreamReporting) => this.npmWorker.enableStreamReporting = enableStreamReporting)
    );
  },

  deactivate() {
    const storage = require('electron-json-storage');

    this.subscriptions.dispose();
    storage.remove("atom-npm-outdated", () => {});
  },

  consumeIndie(registerIndie) {
    const linter = registerIndie({
      name: 'Atom Npm Outdated',
      grammarScopes: ['source.json'],
      scope: 'file'
    });

    this.subscriptions.add(linter);

    this.subscriptions.add(atom.workspace.observeTextEditors((textEditor) => {
      const editorPath = textEditor.getPath();
      if (!editorPath || !/package\.json$/i.test(editorPath)) { return }

      const setMessages = (reports) => linter.setMessages(editorPath, reports);

      this.npmWorker.check(textEditor, {report: setMessages, streamReporting: true})
        .catch()
        .then(() => {
          const subscription = textEditor.onDidStopChanging(() => this.npmWorker.check(textEditor, {report: setMessages, streamReporting: false}));
          const disposeSubscription = textEditor.onDidDestroy(() => {
            subscription.dispose();
            this.subscriptions.remove(disposeSubscription);
            this.subscriptions.remove(subscription);
            linter.setMessages(editorPath, []);
          });
          this.subscriptions.add(subscription);
          this.subscriptions.add(disposeSubscription);
        });
    }));
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
