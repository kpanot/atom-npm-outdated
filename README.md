# Atom Npm Outdated
Module `Atom` to keep your **package.json** up-to-date.

## Installation

You can look for the package `atom-npm-outdated` in the Atom package manager or run the following command:

```shell
apm install atom-npm-outdated
```

## Description

Atom Npm Outdated will display an Linter message to the package outdated of your package.json.

![Example-check](https://raw.githubusercontent.com/kilian-ito/atom-npm-outdated/master/doc/example-check.png)

And will auto-complete your packages version.

![Example-complete](https://raw.githubusercontent.com/kilian-ito/atom-npm-outdated/master/doc/example-complete.png)

## Available options

*   **Display information**:
determine if you want to see an information message to the packages with the semver including the latest version but that also allow older version.

*   **npmrc file**:
specify the default path to the .npmrc file (if your project includes one)

*   **level**:
restrict warning message (and suggestion) to a specific prerelease version level

*   **Use caret**:
write the `^` character to prefix the auto-completed package version
