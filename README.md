# CHT Sync

CHT Sync is an integrated solution designed to enable data synchronization between CouchDB and PostgreSQL for the purpose of analytics. Read more detail on the [CHT docs site](https://docs.communityhealthtoolkit.org/core/overview/cht-sync/).

## Using

See the [CHT docs site](https://docs.communityhealthtoolkit.org/hosting/analytics/)!

## Testing

See [testing](TESTING.md).

## Release Process

This repo has an automated release process where each feature/bug fix will be released immediately after it is merged to `main`. The release type is determined by the commit message format. Have a look at the development workflow in the [Contributor Handbook](https://docs.communityhealthtoolkit.org/contribute/code/workflow/) for more information.

### Breaking changes

Certain changes are considered breaking, due to their high consequence or lack of backwards compatibility. These should only be released in major releases. Some examples of changes tha would qualify and breaking:

- changing data structures significantly enough that a resynchronizing all data is required
- data structure migrations that require iterating over large data sets for updates
- removal of existent features
- behavioral updates of existing features that are not backwards compatible with previous behavior
- updates in configuration that are not backwards compatible

### Commit message format

The commit format should follow the convention outlined in the [CHT docs](https://docs.communityhealthtoolkit.org/contribute/code/workflow/#commit-message-format).
