# Testing 
End-to-end tests for CHT Sync can be found under `tests/`. 

Pre-requisites:
* `Node.js` version > 20

In order to run these end-to-end tests locally, follow the steps below:

1. Create an `.env` file with the placeholder values from `env.template`.

2. Install the dependencies via:

```sh
npm install
```

3. Install the `couch2pg` dependencies via:

```sh
cd couch2pg && npm install
```

4. Run the end-to-end tests:

```sh
# runs tests/e2e-test.spec.ts
npm test
```