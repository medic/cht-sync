# Testing 
End-to-end tests for CHT Sync can be found under `tests/`. 

Pre-requisites:
* `Node.js` version > 20

In order to run these end-to-end tests locally, follow the steps below:

1. Install the dependencies via:

```sh
npm ci
```

2. Run the `couch2pg` unit tests:

```sh
npm test
```

3. Run the end-to-end tests:

```sh
npm run test:e2e
```