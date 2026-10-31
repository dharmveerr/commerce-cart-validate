# Cart Item Validation: Operations Runbook

This is for running the app day to day. For deploy, install and test steps, see [deployment-and-live-testing.md](deployment-and-live-testing.md).

## 1. Turn validation off (kill switch)

1. Commerce Admin > **Apps > App Management** > Cart Item Validation > settings.
2. Set **Enabled = No** and save.
3. Add an over-limit quantity to a fresh test cart. It should be accepted.
4. Set **Enabled = Yes** when you are ready.

Use the App Management form, not the custom page, so that this still works if the custom page fails.

## 2. Stop automatic correction only

- Set **Enable Compensating Correction = No**.
- Over-limit quantities are still blocked, but the app stops writing to carts.

## 3. Logs to watch

Open the logs at Developer Console > project > workspace > **App Builder Logs**.

| Log value | Meaning | What to do |
| --- | --- | --- |
| `decision: block` | Normal block of an over-limit line | Nothing |
| `phase: configuration, decision: fail_open` | Settings could not be read, so carts are **not** validated | Check that the settings are valid (Max Quantity is a positive whole number) |
| `phase: compensation, decision: CRITICAL` | Correction failed | Fix the cart by hand (section 4) |
| `decision: invalid_payload` or `invalid_quantity` | The payload shape is not what the code expects. The cart is **allowed** (not validated). | Check the webhook payload against [verified-contracts.md](verified-contracts.md) P-03/P-04 |
| `decision: not_found` / `skipped_missing_identifier` | Correction skipped | Usually safe. Check that the cart is under the limit. |

## 4. Fix an over-limit cart by hand

1. Take `quote_id` and `item_id` from the `CRITICAL` log.
2. Read the cart with an authorized API call.
3. Set the line to the maximum, or remove it.
4. Read the cart again to confirm.
5. Find the cause: Admin permission (ACL), app association or network.

## 5. Common problems

| Problem | Check |
| --- | --- |
| Admin page action URLs contain `undefined` | Run `aio app use`, then `aio app build` again |
| App shows ASSOCIATED but install fails with `409 not-associated` | Deployment guide, step A |
| Many `invalid_payload` logs and over-limit carts not blocked | Payload key differs from the expected ones; update `validator.js` |
| Shoppers see "Unable to update the cart right now. Please try again." | The webhook action failed or timed out; check the App Builder logs |
| Settings page returns `403` | The Admin role lacks the Cart Item Validation permission |
| Invalid Max Quantity saved in the App Management form | Carts are not validated (fail open). Correct the value. |

## 6. Known limits

- One limit per cart line. There is no total across SKUs yet (gap G-3).
- One global limit. There are no per-store limits.
- Bulk/CSV imports and other cart changes outside the three events are not covered.
- Carts that were already over the limit are not fixed automatically.

## 7. Security

- Never commit `.env` or `.aio`, and never paste tokens into tickets or chat.
- Rotate any secret that has been shared. Then run `aio app use` and `aio app deploy` again.
