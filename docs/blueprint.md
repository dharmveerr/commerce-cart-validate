# Cart Item Validation: Blueprint Summary (CDA Blueprint v7)

A short summary of what the CDA blueprint decided. For the full requirements and the gap list, see [requirements-and-solution-design.md](requirements-and-solution-design.md).

## 1. What the app does

- Limits the quantity of each cart line to a configurable maximum (default `10`).
- Uses three ACCS webhooks: add item, save item, merge cart.
- Can set an over-limit line back to the maximum ("compensating correction").
- Offers two settings screens that share the same values.

## 2. In scope

- Storefront add-to-cart and quantity updates.
- Guest-to-customer cart merge at login.
- Admin **Create New Order** (it uses the same cart events).
- All product types. Each cart line is checked, including child lines.

## 3. Out of scope

- Total quantity across all SKUs. This is pending the client's answer to Q-2.
- Different limits per store or website. There is one global limit.
- Bulk/CSV imports and other ways of changing a cart outside these three events.
- Fixing carts that were already over the limit before installation.

## 4. Key decisions

| # | Decision |
| --- | --- |
| D-1 | Built with the Adobe Commerce SDK, using three extension points |
| D-2 | Settings stored in App Management business configuration, with no custom database |
| D-3 | Both settings screens are kept for now |
| D-4 | Webhooks are `required: true`, so an action outage blocks the cart |
| D-5 | Unreadable settings or a malformed payload: allow the cart and log an error. Only business-rule violations block. |
| D-6 | The Commerce client of the associated merchant is used, with no hard-coded URL |

## 5. Risks

- Payload field names are not yet confirmed live. The code reads the documented key `quote_item` plus alternatives.
- `_after` events may not undo a save (gap G-7).
- A correction update may trigger the save webhook again. Check this in the live logs.

## 6. Release gates

- [x] Gaps G-1 and G-2 fixed, with tests
- [ ] Client confirms Q-1 (message wording) and Q-2 (cart total)
- [ ] App installed and three webhooks active in the sandbox
- [ ] All tests in [deployment-and-live-testing.md](deployment-and-live-testing.md) passed and recorded in [verified-contracts.md](verified-contracts.md)
- [ ] Second ACCS project tested (before any Marketplace listing)
