# Deployment and Live Testing: Step by Step

Use a **disposable ACCS sandbox** and test carts only. Never test on production or on real customer carts.

| Step | What | Status (31 Oct 2026) |
| --- | --- | --- |
| A | Fix the association error | **Blocked** |
| B | Build and deploy | Done (Stage) |
| C | Associate and install | Blocked by step A |
| D | Prepare for testing | To do |
| E | Run the tests | To do |
| F | Record the results and stop rules | To do |
| G | Second ACCS project | Before Marketplace only |

## Step A: Fix the association error

**Problem:**

- At 09:52:46 UTC on 31 Oct 2026, `POST https://aemx-mngr.adobe.io//v2/extensions` returned **500**, with `x-request-id: b432ad8a-1489-4967-9db9-a27129b95a05`.
- An earlier install attempt returned `409 not-associated`.

**Steps:**

1. In Commerce Admin, open **Apps > App Management**. Note the app state: not listed, ASSOCIATED or installed. Do **not** click Associate again yet.
2. In Developer Console, go to **Commerce Cart Validate > Stage > App Builder Logs**. Filter from 09:52 to 09:53 UTC on the action `app-management/association`. Save the activation ID and the error, if there is one.
3. Choose one of these, based on what you found:
   - **The association action failed:** fix that error, then rebuild and redeploy (step B).
   - **There is no association action and the app is not associated:** open an Adobe support ticket. Include the time, the URL (note the double slash), the request ID, and the org, project and workspace IDs.
   - **The app is already associated:** click **Manage Scopes > Sync Commerce scopes**, then go to step C.
4. Never put tokens, cookies or secrets in tickets.

## Step B: Build and deploy

1. Select the workspace: `aio app use --global --no-input --merge` (org > Commerce Cart Validate > Stage).
2. In the Developer Console, check that the workspace has these APIs: I/O Management API, ACCS-REST-API and OAuth Server-to-Server.
3. Run:

   ```bash
   npm install
   npm run typecheck
   npm test
   aio app build
   aio app deploy
   ```

4. Check the deploy output:
   - It used the Stage namespace.
   - It lists 3 extension points.
   - The Admin UI URLs do not contain `undefined`.
5. Deploying does **not** install the app in Commerce.

## Step C: Associate and install

1. Go to **Apps > App Management > Associate App**, choose **Commerce Cart Validate > Stage**, then click **Associate**. Do this **once**.
2. Check that the scopes synced. If they did not, use **Manage Scopes > Sync Commerce scopes**.
3. Click **Install** and note the result.
4. In **System > Webhooks > Webhooks Subscriptions**, check that 3 hooks are active:
   - `observer.sales_quote_add_item` (`validate_add_item`)
   - `observer.sales_quote_item_save_after` (`validate_saved_item`)
   - `observer.sales_quote_merge_after` (`validate_merged_quote`)
5. Give the **Cart Item Validation** permission to the Admin roles that need it.

## Step D: Prepare for testing

- **Products:** one simple, one configurable and one bundle product.
- **Admin roles:** one with the permission and one without.
- **Carts:** a new guest or customer cart for every test.
- **After every test, read the cart again**, for example with the GraphQL `cart(cart_id)` query. A response alone does not prove the final quantity.
- Write every result in [verified-contracts.md](verified-contracts.md).

## Step E: Run the tests

Start with **Enabled = Yes, Max Quantity = 10, Correction = Off**.

| Test | Client scenario | Steps | Expected result |
| --- | --- | --- | --- |
| T-01 | Below limit | Add 9 | Accepted. Cart = 9. |
| T-02 | At limit | Add 10 | Accepted. Cart = 10. |
| T-03 | Over limit | Add 11 | Blocked with "You have reached the maximum amount of items." Cart has no line of 11. |
| T-04 | Existing SKU: add | Add 8, then add 3 more of the same SKU | Blocked. Cart stays at 8. |
| T-05 | Existing SKU: update | Cart has 3; update it to 11 | Blocked. Cart stays at 3. |
| T-06 | Several SKUs | SKU A = 10, then SKU B = 10 | Per-line rule: both accepted. Cart-total rule: SKU B blocked. Depends on Q-2. |
| T-07 | Admin config change | Set Max = 5 on the custom page (no redeploy), then add 6 | Blocked. The App Management form also shows 5. Set it back to 10 afterwards. |
| T-08 | Invalid settings | Save `0`, `1.5`, or a very large number | Rejected. Nothing is saved. |
| T-09 | Admin permission | Open the page or call the actions with the role that lacks the permission | `403` |
| T-10 | Merge | Customer cart has 6 of an SKU and the guest cart has 5 of the same SKU; log in | Blocked, or every line is 10 or less. Repeat with Correction = On. |
| T-11 | Correction on | Correction = On; update a line to 11 | Final quantity = 10 |
| T-12 | Admin order | **Create New Order** with 11 | Blocked |
| T-13 | Kill switch | Enabled = No; add 11 | Accepted. Set Enabled = Yes afterwards. |

Optional: run the automated sandbox test (see [verified-contracts.md](verified-contracts.md#4-optional-automated-sandbox-test)).

## Step F: Record the results and stop rules

- Record every test in [verified-contracts.md](verified-contracts.md), with evidence.
- **Stop and report** if:
  - install fails,
  - a webhook is missing,
  - a cart keeps more than the maximum after a block, or
  - a secret is exposed.
- **Roll back:** set **Enabled = No** in the App Management settings, then check it on a fresh cart.

## Step G: Second ACCS project (before Marketplace)

Repeat steps C to F on a second ACCS project with different credentials.

## References

- [Associate and manage an app](https://experienceleague.adobe.com/en/docs/commerce/app-management/manage-app/manage-app)
- [App Management install and webhooks](https://experienceleague.adobe.com/en/docs/commerce/app-management/install)
- [Testing SaaS webhooks](https://developer.adobe.com/commerce/extensibility/webhooks/testing/)
- [App Builder logging](https://developer.adobe.com/app-builder/docs/guides/app_builder_guides/application_logging/logging/)

