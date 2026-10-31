# Live Verification Record

**Status: NOT VERIFIED.** No sandbox results have been recorded yet. Unit tests, a build or a deployment are not proof that the app works in Commerce.

## 1. How to record a result

For each test, fill in:

- Date and time (UTC) and the environment (ACCS project, App Builder workspace).
- Settings used (Enabled, Max Quantity, Correction).
- Result: Pass or Fail.
- Cart quantity **after** the test, from a fresh cart read.
- Evidence: a screenshot, the webhook log or the activation ID.

Never record tokens, cart IDs, customer data or raw payloads.

## 2. Platform checks

| # | Check | Expected | Result | Evidence |
| --- | --- | --- | --- | --- |
| P-01 | App installed in App Management | Installed | Pending | |
| P-02 | Webhook subscriptions | 3 active hooks | Pending | |
| P-03 | Add-item payload key | Record the real key (`quote_item`?) | Pending | |
| P-04 | Save-item payload key | Record the real key | Pending | |
| P-05 | Merge payload | `data.quote.items[]` | Pending | |
| P-06 | Quantity sent for an existing SKU | The resulting (total) line quantity | Pending | |
| P-07 | Save with correction off: is the save undone? | Cart keeps its old quantity | Pending | |
| P-08 | Merge with correction off: is the merge undone? | No line over the limit | Pending | |
| P-09 | Admin page loads | Settings are shown | Pending | |

## 3. Client scenarios

The test steps are in [deployment-and-live-testing.md](deployment-and-live-testing.md#step-e-run-the-tests).

| Test | Scenario | Result | Cart after | Evidence |
| --- | --- | --- | --- | --- |
| T-01 | Below limit | Pending | | |
| T-02 | At limit | Pending | | |
| T-03 | Over limit with the agreed message | Pending | | |
| T-04 | Existing SKU: add more | Pending | | |
| T-05 | Existing SKU: update quantity | Pending | | |
| T-06 | Several SKUs | Pending | | |
| T-07 | Admin changes the limit, no redeploy | Pending | | |
| T-08 | Invalid settings rejected | Pending | | |
| T-09 | Denied Admin role | Pending | | |
| T-10 | Guest/customer merge | Pending | | |
| T-11 | Correction on | Pending | | |
| T-12 | Admin Create New Order | Pending | | |
| T-13 | Kill switch | Pending | | |

## 4. Optional automated sandbox test

1. Prepare two disposable carts: the customer cart and a guest cart with the **same SKU**. Each must be under the limit, but their total must be over it.
2. Set Max Quantity = 10 and Correction = Off.
3. Export these variables locally (never commit them):
   - `ACCS_GRAPHQL_URL`, `ACCS_BEARER_TOKEN`
   - `ACCS_CART_ID` (the customer cart), `ACCS_CART_ITEM_UID` (the line to update), `ACCS_MERGE_SOURCE_CART_ID` (the guest cart)
   - `ACCS_EXPECT_MODE=rollback`
4. Run `npm run test:sandbox`.
5. Make new carts, set Correction = On and `ACCS_EXPECT_MODE=correct`, then run it again.

The test fails on purpose if any variable is missing. A failure is something to investigate, not a pass.

## 5. Sources

- [Webhooks in App Management](https://developer.adobe.com/commerce/extensibility/app-management/installation/webhooks/)
- [Webhook response helpers](https://github.com/adobe/aio-commerce-sdk/blob/main/packages/aio-commerce-lib-webhooks/docs/usage.md)
- [Adobe add-to-cart webhook sample](https://github.com/adobe/adobe-commerce-samples/blob/main/webhooks/add-to-cart-stock-validation/README.md)
- GraphQL [updateCartItems](https://developer.adobe.com/commerce/webapi/graphql/schema/cart/mutations/update-items/) and [mergeCarts](https://developer.adobe.com/commerce/webapi/graphql/schema/cart/mutations/merge/)
