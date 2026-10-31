# Cart Item Validation — repository technical blueprint (v7 organisation alignment)

This repository document aligns the **existing** Blueprint v7 implementation to the requested directory tree; it does not amend the separately approved Blueprint record or change its storage decision (`none`). There is no new root `src/lib`, `#lib` alias, data store or change to the webhook contracts. Native App Management Business Config and the custom Admin UI settings page are both retained pending comparative merchant testing. All observer names/payload examples below are candidate contracts, not established ACCS behavior.

## Capability and responsibility map

| Domain | Owned configuration | Code | Runtime responsibility |
| --- | --- | --- | --- |
| Commerce app | `app.commerce.config.ts` | SDK `.generated/` (never edit) | Metadata, Business Config schema, Admin menu and three SaaS webhook registrations. |
| Commerce extensibility | `src/commerce-extensibility-1/ext.config.yaml` includes `actions/webhook/actions.config.yaml` | `actions/webhook/*/{index,validator}.js`, `actions/lib/*.js` | Validate add/update/merge, read merchant settings, optionally clamp saved items through associated merchant Commerce client. |
| Native configuration | SDK-owned `src/commerce-configuration-1/ext.config.yaml` | SDK `.generated/` | Native merchant Business Config: `enabled`, `maxQuantity`, `enableCompensatingCorrection`. |
| Admin UI | `src/commerce-backend-ui-2/ext.config.yaml` | settings actions, `actions/lib/permissions.js`, `web-src/src/pages/main-page.tsx` | Authenticated global settings page with server-side menu permission check. |
| Tests and evidence | `test/`, `Docs/` | unit and sandbox suites | Local behavior assertions versus live contract evidence. |

## Runtime contract preserved

- Registered `runtimeAction` names remain `cart-validation/validate-cart-item` and `cart-validation/revalidate-quote-merge`. The nested YAML `function` paths alone change. Generated App Management action URLs remain under the same extension points.
- `observer.sales_quote_add_item` (candidate `data.quoteItem`) uses the item handler and blocks if over limit; `observer.sales_quote_item_save_after` (candidate `data.item`) additionally attempts correction if enabled. `observer.sales_quote_merge_after` (candidate `data.quote.items[]`) checks every row and may correct offending rows.
- Each cart line (including parent/child rows) has the same single global `maxQuantity`. Zero removal bypasses validation. Invalid quantity is rejected; config unavailable causes cart hooks to fail open with structured logging. Settings actions validate and fail closed.
- Both settings surfaces use native Business Config, not App Builder State or custom DB. Associated-merchant Commerce client resolves the backend per installation, avoiding a fixed ACCS tenant.

## Risks and acceptance gates

The three candidate observers' availability, payload fields and whether after-named hooks can prevent persistence are not verified on ACCS. Correction can re-enter hooks; check the read-before-write guard and latency live. Unit tests alone do not prove storefront/merge/Admin Create New Order enforcement. The app is not Marketplace-ready until `Docs/verified-contracts.md` records successful disposable-cart tests on at least two ACCS projects and resolves the Stage App Management 500. The organisation change passes when all runtimeAction names, responses, settings and permissions remain unchanged, YAML resolves, the frontend builds and the full unit suite passes.
