## 0.17.0 - Share cache between Atom instances
*   Package version refresh is now asynchronous and will be done after a quick display

## 0.16.0 - Reduce number of request in parallel

## 0.15.0 - Optimize performance with cache
*   Added Option to specify cache refresh frequency
*   Added command to clean cache
*   Fixed linter reporting issue #8 (thanks to @jsg2021)

## 0.14.0 - Use NPM view to get package information
*   Added option to specify NPM client

## 0.13.3 - Fix issue for the package without stable version

## 0.13.2 - Fix issue on the http urls

## 0.13.1 - Reduce npmrc file read acces number
*   Reduced npmrc file read to optimize first package.json file opening duration

## 0.13.0 - Private registry support
*   Feature #3, the scope specific registries are now supported in `.npmrc`

## 0.12.1 - Bugfix
*   Fix issue #2 relative to non semver version checking

## 0.12.0 - Install NPM package
*   Add the feature to install or update a dependency package

## 0.11.5 - Bugfix
*   Fix unfound package message to Linter2 format
*   Disable the installed package version check per default

## 0.11.3 - Add configuration to disable node_modules packages version checking

## 0.11.2 - Bugfix
*   Fix node-fetch version
*   Fix latest stable version in warning message

## 0.11.0 - Integration of NPM install
*   The solutions proposed by the linter now includes an NPM install with the page update
*   The Lodash dependency has been removed

## 0.10.0 - Dependency version prefix
*   Generate the version prefix based on current version

## 0.9.2 - Implement Linter v2 message format
*   Support for Linter Message v2
*   Add title to the suggestions
*   Fixed solution range issue

## 0.8.4 - Implement ESLint recommended coding style
*   Fix code according to ESlinter issue

## 0.8.3 - Configuration of NPM Url
*   Fix hyperlink underline issue
*   Add a configuration for the NPM package information website

## 0.8.1 - Optimize loading time
*   Activate the package on JSON grammar hook

## 0.8.0 - Hyperlink support
*   Hyperlink can you send you to the npmjs website by clicking on the package name
*   Fix issue on auto complete feature
*   Catch error on new invalid dependency typing check

## 0.7.4 - Small improvement
*   Add available options list in the documentation
*   Reduce the number of function requiring the Atom specific object

## 0.7.3 - Bugfix
*   Fix info message
*   Fix issue in info display calculation
*   Added caret option in the linter fix suggestion

## 0.7.0 - Not enough restricted versions are now indicated
*   Changed information message to display info only on not enough restricted package version

## 0.6.3 - Fixed over suggestion
*   Restrain the package version suggestions to the dependencies only

## 0.6.2 - Custom registry handling
*   Fix custom registry handling
*   Added auto-complete feature screenshot in readme

## 0.6.1 - Restrain auto-completion handling pattern
*   Fix auto-completion to be trigger on value only

## 0.6.0 - Package version auto-completion
*   Extract linter code from the actual worker
*   Implement auto-completion for module version

## 0.5.4 - Not found reporting fix
*   Fix the way to determine if the package is not found

## 0.5.3 - Npmrc reading
*   Based the `.npmrc` file on project base path
*   Fix registry decoding

## 0.5.0 - On fly check and better reporting
*   Allow the user to configure the prerelease level to check
*   Optimization of the execution speed
*   Stop reporting if the `package.json` file is invalid
*   Handle not found package exception

## 0.4.2 - Message clarification
*   Moved stable version information in Trace message
*   Increased the reactivity by storing the list of available versions

## 0.4.1 - Loading time
*   Reduce added loading time to Atom (from 1000ms+ to >90ms)

## 0.3.1 - Reduce message size
*   Remove current version from Linter message

## 0.3.0 - Scoped package support
*   Implementation of the support for scoped package
*   Fix for the invalid package version check

## 0.2.1 - First Release
*   Implementation of NPM outdated command based on Atom Linter
*   Creation of fix suggestion
