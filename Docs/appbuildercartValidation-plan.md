# ACCS App Builder – Cart Item Maximum Quantity Validation
## Marketplace-Ready Implementation Contract (Final)

**Version / date:** Final v2 — 2026-10-29  
**Status:** Approved for implementation. Development may start on sections 6–12 (local, mocked); integration code that depends on payload paths waits for discovery (section 5).  
**Supersedes:** CDA Technical Blueprint v1–v7 where they conflict (see D-04, D-13, D-15)  
**Project name:** `AppBuilderCartValidation`  
**Platform:** Adobe Commerce as a Cloud Service (ACCS) + App Builder + App Management + Admin UI SDK v2 (`commerce/backend-ui/2`)  
**Webhook:** `observer.sales_quote_item_save_before` (type `before`) — present in the sandbox supported list (verified 2026-10-29); payload and behaviour still subject to discovery (section 5)  
**Configuration store:** `@adobe/aio-commerce-lib-config` business configuration, **global scope**  
**Target:** Deployment-ready, Marketplace-submittable application  
**Default maximum quantity:** `10`  
**Rejection message (exact):** `You have reached the maximum amount of items.`

---

## 1. Objective

Deliver one complete, Marketplace-ready Adobe App Builder application that:

- Prevents any **single cart line item** from exceeding a configurable maximum quantity
- Uses a synchronous ACCS webhook (`observer.sales_quote_item_save_before`)
- Provides administrator configuration via an Admin UI SDK v2 (`commerce/backend-ui/2`) menu page
- Defaults maximum quantity to `10`
- Displays the exact message `You have reached the maximum amount of items.` when the limit is exceeded
- Correctly handles existing SKUs (uses resulting quantity)
- Does **not** aggregate quantities across different SKUs
- Contains zero Adobe Commerce PHP / module code
- Follows the official `@adobe/aio-commerce-lib-app` structure (`app.commerce.config.ts`, `src/commerce-extensibility-1`, `src/commerce-backend-ui-2`, `src/commerce-configuration-1`)
- Is installable via App Management
- Includes automated tests, sandbox evidence, README, and is ready for a single technical-review pull request

---

## 2. Confirmed Business Rules (Authoritative)

| ID     | Rule |
|--------|------|
| BR-01  | Maximum applies **per individual cart item** (SKU line). Multiple SKUs each at the maximum are allowed. |
| BR-02  | When a customer adds or updates an SKU already present in the cart, validation must use the **resulting quantity** of that cart item after the operation. |
| BR-03  | `resultingQuantity < max` → Allow<br>`resultingQuantity = max` → Allow<br>`resultingQuantity > max` → Reject |
| BR-04  | Rejection message must be **exactly**: `You have reached the maximum amount of items.` |
| BR-05  | Maximum quantity is administrator-configurable. Must be a positive integer. Default = `10`. |
| BR-06  | Feature can be Enabled / Disabled from Admin. When disabled → always allow. Disabling must preserve the saved maximum value. |
| BR-07  | Zero PHP, zero Commerce modules, zero `system.xml`, zero plugins, zero observers in Commerce. |
| BR-08  | Configuration scope is **global** only (no website / store-view overrides). |
| BR-09  | Applies to **all product types**. Validation runs on the customer-visible cart line (simple, virtual, downloadable, gift card, configurable parent, bundle parent, each grouped-product line). Configurable / bundle **child** lines are not validated separately — same as native Commerce, where quantity validation is driven by the parent line and child lines are skipped. |
| BR-10  | In scope: storefront (EDS / GraphQL, REST) and guest-to-customer cart merge at login. Out of scope: Admin-created / edited orders (`adminhtml`) → always allow. |
| BR-11  | Lowering the maximum does **not** grandfather existing lines. Any save of a line whose resulting quantity exceeds the current maximum is rejected; the customer must reduce it to ≤ maximum. |
| BR-12  | Only a business-rule violation blocks the cart. Technical failures allow the operation and are logged (section 11). |

---

## 3. Target Architecture

```text
Customer adds / updates a cart item, or a guest cart is merged at login
        │  (storefront: EDS / GraphQL, REST)
        ▼
ACCS  observer.sales_quote_item_save_before  (type: before, required: false)
        │  synchronous webhook (category: validation)
        ▼
App Builder Runtime action  cart-validation/cart-item-max-quantity
        │
        ├── 1. Authenticate request (require-adobe-auth)
        ├── 2. Load config { enabled, maxQuantity }  (lib-config, global scope, 60 s in-memory cache)
        ├── 3. enabled === false                       → success
        ├── 4. Parse SKU, resulting qty, child-line flag, area code (verified mapping)
        ├── 5. Area adminhtml                          → success (out of scope)
        ├── 6. Child line (configurable / bundle child) → success
        ├── 7. Pure domain validator
        ├── 8. success  |  exception "You have reached the maximum amount of items."
        └── 9. Structured safe logging; any technical failure → success + ERROR log
```

Admin configuration path:

```text
Commerce Admin → Stores → Cart Item Max Quantity   (Admin UI SDK v2 menu, ACL-protected)
        → React page in iframe (web-src), IMS token from useIms()
        → get-config / save-config Runtime actions (require-adobe-auth)
        → @adobe/aio-commerce-lib-config  getConfiguration / setConfiguration  (global scope)
        → same values read by the webhook action
(App Management's built-in configuration form shows and edits the same values.)
```

---

## 4. Mandatory Project Structure (Latest Marketplace Standard)

```text
AppBuilderCartValidation/
│
├── app.commerce.config.ts                 # Source of truth: metadata, businessConfig, webhooks, adminUi
├── app.config.yaml                        # Generated / updated by `npx @adobe/aio-commerce-lib-app init`
├── install.yaml                           # Generated / updated by init
├── package.json
├── .env.example
├── .gitignore
├── README.md
│
├── src/
│   │
│   ├── shared/                                          # Used by both extensions (bundled by webpack)
│   │   ├── configSchema.js                              # businessConfig schema, DEFAULTS, exact message
│   │   ├── normalizeConfig.js                           # raw values → { enabled, maxQuantity } + validation
│   │   └── configStore.js                               # lib-config read / write, global scope only
│   │
│   ├── commerce-configuration-1/                        # Generated by build (business config) – read-only
│   │
│   ├── commerce-extensibility-1/                        # Runtime + Webhooks
│   │   ├── ext.config.yaml                              # `app-management` pkg generated; add `cart-validation` pkg
│   │   ├── .generated/                                  # Generated – read-only
│   │   └── actions/
│   │       └── webhook/
│   │           └── cart-item-max-quantity/
│   │               ├── index.js                         # Main webhook entry point
│   │               ├── domain/
│   │               │   └── validateItemQuantity.js      # Pure business rule
│   │               ├── config/
│   │               │   └── getCartValidationConfig.js   # 60 s cache + fail-open wrapper over shared/
│   │               ├── adapters/
│   │               │   ├── parseWebhookPayload.js
│   │               │   └── buildWebhookResponse.js
│   │               └── utils/
│   │                   └── logger.js
│   │
│   └── commerce-backend-ui-2/                           # Admin UI SDK v2 (generated by init from `adminUi`)
│       ├── ext.config.yaml                              # hooks/operations/web managed by build; add `cart-validation-admin` pkg
│       ├── actions/
│       │   ├── get-config/
│       │   │   └── index.js                             # Returns { enabled, maxQuantity }
│       │   └── save-config/
│       │       └── index.js                             # Validates + persists via shared/configStore
│       └── web-src/
│           ├── index.html
│           └── src/
│               ├── app.jsx                              # createExtensionApp (generated)
│               ├── pages/
│               │   └── main-page.jsx                    # Menu index route → renders the form
│               ├── components/
│               │   └── CartValidationConfigForm.jsx     # Enable + Max Quantity form (React Spectrum S2)
│               └── hooks/
│                   └── use-config.js                    # Action URLs from build-generated config.json
│
├── test/
│   ├── unit/
│   │   ├── validateItemQuantity.test.js
│   │   ├── normalizeConfig.test.js
│   │   ├── getCartValidationConfig.test.js
│   │   ├── parseWebhookPayload.test.js
│   │   └── buildWebhookResponse.test.js
│   ├── action/
│   │   ├── cart-item-max-quantity.test.js
│   │   ├── get-config.test.js
│   │   └── save-config.test.js
│   └── web/
│       └── CartValidationConfigForm.test.jsx
│
└── docs/
    ├── verified-contracts.md
    ├── sandbox-test-evidence.md
    └── architecture.md
```

**Do not** use a root-level `actions/` folder.  
**Do not** use `commerce/backend-ui/1`, a `registration` action, or `src/commerce-backend-ui-1` (Admin UI SDK v1 pattern).  
**Do not** hand-edit generated files (`.generated/`, `commerce-configuration-1/`, the `app-management` package, `hooks` / `operations` / `web` in the backend-ui `ext.config.yaml`).  
**Do not** name a user package `app-management` (reserved).  
Webhook handlers live in `src/commerce-extensibility-1/`; Admin UI actions (`get-config`, `save-config`) live in `src/commerce-backend-ui-2/`.  
Language: `app.commerce.config.ts` (official default) with Runtime actions in JavaScript (CommonJS). Node.js 22+. Tests: Jest. Lint: ESLint.

---

## 5. Mandatory Discovery Phase (Before Integration Code)

Create and maintain `docs/verified-contracts.md` with the following verified facts:

1. ✅ **Verified 2026-10-29 (NA1 sandbox):** `observer.sales_quote_item_save_before` is listed under **QUOTE** in Admin → System → Webhooks → Webhooks List. Same group also offers `observer.sales_quote_add_item`, `observer.sales_quote_item_set_product`, `observer.sales_quote_merge_after`, `observer.sales_quote_save_before`, `observer.sales_quote_item_save_after`.
2. Full sample payload for a **new item** add (simple product). Schema from Webhooks List (2026-10-29): `data.data_object.{qty_options, product_type, real_product_type, item_id, sku, qty, name, price, quote_id, product_option}` — live capture still required.
3. Full sample payload for an **existing SKU** quantity update.
4. Exact field path that contains the **resulting quantity** after the operation, and its data type. Schema: `data.data_object.qty` (float). Live capture must confirm it holds the **resulting** quantity on an existing-SKU update.
5. Whether the previous quantity of an existing line appears in the payload (informational only — BR-11, no grandfathering).
6. Confirmed allow (`{ "op": "success" }`) and reject (`{ "op": "exception", "message": … }`) shapes; whether a `type` is needed for the message to reach the customer on EDS / GraphQL (`user_errors` vs `errors`) and REST.
7. Sample payloads for configurable, bundle, grouped, virtual, downloadable and gift card products; how a **child line** is identified at save-before time (e.g. `parent_item_id`), and whether a webhook `rules` entry can exclude child lines. ⚠ The schema has **no** `parent_item_id`; confirm with live bundle / configurable captures (both **new** and **existing** child lines) whether `parent_item_id` is populated at save-before, and whether `qty_options` is non-empty on parent lines. If children cannot be identified, apply the D-11 fallback.
8. Area code delivered via the context field `context_application_state.get_area_code` (values for storefront GraphQL, REST, Admin).
9. **Login merge:** payload when a guest cart is merged (session login and GraphQL `mergeCarts`); what the customer sees and what both carts contain after a rejection. Backup webhook `observer.sales_quote_merge_after` exposes `data.quote.items[]` (merged cart) and `data.source.items[]` (guest cart) with `sku`, `qty`, `product_type`.
10. **Re-saves:** which operations re-save untouched lines (adding another SKU, totals recollect, checkout, place order) — determines FT-08c / FT-08d.
11. `require-adobe-auth: true` works for the webhook action when installed via App Management.
12. Our own actions can `getConfiguration` / `setConfiguration` at `byCodeAndLevel("global", "global")` (record the returned shape), and App Management's configuration form shows the same values.
13. Observed configuration propagation delay (Admin save → enforced).
14. Observed cold-start and warm latency; confirm `timeout: 3000` / `soft_timeout: 1000`.
15. `aio app build` accepts every key used in `app.commerce.config.ts` (`businessConfig`, `required`, `soft_timeout`, `fields` with `source`, `rules`, `adminUi.menu.aclProtected`).
16. Whether Admin UI SDK v2 offers a server-side ACL check usable in `save-config` (custom ACL docs); if yes, enforce it.
17. Behaviour when native `max_sale_qty` (Maximum Qty Allowed in Shopping Cart) is lower than the app maximum.
18. **Per-install isolation (Marketplace):** each merchant installation runs in its own Runtime namespace with its own lib-config storage, so the global setting of one merchant is never visible to another.
19. `require-adobe-auth` on `get-config` / `save-config` rejects IMS tokens from an org other than the installing org; if not, add an explicit org check.

**Agent rule:** If documentation and real sandbox behaviour conflict, stop the integration path, document the discrepancy, and implement against the verified Adobe contract. Never invent payload fields or response schemas.

---

## 6. Configuration Design

### Canonical internal model

```json
{
  "enabled": true,
  "maxQuantity": 10
}
```

### Persistence (decided)

- **Store:** `@adobe/aio-commerce-lib-config` (App Management business configuration). It persists durably in `@adobe/aio-lib-files` and caches in `@adobe/aio-lib-state`, so values do **not** expire. Raw App Builder State alone has a TTL and must not be the store.
- **Scope:** **global only** — read / write with `byCodeAndLevel("global", "global")`. The Runtime always reads global.
- **Schema** — defined once in `src/shared/configSchema.js`, referenced by `businessConfig.schema` in `app.commerce.config.ts` and passed to `initialize({ schema })` in every action:

  | Field | Type | Default | Notes |
  |---|---|---|---|
  | `enabled` | `boolean` | `true` | |
  | `max_quantity` | `text` | `"10"` | lib-config has no number type; positive-integer validation is done by `normalizeConfig` (save action + Runtime) |

- **Editors:** the Admin UI SDK page (primary, section 10) writes through `save-config`. App Management also renders a form for the same schema; both write the same global values.
- Environment variables only for technical settings (e.g. `LOG_LEVEL`) — **never** for `enabled` or `maxQuantity`.
- **Cache:** the webhook action keeps the normalized config in module memory for **60 s** per warm container. An Admin change is enforced within ≤ 60 s plus lib-config cache time (record the observed value — discovery #13).

### Defaults

- `maxQuantity = 10`
- `enabled = true` (change only with explicit architect / product-owner approval)

### Validation rules (Admin + Runtime)

- `maxQuantity` must be a positive integer (`> 0`).
- Reject zero, negative, decimal, empty, and non-numeric values at configuration time.
- Disabling the feature must **preserve** the previously saved maximum value.
- Re-enabling must restore enforcement using the previously saved maximum.
- Never saved → defaults. Stored `max_quantity` invalid → `10` + WARN log. Store unreachable → validation skipped (allow) + ERROR log (section 11).

---

## 7. App Configuration (`app.commerce.config.ts`)

All app domains are declared here; `init` / `aio app build` generate the extension wiring from it. Every key must pass `aio app build` validation (discovery #15).

```ts
import { defineConfig } from "@adobe/aio-commerce-lib-app/config";
import { MENU_STORES } from "@adobe/aio-commerce-sdk/admin-ui/menu";
import { configSchema } from "./src/shared/configSchema.js";

export default defineConfig({
  metadata: {
    id: "app-builder-cart-validation",           // letters, digits, hyphens; cannot change after release
    displayName: "Cart Item Max Quantity",       // ≤ 50 chars
    description: "Prevents a single cart line from exceeding an administrator-configured maximum quantity.",
    version: "1.0.0",                            // Major.Minor.Patch only
  },
  businessConfig: {
    schema: configSchema,                        // enabled (boolean, true), max_quantity (text, "10")
  },
  webhooks: [
    {
      label: "Cart Item Maximum Quantity Validation",
      description: "Prevents a single cart line from exceeding the configured maximum quantity.",
      category: "validation",
      runtimeAction: "cart-validation/cart-item-max-quantity",
      webhook: {
        webhook_method: "observer.sales_quote_item_save_before",
        webhook_type: "before",
        batch_name: "cart_item_max_qty",
        hook_name: "validate_max_qty",
        method: "POST",
        required: false,         // fail-open on technical failure (section 11)
        timeout: 3000,           // starting value – confirm in discovery #14
        soft_timeout: 1000,
        fields: [
          { name: "data.data_object.sku" },
          { name: "data.data_object.qty" },
          { name: "data.data_object.item_id" },
          { name: "data.data_object.quote_id" },
          { name: "data.data_object.product_type" },
          { name: "app_area_code", source: "context_application_state.get_area_code" },
        ],
        // rules: exclude child lines only if discovery #7 finds a usable field
      },
    },
  ],
  adminUi: {
    menu: {
      id: "cart_item_max_qty",
      label: "Cart Item Max Quantity",
      description: "Configure the maximum quantity allowed per cart line.",
      parentMenu: MENU_STORES,
      pageTitle: "Cart Item Maximum Quantity",
      aclProtected: true,
    },
  },
});
```

- Authentication is set on the actions in `ext.config.yaml` (`require-adobe-auth: true`, `final: true`), not in this file.
- If the config loader cannot import `src/shared/configSchema.js`, inline the schema and add a unit test asserting both copies are identical.
- After changing `webhooks` or `adminUi`, re-run `npx @adobe/aio-commerce-lib-app init`, then `aio app build`.

---

## 8. Runtime Action Behaviour (Strict Sequence)

1. Receive webhook request; the Runtime gateway enforces `require-adobe-auth`.
2. Load configuration via `getCartValidationConfig` (60 s cache → `shared/configStore` → `normalizeConfig`). Store error → allow + `CONFIG_UNAVAILABLE` log.
3. If `enabled === false` → success.
4. Parse SKU, resulting quantity, child-line flag and area code using the verified mapping. `qty` may be a string (`"10.0000"`) → `Number()`. Missing SKU, missing / non-finite / negative quantity → allow + `MALFORMED_PAYLOAD` log. `qty = 0` (removal) is valid and allowed by the validator.
5. Area `adminhtml` → success (BR-10).
6. Child line → success (BR-09).
7. Invoke the pure domain validator (decimals compared as-is: `10.5 > 10` → reject).
8. Valid → `{ "op": "success" }`.
9. Invalid → `{ "op": "exception", "message": "You have reached the maximum amount of items." }` (add `type` only if discovery #6 requires it). Build responses with `ok` / `successOperation` / `exceptionOperation` from `@adobe/aio-commerce-lib-webhooks/responses`.
10. Unexpected exception → success + `UNEXPECTED_ERROR` log (section 11).
11. One structured log line per request: activation ID, outcome, reason, enabled, max, SKU, resulting quantity.

Keep network calls on the synchronous path to the absolute minimum.

---

## 9. Pure Domain Function

```js
// domain/validateItemQuantity.js
/**
 * @param {{ enabled: boolean, maxQuantity: number, resultingQuantity: number }} input
 * @returns {{ valid: true } | { valid: false, message: string }}
 */
function validateItemQuantity({ enabled, maxQuantity, resultingQuantity }) {
  if (!enabled) {
    return { valid: true };
  }
  if (resultingQuantity <= maxQuantity) {
    return { valid: true };
  }
  return {
    valid: false,
    message: "You have reached the maximum amount of items."
  };
}

module.exports = { validateItemQuantity };
```

This function must remain free of Adobe-specific code so it can be unit-tested in isolation.

---

## 10. Admin UI SDK Requirements

- Extension point: **`commerce/backend-ui/2`**, declared via `adminUi.menu` in `app.commerce.config.ts` (no registration action).
- Menu: `id: "cart_item_max_qty"`, label **Cart Item Max Quantity**, `parentMenu: MENU_STORES`, `aclProtected: true` (granted per role in System → Permissions → User Roles).
- Page: the menu opens the index route (`web-src/src/pages/main-page.jsx`) inside the iframe app created by `createExtensionApp` (`@adobe/aio-commerce-lib-admin-ui/web`). UI uses the scaffolded React Spectrum S2 versions (do not change them).
- Fields:
  - **Enable Maximum Cart Item Quantity** — switch (Yes / No)
  - **Maximum Quantity Per Item** — positive whole number, default 10
- On load: `get-config` → display persisted values (defaults if never saved).
- On save:
  - Client-side validation: required, whole number, `> 0` (reject `0`, `-1`, `1.5`, `abc`, empty).
  - `POST save-config` with `{ enabled, maxQuantity }`; the server re-validates identically and persists both values (global scope).
  - Switching Enable off keeps the current maximum and sends it unchanged (BR-06).
  - Show success, or the server's validation / error message.
- Backend actions (`src/commerce-backend-ui-2/actions/`, package `cart-validation-admin`): `web: "yes"`, `require-adobe-auth: true`, `final: true`. The page calls them with `Authorization: Bearer <imsToken>` and `x-gw-ims-org-id: <imsOrgId>` from `useIms()`; URLs come from the build-generated `web-src/src/config.json`.
- `save-config` accepts only `POST` with `enabled` (boolean) and `maxQuantity` (positive integer); otherwise `400` / `405`.
- Both actions accept requests only from the installing IMS org (discovery #19).
- No credentials or secrets in the UI or in action responses.

---

## 11. Error Handling & Observability Policy

**Policy (standard): only a confirmed business-rule violation blocks the cart. Every technical failure lets the cart operation continue (fail-open) and is logged as an error.**  
Rationale: the validation service being slow or down must never stop customers from shopping; the worst case is one line temporarily above the maximum.

| Situation | Behaviour |
|---|---|
| Enabled and `resultingQuantity > maxQuantity` | **Reject** — `You have reached the maximum amount of items.` |
| Feature disabled | Allow |
| Admin area (`adminhtml`) | Allow (out of scope, BR-10) |
| Child line (configurable / bundle child) | Allow (parent line is validated, BR-09) |
| Config never saved | Defaults (`enabled=true`, `max=10`) and validate |
| Stored `max_quantity` invalid | Default `10` + WARN log, validate |
| Config store unreachable / error | **Allow** + ERROR `CONFIG_UNAVAILABLE` |
| Malformed payload / missing SKU or quantity | **Allow** + ERROR `MALFORMED_PAYLOAD` |
| Unexpected runtime exception | **Allow** + ERROR `UNEXPECTED_ERROR` |
| Runtime timeout / unreachable / auth failure | Commerce continues because `required: false` (visible in ACCS webhook logs) |

- The action always returns HTTP `200` with a valid operation body.
- The required rejection message is used **only** for real limit violations, never for technical failures.
- Reserved generic message (only if reviewers later switch to `required: true`, as `fallbackErrorMessage`): `We could not update your cart right now. Please try again.`
- ERROR categories above must be visible in Runtime logs / log forwarding so silent fail-open is detected.

**Logging (safe):**
- Correlation / request identifier when available
- Action outcome
- Whether validation was enabled
- Effective maximum
- Affected item identifier (SKU) where safe
- Resulting quantity
- Validation result
- Categorised errors

**Never log:** credentials, tokens, secrets, full sensitive payloads, unnecessary customer PII.

---

## 12. Automated Test Plan

### Core acceptance tests (must pass)

| ID    | Scenario                                      | Expected |
|-------|-----------------------------------------------|----------|
| AT-01 | enabled=true, max=10, resultingQty=9          | Allow    |
| AT-02 | enabled=true, max=10, resultingQty=10         | Allow    |
| AT-03 | enabled=true, max=10, resultingQty=11         | Reject + exact message |
| AT-04 | Existing SKU → resultingQty=11                | Reject (no double-counting) |
| AT-05 | SKU-A=10 + SKU-B=10                           | Allow (no aggregation) |
| AT-06 | Admin changes max to 5, resultingQty=6        | Reject   |
| AT-07 | enabled=false, resultingQty=20                | Allow    |
| AT-08 | Max lowered 10→5, existing line 8 updated to 7 | Reject (no grandfathering) |
| AT-09 | Max lowered 10→5, existing line 8 updated to 5 | Allow    |
| AT-10 | Login-merge payload, merged resultingQty=12, max=10 | Reject + exact message |
| AT-11 | Login-merge payload, merged resultingQty=9, max=10 | Allow |
| AT-12 | Child line (configurable / bundle child), qty 50 | Allow (skipped) |
| AT-13 | Area `adminhtml`, resultingQty=20             | Allow    |
| AT-14 | qty `"10.0000"` (string), max 10              | Allow    |
| AT-15 | qty `10.5`, max 10                            | Reject   |
| AT-16 | qty `0` (removal), any max                    | Allow, no error log |

### Additional required tests

- Missing max → resolves to default 10
- Invalid stored max (0, negative, decimal, non-numeric) → default 10 + warning
- Missing enablement configuration → default `true`
- Config store error → allow + `CONFIG_UNAVAILABLE` log
- Malformed payload / missing SKU or quantity → allow + `MALFORMED_PAYLOAD` log
- Unexpected runtime error → allow + `UNEXPECTED_ERROR` log
- Allow response mapping (`{ op: "success" }`)
- Reject response mapping (exact message)
- Rejection message never returned on technical-failure paths
- Config cache: second call within 60 s does not hit the store; after expiry it does
- `save-config`: valid save; rejects 0 / negative / decimal / non-numeric / empty / missing or wrong-typed fields / non-POST; disabling preserves max
- `get-config`: defaults when never saved; persisted values otherwise
- Admin form: client validation messages, save success / error states, disable keeps max

Mock all external dependencies in local tests.

---

## 13. Sandbox Functional Test Matrix

Document every result in `docs/sandbox-test-evidence.md`.

| ID     | Scenario                          | Configuration              | Expected |
|--------|-----------------------------------|----------------------------|----------|
| FT-01  | Below limit                       | Enabled, max 10, qty 9     | Allow    |
| FT-02  | Exactly at limit                  | Enabled, max 10, qty 10    | Allow    |
| FT-03  | Above limit                       | Enabled, max 10, qty 11    | Reject + exact message |
| FT-04  | Existing SKU update               | Existing line → qty > 10   | Reject   |
| FT-05  | Multiple SKUs                     | SKU-A 10 + SKU-B 10        | Allow    |
| FT-06  | Admin changes maximum             | max 10 → 5, qty 6          | Reject   |
| FT-07  | Feature disabled                  | Disabled, qty > max        | Allow    |
| FT-08a | Lowered max, line still above     | Line qty 8, max 10 → 5, update to 7 | Reject |
| FT-08b | Lowered max, reduce to max        | Line qty 8, max 5, update to 5 | Allow |
| FT-08c | Lowered max, add another SKU      | Line A qty 8, max 5, add SKU-B qty 1 | Record actual (discovery #10) |
| FT-08d | Lowered max, checkout / place order | Line qty 8, max 5 | Record actual; customer must reduce to ≤ 5 |
| FT-09  | Login merge above max             | Guest SKU-A 6 + customer SKU-A 6, max 10 | Merge rejected + exact message; record cart state |
| FT-10  | Login merge within max            | Guest SKU-A 4 + customer SKU-A 5, max 10 | Allow (qty 9) |
| FT-11  | Configurable product              | qty 11, max 10             | Reject   |
| FT-12  | Bundle product                    | Bundle qty 11 → Reject; bundle qty 1 with option qty 12 → Allow (Reject if the D-11 fallback applies) | As stated |
| FT-13  | Grouped product                   | One child qty 11 → Reject; each child 10 → Allow | As stated |
| FT-14  | Virtual / downloadable / gift card | qty 11, max 10            | Reject   |
| FT-15  | Admin order create                | qty 20, max 10             | Allow (out of scope) |
| FT-16  | Validation service unavailable    | Action timing out / unreachable | Cart operations succeed; error visible in logs |

Run FT-01 → FT-07 on the EDS storefront (GraphQL) **and** via REST; record the channel per row.

**Admin UI tests (UI-FT-01 … UI-FT-10):**
- UI-FT-01 Menu entry visible under Stores for permitted roles; page loads
- UI-FT-02 Never-saved state shows Enabled = Yes, Maximum = 10
- UI-FT-03 Save + reload persistence
- UI-FT-04 Runtime respects changed maximum (within the documented cache window)
- UI-FT-05 Disable bypasses validation
- UI-FT-06 Re-enable restores previous maximum
- UI-FT-07 Invalid inputs (`0`, `-1`, `1.5`, `abc`, empty) rejected with clear feedback; nothing persisted
- UI-FT-08 Saved values survive page reopen / new Admin session
- UI-FT-09 Role without the menu ACL resource cannot see or open the page
- UI-FT-10 App Management configuration form shows the same values as the Admin UI page

For each test capture: date, environment, preconditions, configuration values, steps, expected vs actual, Pass/Fail, screenshot or log reference.

---

## 14. Local Quality Gates (Must Pass Before Sandbox Deploy)

- Clean `npm ci` / dependency installation
- Build / package succeeds
- Lint / static checks pass
- All automated tests pass
- No committed secrets or hard-coded credentials
- No Adobe Commerce PHP code
- Default maximum and exact rejection message covered by tests
- Per-item (non-aggregate) behaviour covered by a test
- `aio app build` passes (validates `app.commerce.config.ts`)
- `installation` action present in `src/commerce-extensibility-1/ext.config.yaml` after `init`
- Node.js 22+; `npm test` (Jest) and `npm run lint` (ESLint) green
- Rejection message never asserted on technical-failure paths

Record the exact commands in the README.

---

## 15. Deployment & Sandbox Rules

- Deploy **only** to the approved ACCS sandbox until technical approval.
- Use App Management for installation and association.
- Configure webhook and business settings through supported mechanisms.
- Confirm ACCS can reach the Runtime endpoint.
- Verify a rejected operation does not leave an invalid cart state.
- Record deployed identifiers needed for handoff (without exposing secrets).
- Developer Console workspace must subscribe **I/O Management API** (`AdobeIOManagementAPISDK`) and **ACCS-REST-API** (added manually in the Console UI).
- Admin UI SDK must be enabled on the ACCS instance and the app installed via App Management before the menu appears.
- Leave Commerce's native **Maximum Qty Allowed in Shopping Cart** (`max_sale_qty`) at its default; if a merchant sets it lower, the native message appears first (known limitation).
- Keep webhook database logging off outside debugging sessions.
- Rollback options, fastest first: (1) disable the feature in the Admin page, (2) deactivate the webhook subscription in Admin → System → Webhooks, (3) uninstall the app via App Management.

---

## 16. README Requirements

The pull-request README must contain:

1. Feature overview
2. Confirmed business rules
3. Architecture diagram
4. Verified webhook event and payload fields
5. Verified allow / reject response behaviour
6. Prerequisites
7. Local setup and dependency installation
8. Local test commands
9. App Builder / App Management configuration
10. Administrator configuration instructions
11. Enable / Disable behaviour
12. Default maximum quantity behaviour
13. ACCS webhook setup
14. Sandbox deployment steps
15. Authentication / secret setup (no secret values)
16. Logging and troubleshooting
17. Failure-policy explanation
18. Known limitations: bulk cart-add paths not covered (D-16); English-only rejection message (not translated per store view); native `max_sale_qty` takes precedence when lower (D-09); bundle limitation if the D-11 fallback applies
19. Sandbox test evidence reference
20. Rollback / disable procedure
21. Statement that no Adobe Commerce PHP customization is required
22. Decision log (section 24) and failure-policy rationale
23. Interaction with native `max_sale_qty`
24. Behaviour when the maximum is lowered while carts are open, and at login merge

---

## 17. Pull Request Requirements

Submit **one** pull request containing:

- Complete source code (both extensions)
- Automated tests
- Project / deployment configuration files
- README
- `docs/verified-contracts.md`
- `docs/sandbox-test-evidence.md`
- Architecture notes if useful

Before requesting review:

- Self-review completed
- All local quality gates passed
- No secrets present
- All acceptance tests have evidence
- No unfinished production-critical TODOs

Address all blocking technical-review comments or document the agreed resolution.

---

## 18. Demo & Handoff Script

1. Show administrator configuration page.
2. Set Enabled = Yes, Maximum = 10.
3. Add/update item to quantity 9 → allowed.
4. Change to quantity 10 → allowed.
5. Attempt quantity 11 → rejected with exact message.
6. Demonstrate two different SKUs each at quantity 10 → allowed.
7. Change maximum to 5 → quantity 6 rejected.
8. Disable the feature → quantity greater than 5 allowed.
9. Re-enable → previous maximum restored and enforced.
10. Lower the maximum below an existing line → updating it above the new maximum is rejected; reducing to the maximum is allowed.
11. Login merge: guest + customer quantities above the maximum → merge rejected with the exact message.
12. Show relevant App Builder Runtime logs.
13. Explain deployment, configuration, troubleshooting, and rollback procedure.

---

## 19. Security & Deployment Guardrails

- Never commit credentials, API keys, tokens, or secrets.
- Use supported secret-management mechanisms.
- Validate untrusted webhook input.
- Follow the verified Adobe authentication mechanism.
- Do not expose stack traces or internal details to customers.
- Keep runtime dependencies minimal and pinned.
- Do not introduce any Commerce-side code.
- Do not deploy to production as part of this task.

---

## 20. Agent Execution Order (Strict)

1. Write `app.commerce.config.ts` (metadata only) and run `npx @adobe/aio-commerce-lib-app init`.
2. Add `businessConfig`, `webhooks`, `adminUi` (section 7); re-run `init`; `aio app build`.
3. Set up the Developer Console workspace (section 15); deploy a logging-only webhook action to the sandbox.
4. Perform discovery (section 5), write `docs/verified-contracts.md`, obtain reviewer sign-off.
5. Implement pure domain validator + unit tests.
6. Implement `src/shared/` (schema, normalization, store) + tests.
7. Implement payload and response adapters + tests.
8. Implement Runtime webhook action + action-level tests.
9. Implement Admin UI `get-config` / `save-config` actions and the configuration page + tests.
10. Run all local quality gates.
11. Update README and technical documentation.
12. Deploy to the approved ACCS sandbox only; install via App Management.
13. Execute FT-01 → FT-16 and UI-FT-01 → UI-FT-10; record evidence.
14. Fix any defects and re-run regression.
15. Prepare a single review-ready pull request.
16. Resolve blocking review comments.
17. Re-validate affected scenarios.
18. Prepare and execute demo + technical handoff.

Do not skip verification of Adobe contracts merely to complete code faster.

---

## 21. Non-Negotiable Guardrails for the Coding Agent

1. Do **not** implement aggregate cart quantity validation.
2. Do **not** create Adobe Commerce PHP / module code.
3. Do **not** hard-code `10` as the only usable value (it is the default only).
4. Do **not** use environment variables as the primary merchant-facing business configuration.
5. Do **not** invent Adobe webhook payload fields, event names, response schemas, or Admin UI APIs.
6. Do **not** use a root-level `actions/` folder.
7. Do **not** deploy to production.
8. Do **not** commit secrets.
9. Do **not** consider the feature complete without automated tests and sandbox evidence.
10. Do **not** alter the required rejection message without approval.
11. Product-type, area, scope and failure-policy decisions are fixed in section 24; any change needs reviewer agreement.
12. Never return the required rejection message for technical failures (section 11).
13. Do **not** use Admin UI SDK v1 (`commerce/backend-ui/1`) or raw App Builder State as the configuration store.
14. Do **not** hand-edit generated files or the `app-management` package.

---

## 22. Definition of Done

The feature is complete only when all applicable items are satisfied:

- [ ] Structure generated by `aio-commerce-lib-app init` (`src/commerce-extensibility-1` + `src/commerce-backend-ui-2` + `src/commerce-configuration-1`) used
- [ ] Webhook payload and response fully verified and documented in `docs/verified-contracts.md`
- [ ] Resulting quantity calculation proven correct for both new items and existing SKU updates
- [ ] Configuration persistence mechanism implemented and shared by Admin UI and Runtime
- [ ] `require-adobe-auth` working (webhook + Admin UI actions); menu ACL-protected
- [ ] All product types validated on the customer-visible line; child lines skipped
- [ ] Login-merge and lowered-maximum behaviour verified and documented
- [ ] Admin-area operations unaffected
- [ ] Technical failures fail open and are logged
- [ ] Feature validates quantity per individual cart item only
- [ ] Unrelated SKU quantities are not aggregated
- [ ] Quantity below / equal to maximum is allowed
- [ ] Quantity above maximum is rejected with the exact message
- [ ] Maximum quantity is administrator configurable (default 10); changes take effect without code change or redeployment
- [ ] Enable / Disable works; disabling preserves the maximum
- [ ] Admin UI SDK configuration page is accessible and functional in the sandbox
- [ ] Automated tests pass
- [ ] Local quality gates pass
- [ ] Application deploys successfully to the approved ACCS sandbox
- [ ] FT-01 → FT-16 and UI-FT-01 → UI-FT-10 executed and documented with evidence
- [ ] README contains complete setup, configuration, deployment, testing, troubleshooting, and rollback instructions
- [ ] One complete pull request is submitted
- [ ] All blocking technical-review comments are resolved or have an agreed documented disposition
- [ ] Reviewer demonstration is completed
- [ ] Technical handoff is completed

---

## 23. Final Expected Outcome in Sandbox

```text
Feature Enabled, Maximum Per Item = 10

SKU-A qty 9                 → ALLOW
SKU-A qty 10                → ALLOW
SKU-A qty 11                → REJECT ("You have reached the maximum amount of items.")
SKU-A qty 10 + SKU-B qty 10 → ALLOW
Existing SKU updated > 10   → REJECT

Admin changes maximum to 5:
SKU-A qty 5                 → ALLOW
SKU-A qty 6                 → REJECT

Admin disables feature:
SKU-A qty > 5               → ALLOW

Admin re-enables (max 5), existing line qty 8:
update to 7                 → REJECT
update to 5                 → ALLOW

Login merge (max 10): guest 6 + customer 6 of SKU-A → REJECT
Admin-created order, qty 20 → ALLOW
Validation service down     → cart operations continue (logged)
```

A rejected operation must display exactly:

```text
You have reached the maximum amount of items.
```

The resulting repository must be testable, documented, sandbox-deployable, review-ready, and maintainable without any Adobe Commerce source-code customization.

---

## 24. Decision Log

| ID | Decision | Status |
|----|----------|--------|
| D-01 | Admin configuration UI: Admin UI SDK v2 (`commerce/backend-ui/2`) menu page under Stores | Decided |
| D-02 | Store: `@adobe/aio-commerce-lib-config` business configuration (durable); App Management form shows the same values | Decided |
| D-03 | Scope: global only | Decided (product owner) |
| D-04 | Product types: all; validate the customer-visible (top-level) line, skip child lines — matches native Commerce quantity validation. Supersedes CDA v2 "Parent + child lines" | Decided (product owner: follow Commerce standard) |
| D-05 | Areas: storefront (EDS / GraphQL, REST) + login merge; Admin area excluded | Decided (product owner) |
| D-06 | Lowered maximum: no grandfathering (BR-11) | Decided (plan FT-06) |
| D-07 | Login merge above maximum: reject (no capping) | Decided (BR-03) |
| D-08 | Failure policy: fail-open on technical failures, `required: false` | Decided (standard) — confirm in technical review |
| D-09 | Native `max_sale_qty` left at default (no change to native Commerce config); documented limitation | Decided (standard) |
| D-10 | `app.commerce.config.ts` + JavaScript actions, Jest, ESLint, Node.js 22+ | Decided |
| D-11 | Fallback only if the live payload cannot identify child lines: validate every line. Configurable children (qty 1) are unaffected; a bundle whose per-bundle option quantity exceeds the maximum is rejected — documented limitation | Decided (fallback) |
| D-12 | Acceptance item "Quantities across different SKUs are aggregated correctly" means each SKU line is evaluated independently (**no** aggregation); SKU-A 10 + SKU-B 10 = Allow | Decided (product owner, 2026-10-29) |
| D-13 | **No compensating correction** (CDA v5/v6): no `save_after` clamp, no outbound Cart REST write, no technical-account cart-edit ACL. `save_before` blocks before anything is persisted, so there is nothing to correct | Decided (2026-10-29); supersedes CDA v5 "option 2" / v6 `enableCompensatingCorrection` |
| D-14 | CDA v3 "Logs only (current scope)" = reporting scope only (no dashboards / reports); violations are still blocked | Decided (CDA v6 confirms) |
| D-15 | Superseded CDA fidelity tokens: `commerce/backend-ui/1`, `src/commerce-backend-ui-1`, `App Builder State`, "Parent + child lines", `<recommended_starter_kit>checkout`. Use D-01, D-02, D-04 and `aio-commerce-lib-app init` instead | Decided |
| D-16 | Bulk cart-add paths (B2B quick order, requisition lists, CSV / SKU-list import) | Out of scope (product owner); README lists it as a known limitation |
| D-17 | Keep both settings surfaces (Admin UI SDK page + App Management form) during build and validation; decide before Marketplace listing whether to keep the custom page (CDA v7) | Decided for now — revisit at listing |

## 25. Open Items / Blockers

**Blocking (cannot be resolved in code):**

| ID | Item | Owner |
|----|------|-------|
| B-01 | ACCS sandbox access with App Management and Admin UI SDK enabled | Team / Adobe admin |
| B-02 | Developer Console project + workspace with I/O Management API and ACCS-REST-API subscribed | Team |
| B-03 | Discovery items 2–19 (section 5) — requires B-01 / B-02 | Developer |

**Confirm in technical review (not blocking development):** D-08 fail-open policy, and the customer experience of a rejected login merge (discovery #9).

**Operational recommendation:** route `CONFIG_UNAVAILABLE` / `MALFORMED_PAYLOAD` / `UNEXPECTED_ERROR` logs through App Builder Log Forwarding to a destination with an alert rule, so fail-open events are noticed. For Marketplace installs this is the merchant's choice; document it in the README.

**Contingencies:**
- Webhook does not fire (or lacks the merged quantity) on login merge → stop; evaluate adding `observer.sales_quote_merge_after` (confirmed available in the sandbox) and update this plan.
- Child lines not identifiable at save-before → apply the D-11 fallback and document the bundle limitation.
- Installs share a Runtime namespace / storage across merchants (discovery #18) → stop; global scope is unsafe and the storage design must change before listing.

## 26. Acceptance Criteria Traceability

| # | Acceptance criterion | Covered by | Evidence |
|---|----------------------|------------|----------|
| AC-1 | Cart below the configured limit is accepted | BR-03; AT-01; FT-01 | Unit/action test + sandbox evidence |
| AC-2 | Cart at the configured limit behaves as expected (allowed) | BR-03; AT-02; FT-02 | Unit/action test + sandbox evidence |
| AC-3 | Cart exceeding the limit displays "You have reached the maximum amount of items." | BR-04; AT-03; FT-03 (EDS / GraphQL + REST); discovery #6 | Test asserting exact string + storefront screenshot |
| AC-4 | Existing SKU quantities handled without double counting | BR-02; AT-04; FT-04; discovery #3 / #4 | Live payload proving `qty` is the resulting quantity + test |
| AC-5 | Quantities across different SKUs are handled correctly — each line evaluated independently, **not** aggregated (D-12) | BR-01; AT-05; FT-05 | Test + sandbox evidence (SKU-A 10 + SKU-B 10 = Allow) |
| AC-6 | Admin configuration changes take effect without code changes or redeployment | Section 6 (lib-config, 60 s cache); AT-06; FT-06; UI-FT-03 / 04 / 05 / 06 | Sandbox evidence: change in Admin → enforced within the documented window, no deploy in between |
| AC-7 | Local and sandbox validation completed | Section 14 (gates); section 13 (FT-01 → FT-16, UI-FT-01 → UI-FT-10) | Gate command output in README; `docs/sandbox-test-evidence.md` |
| AC-8 | Pull request includes code, README / setup / configuration, and test evidence | Sections 16, 17 | Single PR with source, tests, README, `docs/verified-contracts.md`, `docs/sandbox-test-evidence.md` |
| AC-9 | Blocking review comments resolved or have an agreed resolution plan | Section 17; section 22 | PR conversation / agreed disposition recorded in PR |

## 27. Marketplace Readiness

Required before Marketplace submission (after sandbox sign-off; not part of the first PR unless requested):

- **Metadata:** `id` is permanent; `displayName` ≤ 50 chars; `description` ≤ 255 chars; `version` Major.Minor.Patch, bumped for every release.
- **Per-install isolation:** proven by discovery #18; no merchant-specific values in code or environment variables.
- **Install / uninstall:** App Management creates the webhook subscription on install and removes it on uninstall (verify in sandbox); document what happens to saved settings on uninstall / reinstall.
- **Upgrades:** schema changes stay backward compatible; every new field has a default.
- **Settings surface:** decide D-17 using sandbox / merchant feedback.
- **Listing assets:** name, description, icon, screenshots, documentation link, support contact, privacy statement — per Adobe's App Builder app submission guidelines and the Admin UI SDK app review checklist.
- **Alerting:** README explains how a merchant can forward fail-open ERROR logs (App Builder Log Forwarding).

---

**This document is the single source of truth for the Copilot / CDA agent.**  
Implement the feature exactly according to this contract.
