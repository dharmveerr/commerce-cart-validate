# ACCS App Builder – Cart Item Maximum Quantity Validation
## Implementation Record (Updated – as built)

**Version / date:** Updated — 2026-10-29  
**Status:** Implemented per CDA Technical Blueprint v7 ([CDA-blueprint-7.md](CDA-blueprint-7.md)) and aligned with Adobe's Commerce app structure (`@adobe/aio-commerce-lib-app`, integration starter kit). 17 automated tests pass; `aio app build` and `aio app deploy` succeed. **App Management installation and live sandbox tests are pending** (section 12).  
**Relationship to [appbuildercartValidation-plan.md](appbuildercartValidation-plan.md) (Final v2):** that plan proposed a different design (`save_before`, no compensating correction). It was **not** implemented; differences are listed in section 14.  
**App id / name:** `cart-item-validation` / *Cart Item Validation* (Developer Console project: *Commerce Cart Validate*)  
**Platform:** Adobe Commerce as a Cloud Service (ACCS) + App Builder + App Management + Admin UI SDK v2 (`commerce/backend-ui/2`)  
**Webhooks:** `observer.sales_quote_add_item`, `observer.sales_quote_item_save_after`, `observer.sales_quote_merge_after` (all `webhook_type: before`)  
**Configuration store:** `@adobe/aio-commerce-lib-config` business configuration, **global scope**  
**Default maximum quantity:** `10`  
**Rejection message (exact):** `You have reached the maximum amount of items.`

---

## 1. Objective (as built)

One Adobe App Builder application that:

- Prevents any **single cart line** from exceeding a configurable maximum quantity (default `10`)
- Uses three synchronous ACCS webhooks (add item, item save, guest-cart merge)
- Optionally clamps an over-limit line back to the maximum through the Commerce Cart REST API ("compensating correction", CDA v5/v6)
- Exposes settings in two places that share the same values: App Management's generated configuration form and a custom Admin UI SDK v2 page under **Stores**
- Returns the exact message `You have reached the maximum amount of items.` on rejection
- Contains zero Adobe Commerce PHP / module code
- Is installed through App Management, which subscribes the webhooks automatically

---

## 2. Business Rules – Implementation Status

| ID | Rule | Status |
|----|------|--------|
| BR-01 | Maximum applies per individual cart line; several SKUs at the maximum are allowed | ✅ Implemented (test AT-05) |
| BR-02 | Validation uses the resulting quantity after the operation | ⏳ Uses `qty` from the payload; that it is the resulting quantity must be confirmed in the sandbox |
| BR-03 | `qty ≤ max` → allow, `qty > max` → reject | ✅ Implemented |
| BR-04 | Exact message `You have reached the maximum amount of items.` | ✅ Implemented (`MAX_QUANTITY_MESSAGE`, tested) |
| BR-05 | Maximum is configurable, positive integer, default `10` | ✅ Implemented |
| BR-06 | Enable / Disable; disabling keeps the saved maximum | ✅ Implemented |
| BR-07 | Zero PHP / modules | ✅ |
| BR-08 | Global scope only | ✅ |
| BR-09 | All product types | ⚠ Differs from v2: **every line, including configurable/bundle child lines, is validated** (CDA v2 "Parent + child lines") |
| BR-10 | Storefront + login merge in scope; Admin (`adminhtml`) always allowed | ⚠ Differs from v2: **no Admin-area bypass** — Admin order create is validated like storefront |
| BR-11 | Lowered maximum is not grandfathered | ✅ Implemented (test AT-06) |
| BR-12 | Only business-rule violations block; technical failures allow + log | ✅ for settings/payload errors (fail open). ⚠ Webhooks are `required: true`, so if the action is unreachable or times out, Commerce blocks the operation and shows the fallback message |

---

## 3. Architecture (as built)

```text
Customer adds / updates a cart item, or a guest cart is merged at login
        │
        ▼
ACCS webhooks (webhook_type: before, required: true, timeout 5000 / soft 1000 ms)
  ├─ observer.sales_quote_add_item        ─┐
  ├─ observer.sales_quote_item_save_after ─┴─► cart-validation/validate-cart-item
  └─ observer.sales_quote_merge_after      ───► cart-validation/revalidate-quote-merge
        │
        ├── 1. require-adobe-auth (Commerce calls with the workspace OAuth credential)
        ├── 2. validator.js parses the payload (quote_item | data_object | item | quote.items[])
        ├── 3. Read settings { enabled, maxQuantity, enableCompensatingCorrection } (lib-config, global)
        ├── 4. disabled / qty 0                     → success
        ├── 5. qty ≤ max                            → success
        ├── 6. qty > max (save_after / merge only)  → optional clamp via Cart REST (GET guard → PUT)
        ├── 7. qty > max                            → exception "You have reached the maximum amount of items."
        └── 8. Bad payload / settings error         → success + ERROR log (fail open)
```

Admin configuration path:

```text
Commerce Admin → Stores → Cart Item Validation   (Admin UI SDK v2 menu, aclProtected)
        → React page (web-src) with IMS token from useIms()
        → cart-validation-settings/get-cart-validation-settings (GET)
        → cart-validation-settings/save-cart-validation-settings (POST)
              ├─ server-side menu ACL check (getAdminUiPermissionClient)
              └─ @adobe/aio-commerce-lib-config  (global scope)
        → same values read by the webhook actions
(App Management's generated configuration form edits the same values.)
```

---

## 4. Project Structure (Current)

```text
commerce-cart-validate/
│
├── app.commerce.config.ts                 # Source of truth: metadata, businessConfig, adminUi.menu, webhooks
├── app.config.yaml                        # Extension points: extensibility/1, configuration/1, backend-ui/2
├── install.yaml                           # Extension points for App Management
├── package.json / package-lock.json       # Scripts: test, typecheck, test:sandbox, postinstall (SDK hooks)
├── tsconfig.json                          # Type checks app.commerce.config.ts + generated actions
├── webpack-config.cjs                     # Compiles the TypeScript config imported by actions
├── .gitignore
├── README.md
│
├── Docs/
│   ├── ACCS_App_Builder_Cart_Item_Max_Quantity_Implementation_Blueprint.md   # Original requirements
│   ├── CDA-blueprint-6.md / CDA-blueprint-7.md                               # Implemented blueprint (v7 = v6 + Marketplace note)
│   ├── appbuildercartValidation-plan.md                                     # Final v2 plan (not implemented)
│   ├── appbuildercartValidation-plan-updated.md                             # This document
│   ├── appbuildercartValidation-implementation.md                           # Build guide for the v2 plan
│   ├── cart-item-validation-runbook.md                                      # Deploy / operate runbook
│   ├── test-traceability-matrix.md                                          # Test ↔ scenario mapping
│   └── verified-contracts.md                                                # Sandbox verification record (pending)
│
├── src/
│   ├── commerce-extensibility-1/                         # App Management + webhooks
│   │   ├── ext.config.yaml                               # Generated app-management pkg + `cart-validation` pkg ($include)
│   │   ├── .generated/                                   # GENERATED – never edit (committed, like Adobe's starter kit)
│   │   │   ├── app.commerce.config.js
│   │   │   ├── app.commerce.manifest.json
│   │   │   └── actions/app-management/
│   │   │       ├── app-config.js                         # Tells Commerce what the app contains
│   │   │       ├── association.js                        # Stores the Commerce instance URL
│   │   │       └── installation.js                       # Subscribes webhooks / registers Admin UI on install
│   │   └── actions/
│   │       ├── lib/                                      # Shared helpers (also imported by backend-ui-2 actions)
│   │       │   ├── settings.js                           # Read settings (lib-config, global scope)
│   │       │   ├── is-over-limit.js                      # Rule + parsing + MAX_QUANTITY_MESSAGE
│   │       │   └── commerce-api-client.js                # Compensating clamp (Cart REST, GET guard, retries)
│   │       └── webhook/
│   │           ├── actions.config.yaml                   # Runtime definitions of the two webhook actions
│   │           ├── validate-cart-item/
│   │           │   ├── index.js                          # add_item + item_save_after handler
│   │           │   └── validator.js                      # Payload parsing (quote_item / data_object / item)
│   │           └── revalidate-quote-merge/
│   │               ├── index.js                          # merge_after handler
│   │               └── validator.js                      # Payload parsing (quote.items[])
│   │
│   ├── commerce-configuration-1/                         # Business configuration (App Management form)
│   │   ├── ext.config.yaml                               # GENERATED
│   │   └── .generated/                                   # GENERATED – never edit
│   │       ├── configuration-schema.json
│   │       └── actions/app-management/{config.js, scope-tree.js}
│   │
│   └── commerce-backend-ui-2/                            # Admin UI SDK v2
│       ├── ext.config.yaml                               # Generated hooks/web + `cart-validation-settings` pkg
│       ├── actions/
│       │   ├── lib/permissions.js                        # Server-side menu ACL check
│       │   ├── get-cart-validation-settings/index.js     # GET settings
│       │   └── save-cart-validation-settings/index.js    # Validate + POST settings
│       └── web-src/
│           ├── index.html / index.css / .babelrc / tsconfig.json
│           └── src/
│               ├── app.tsx                               # createExtensionApp (menu → MainPage)
│               ├── pages/main-page.tsx                   # Settings form
│               ├── components/welcome.tsx                # Unused scaffold component
│               ├── spectrum-css.d.ts
│               └── config.json                           # GENERATED by build (action URLs) – git-ignored
│
└── test/                                                 # Mirrors src/
    ├── commerce-extensibility-1/actions/
    │   ├── lib/{is-over-limit, commerce-api-client}.test.js
    │   └── webhook/
    │       ├── validate-cart-item/validate-cart-item.test.js
    │       └── revalidate-quote-merge/revalidate-quote-merge.test.js
    ├── commerce-backend-ui-2/actions/
    │   ├── lib/permissions.test.js
    │   ├── get-cart-validation-settings/get-cart-validation-settings.test.js
    │   └── save-cart-validation-settings/save-cart-validation-settings.test.js
    └── integration/prevention-guarantee.sandbox.test.js  # Live ACCS only (destructive, disposable carts)
```

**Local only (git-ignored):** `.env`, `.aio` (workspace binding and secrets), `node_modules/`, `dist/`, `.parcel-cache/`, `.aws.tmp.creds.json`.

### Ownership rules

| Path | Owner | Rule |
|------|-------|------|
| `src/**/.generated/`, `app-management` package, `src/commerce-configuration-1/ext.config.yaml` | `@adobe/aio-commerce-lib-app` | Regenerated on `npm install` / `aio app build`; never edit |
| `web-src/src/config.json` | `aio app build` | Workspace-specific URLs; git-ignored |
| `app.commerce.config.ts`, `actions/**`, `web-src/src/**`, `test/**` | Team | Hand-written |

### Import rule

The settings actions in `commerce-backend-ui-2` import `settings.js` and `is-over-limit.js` from `commerce-extensibility-1/actions/lib/`. This is valid because all extension points belong to **one App Builder app**; webpack bundles each action separately.

---

## 5. Discovery Status

| Item | Status | Evidence |
|------|--------|----------|
| The three webhook methods are supported on ACCS | ✅ | Listed under QUOTE in the NA1 sandbox Webhooks List |
| `observer.sales_quote_add_item` payload key | ✅ `data.quote_item` | Adobe docs, *Configure hook contents* |
| `observer.sales_quote_merge_after` payload | ✅ `data.quote.items[]`, `data.source.items[]` | Sandbox Webhooks List schema |
| `observer.sales_quote_item_save_after` payload key | ⏳ `data.data_object` expected (parser also accepts `data.item`) | Live capture |
| `qty` is the resulting quantity on an existing-SKU update | ⏳ | Live capture |
| Rejection on an `_after` observer with `webhook_type: before` rolls back the save | ⏳ | Sandbox test with correction off |
| Child-line dispatch (configurable / bundle) | ⏳ | Live capture |
| Login-merge customer experience | ⏳ | Sandbox test |
| ACL check sees the calling Admin user's role | ⏳ | Two-role sandbox test |

---

## 6. Configuration Design

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `enabled` | boolean | `true` | Disabling keeps `maxQuantity` |
| `maxQuantity` | text | `"10"` | Positive whole number; the custom page and save action reject `0`, negatives, decimals, unsafe integers. An invalid value saved in the native form makes the webhooks fail open |
| `enableCompensatingCorrection` | boolean | `true` | Off = keep rejecting, stop Cart REST writes |

- Stored with `@adobe/aio-commerce-lib-config`, `byCodeAndLevel("global", "global")`.
- Two settings surfaces share the same values (CDA v7: "build both now, decide later").
- Changes apply to new cart operations without redeploying.

---

## 7. App Configuration (`app.commerce.config.ts`)

| Webhook method | Hook name | Runtime action | Required | Timeout / soft |
|----------------|-----------|----------------|----------|----------------|
| `observer.sales_quote_add_item` | `validate_add_item` | `cart-validation/validate-cart-item` | true | 5000 / 1000 ms |
| `observer.sales_quote_item_save_after` | `validate_saved_item` | `cart-validation/validate-cart-item` | true | 5000 / 1000 ms |
| `observer.sales_quote_merge_after` | `validate_merged_quote` | `cart-validation/revalidate-quote-merge` | true | 5000 / 1000 ms |

Common to all three: `webhook_type: before`, `category: validation`, `env: ['saas']`, `batch_name: cart_item_validation`, `requireAdobeAuth: true`, `fallback_error_message: "Unable to update the cart right now. Please try again."`. No `fields` filter (full payload) until payload paths are verified.

Admin menu: `id: cart_item_validation_settings`, label *Cart Item Validation*, parent `MENU_STORES`, `aclProtected: true`.

---

## 8. Runtime Action Behaviour

### `validate-cart-item` (add item, item save)

1. `validator.js` reads the item from `data.quote_item` (add) or `data.data_object` / `data.item` (save).
2. No item → **allow**, ERROR `invalid_payload`.
3. Read settings. Disabled or `qty = 0` → **allow** (`bypass`).
4. Non-numeric `qty` → **allow**, ERROR `invalid_quantity`.
5. `qty ≤ max` → **allow**.
6. `qty > max` on item save with correction on → clamp the line to `max` via Cart REST (read-before-write guard, 2 attempts, `CRITICAL` log on failure).
7. `qty > max` → **reject** with the exact message.
8. Settings error → **allow**, ERROR `fail_open`.

### `revalidate-quote-merge` (guest → customer merge)

1. `validator.js` reads `data.quote.items[]`.
2. Disabled → **allow**. No items array → **allow**, ERROR `invalid_payload`.
3. For each line: skip `qty = 0`; log and skip invalid quantities; clamp over-limit lines if correction is on.
4. Any over-limit line → **reject** with the exact message; otherwise **allow**.
5. Settings error → **allow**, ERROR `fail_open`.

---

## 9. Admin UI SDK

- Menu entry **Stores → Cart Item Validation**, ACL-protected (`aclProtected: true`).
- Both settings actions check the menu ACL server-side (`permissions.js`), so a hidden menu is not the only protection.
- `get-cart-validation-settings`: GET only; returns `{ enabled, maxQuantity, enableCompensatingCorrection }`.
- `save-cart-validation-settings`: POST only; JSON body; rejects unknown keys and invalid values; nothing is saved on error (fail closed).

---

## 10. Error Handling Policy

| Situation | Behaviour |
|-----------|-----------|
| Settings store unavailable / invalid value | Allow, ERROR `fail_open` |
| Malformed payload / invalid quantity | Allow, ERROR `invalid_payload` / `invalid_quantity` |
| Compensating clamp fails | Customer still rejected; `CRITICAL` logged; manual recovery |
| Webhook action unreachable or times out | `required: true` → Commerce blocks and shows the fallback message |
| Admin settings action fails | Fail closed: nothing saved, error shown |

The rejection message is never used for technical errors.

---

## 11. Tests

```bash
npm test             # 17 node:test tests (unit + action), all dependencies mocked
npm run typecheck    # app config + Admin UI web source
npm run test:sandbox # live ACCS only; needs ACCS_* environment variables (see verified-contracts.md)
```

Covered: allow/reject boundaries, exact message, per-line evaluation (AT-05), lowered maximum (AT-06), disabled, `qty = 0`, malformed payload and quantity (fail open), settings failure (fail open), documented payload keys (`quote_item`, `data_object`), compensating clamp (GET guard, stale read, 404, retries), merge validation, settings GET/POST validation and ACL denial.

---

## 12. Deployment & Installation Status

| Step | Status |
|------|--------|
| Developer Console project *CommerceCartValidate* → workspace *Stage* (ACCS-REST-API, I/O Management API, OAuth Server-to-Server) | ✅ |
| Project bound (`aio app use`) — namespace `3117813-commercecartvalidate-stage` | ✅ |
| `aio app build` (actions + Admin UI) | ✅ |
| `aio app deploy` (all actions + web assets) | ✅ |
| App Management: associate | ⚠ Shown as ASSOCIATED, but the `association` action was never invoked |
| App Management: install | ❌ `installation` returns 409 `not-associated` (Extension Manager shows 500) |

**Fix:** in App Management, **disassociate → associate (workspace Stage) → install**. Then confirm in **System → Webhooks → Webhooks Subscriptions** that the three hooks are active, and that **Stores → Cart Item Validation** loads.

---

## 13. Change Log (this session)

| Area | Change |
|------|--------|
| Repository | Added `.gitignore` and `README.md`; `.generated/` is committed (same as Adobe's starter kit) |
| Structure | Tests moved out of `src/**/__tests__/` into root `test/`, mirroring `src/` |
| Structure | Webhook actions moved to `actions/webhook/<name>/`; their Runtime definitions moved to `actions/webhook/actions.config.yaml` (`$include`) |
| Structure | Payload parsing split into `validator.js` per webhook action |
| Structure | `shared/` renamed to `lib/` in both extensions (a move to `src/lib` with a `#lib` alias was tried and reverted) |
| Webhook config | Added `timeout` 5000, `soft_timeout` 1000, `fallback_error_message`, `requireAdobeAuth: true` |
| Behaviour | Rejection message is now exactly `You have reached the maximum amount of items.` |
| Behaviour | Malformed payload / invalid quantity now fail open with an ERROR log (previously rejected the cart) |
| Behaviour | Add-item payload read from `data.quote_item` (Adobe-documented key); save also accepts `data.data_object` |
| Tests | Added AT-05 (no aggregation), AT-06 (lowered maximum), documented payload keys; 17 tests total |
| Tooling | Biome linter added, then removed (optional, out of scope) |
| Environment | Workspace bound, built and deployed to *CommerceCartValidate → Stage* |

---

## 14. Differences from the Final v2 Plan

| Topic | Final v2 plan | As built (CDA v7) |
|-------|---------------|-------------------|
| Webhook | `observer.sales_quote_item_save_before` only | `sales_quote_add_item`, `sales_quote_item_save_after`, `sales_quote_merge_after` |
| `required` | `false` (fail open on outage) | `true` (outage blocks, fallback message shown) |
| Compensating correction | Dropped (D-13) | Present, toggle `enableCompensatingCorrection` |
| Action names | `cart-item-max-quantity`, `get-config`, `save-config` | `validate-cart-item`, `revalidate-quote-merge`, `get-/save-cart-validation-settings` |
| Child lines | Skipped (D-04) | Validated |
| Admin area | Always allowed | Validated |
| Settings cache | 60 s in-memory | None (read per call) |
| Tests / lint | Jest, ESLint | `node:test`, no linter |
| Code layout | `domain/`, `adapters/`, `config/`, `utils/` | `lib/` + `validator.js` per action (starter-kit style) |

---

## 15. Open Items / Next Steps

| # | Item | Owner |
|---|------|-------|
| 1 | Re-associate and install the app in App Management (section 12) | Developer |
| 2 | Run sandbox tests (add, update, merge, Admin order, settings page, two Admin roles); fill in [verified-contracts.md](verified-contracts.md) | Developer |
| 3 | Decide `required: true` vs `false` (outage behaviour) | Technical review |
| 4 | Rotate the OAuth client secret and Runtime auth key that were shared in chat; re-run `aio app use` + `aio app deploy` | Developer |
| 5 | Optional clean-up: unused `welcome.tsx`, superseded v2 docs, `appbuildercartValidation-plan copy.md` | Team decision |
| 6 | First commit and push to `origin` | Developer (after approval) |
| 7 | Before Marketplace listing: decide whether to keep the custom settings page (CDA v7 recommendation) | Product |

---

## 16. Definition of Done

- [x] Structure follows `@adobe/aio-commerce-lib-app` (extensibility/1, configuration/1, backend-ui/2)
- [x] Settings shared by Admin UI page, App Management form and webhooks
- [x] `require-adobe-auth` on all actions; menu ACL-protected and checked server-side
- [x] Per-line validation, no aggregation; ≤ max allowed; > max rejected with the exact message
- [x] Enable / Disable works and keeps the maximum; default 10
- [x] Technical failures in the actions fail open and are logged
- [x] Automated tests pass (17) and type checks pass
- [x] Build and deploy to the Stage workspace succeed
- [ ] App installed through App Management; webhook subscriptions active
- [ ] Admin UI page verified in the sandbox (load, save, ACL)
- [ ] Sandbox functional tests executed with evidence; `verified-contracts.md` completed
- [ ] `required` policy confirmed in technical review
- [ ] README final review, pull request, reviewer demo, handoff
