# Cart Item Validation — LLD (directory and contracts)

## Source-to-action map

| Runtime package/action | Function in `actions/webhook/actions.config.yaml` | Parser / dependencies | Existing behavior |
| --- | --- | --- | --- |
| `cart-validation/validate-cart-item` | `validate-cart-item/index.js` | `./validator.js`, `../../lib/{settings,is-over-limit,commerce-api-client}.js` | Parse `quoteItem` or `item`; success / exception / optional saved-item correction. |
| `cart-validation/revalidate-quote-merge` | `revalidate-quote-merge/index.js` | `./validator.js`, same `../../lib/` | Parse `data.quote`, iterate rows, optionally correct; return first offender's exception. |
| `cart-validation-settings/get-cart-validation-settings` | `actions/get-cart-validation-settings/index.js` in backend UI config | `../lib/permissions.js`, `../../../commerce-extensibility-1/actions/lib/settings.js` | GET 200 settings; 403 ACL; 405 method; 500 configuration; 502 auth unavailable. |
| `cart-validation-settings/save-cart-validation-settings` | `actions/save-cart-validation-settings/index.js` in backend UI config | `../lib/permissions.js`, `../../../commerce-extensibility-1/actions/lib/{settings,is-over-limit}.js` | POST validated JSON; 200/400/403/405/500/502; global config write. |

**Build-verified include resolution:** `function` entries in `actions/webhook/actions.config.yaml` resolve relative to that included file, so `validate-cart-item/index.js` points at `src/commerce-extensibility-1/actions/webhook/validate-cart-item/index.js`. An `actions/webhook/` prefix there duplicates the path and fails build with ENOENT. Backend UI function paths remain relative to their own extension config.

`validator.js` files are pure candidate-payload extractors returning original item/quote and logging context. `index.js` orchestrates and catches failures. `actions/lib/settings.js` reads three keys at global scope and validates positive integer limit. `actions/lib/commerce-api-client.js` uses merchant association, current-qty read guard, bounded retry and 404 no-op.

## Data flow and error outcomes

```text
add: quoteItem → parse → settings → invalid qty? exception : qty>limit? exception : success
save: item → parse → settings → qty>limit? (optional GET/PUT clamp) + exception : success
merge: quote.items[] → parse → settings → check each → optional clamp each offender → first exception/success
UI: GET or POST → method → permission → read or validate/save Business Config → JSON status
```

Payload field names and webhook dispatch are sandbox assumptions; do not infer transaction guarantees from `webhook_type: before` on `_after` observer names. Logging records handler/source/decision/identifiers, not token or body. Two settings interfaces intentionally coexist. No new API route, HTTP method, product logic, setting or authorization policy is introduced.

## Structure and tests

Root `test/commerce-extensibility-1/actions/` and `test/commerce-backend-ui-2/actions/` mirror handwritten source, with sandbox-only `test/integration/prevention-guarantee.sandbox.test.js`. `npm run test` runs full unit suite; `npm run test:sandbox` must be invoked separately with disposable carts. `.generated/` and build-generated Admin action URLs are SDK-owned. `Docs/` holds designs, runbook, traceability and live evidence; repo root holds `README.md` and `.gitignore` but no workspace-binding credentials.
