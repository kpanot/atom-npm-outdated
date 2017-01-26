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
