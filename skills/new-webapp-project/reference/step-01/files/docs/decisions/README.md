# Decision records

Short notes on why the prototype is built the way it is. Each one ends with **Revisit when**: the conditions that
should reopen the decision. When a decision changes, add a new record that supersedes the old one, rather than
rewriting history.

| # | Decision | Status |
|---|---|---|
| [0001](0001-redis-in-memory-only.md) | Redis only, in memory, nothing on disk | Accepted |
| [0002](0002-direct-model-execution.md) | Run the model directly in the API, no job queue | Accepted |
| [0003](0003-form-data-in-browser.md) | Form data stays in the browser until Analyze | Accepted |
| [0004](0004-react-vite-openapi-client.md) | React + Vite, typed client generated from OpenAPI | Accepted |
| [0005](0005-regression-test-policy.md) | Growing regression test suite, `make test` gate | Accepted |
| [0006](0006-two-stage-deployment.md) | Two-stage deployment: local first, then Kubernetes | Accepted |
