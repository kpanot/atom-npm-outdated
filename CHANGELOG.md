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
