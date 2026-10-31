# Test Traceability Matrix

This maps each client scenario to its unit test and its sandbox test. Sandbox test IDs (T-xx) are defined in [deployment-and-live-testing.md](deployment-and-live-testing.md#step-e-run-the-tests).

**Status key:** Pass = unit test passes · Partial = only part is checked · None = no test yet · Pending = sandbox not run.

## 1. Client scenarios

| Client scenario | Unit test (file › test name) | Unit | Sandbox |
| --- | --- | --- | --- |
| Below limit accepted | `validate-cart-item.test.js` › add item: below limit, at limit, over limit... (qty 9) | Pass | T-01 Pending |
| At limit accepted | Same test (qty 10 allowed) | Pass | T-02 Pending |
| Above limit blocked, with agreed message | Same test (qty 11 blocked, exact message checked) | Pass | T-03 Pending |
| Existing SKU, no double counting | `validate-cart-item.test.js` › existing SKU uses the resulting line quantity... | Pass (per line) | T-04, T-05 Pending |
| Aggregation across SKUs | Same test: SKU-A=10 and SKU-B=10 both allowed (per-line rule) | Per line only; cart total not on this branch (G-3) | T-06 Pending |
| Admin config change, no redeploy | Same test (lowered limit 5); `get-cart-validation-settings.test.js`, `save-cart-validation-settings.test.js` | Pass | T-07, T-08 Pending |

## 2. Other behavior

| Behavior | Unit test | Unit | Sandbox |
| --- | --- | --- | --- |
| Admin permission (ACL) | `permissions.test.js`; get/save "denies wrong method..." | Pass | T-09 Pending |
| Guest/customer merge | `revalidate-quote-merge.test.js` (3 tests) | Pass | T-10 Pending |
| Correction on save | `validate-cart-item.test.js` › saved item compensates...; `commerce-api-client.test.js` (3 tests) | Pass | T-11 Pending |
| Admin Create New Order | Same item handler | Pass | T-12 Pending |
| Disabled, qty 0, bad payload, settings error | `validate-cart-item.test.js` › disabled, correction disabled, zero removal, malformed payload...; merge › correction flag off... | Pass | T-13 Pending |
| Payload parsing | `validate-cart-item.test.js` › payload parser reads documented keys...; merge › merge parser... | Pass | Live payload check (P-03, P-04) |

## 3. How to run

```bash
npm test               # 18 unit tests (all external services mocked)
npm run test:sandbox   # live ACCS only; see verified-contracts.md
```

Passing unit tests do **not** prove the app works in Commerce. Only the sandbox tests do.
