# Commerce Cart Validate

An Adobe App Builder app for Adobe Commerce as a Cloud Service (ACCS) that limits the quantity of each cart line to a configurable maximum (default `10`). It is installed through App Management and built on the Adobe Commerce SDK (`@adobe/aio-commerce-lib-app`).

> **Status:** built, tested locally and deployed to a Stage workspace. App Management installation and live sandbox verification are still in progress, so the app is **not production-verified**. See [Status](#status).

## Features

- Blocks any cart line above the maximum with: `You have reached the maximum amount of items.`
- The limit applies **per cart line**. Quantities are not added up across different SKUs.
- Settings take effect without redeploying, through two surfaces that share the same values:
  - App Management business configuration.
  - A custom Admin page under **Stores > Cart Item Validation**, protected by an Admin ACL check.
- Optional compensating correction, which lowers an over-limit line back to the maximum through the Commerce Cart REST API.
- Technical problems (unreadable settings, malformed payload) are logged and the cart is allowed. Only a business-rule violation blocks the cart.
- Webhooks time out after 5 seconds. On failure, Commerce shows: `Unable to update the cart right now. Please try again.`

## How it works

Three synchronous Commerce webhooks call Runtime actions in App Builder:

| Webhook | Runtime action |
| --- | --- |
| `observer.sales_quote_add_item` | `cart-validation/validate-cart-item` |
| `observer.sales_quote_item_save_after` | `cart-validation/validate-cart-item` |
| `observer.sales_quote_merge_after` | `cart-validation/revalidate-quote-merge` |

The actions read the settings, compare the line quantity with the maximum, and return success or an exception with a message. Installing the app in App Management subscribes the webhooks. Deploying alone does not.

## Prerequisites

- Node.js 24 and npm (the actions run on `nodejs:24`).
- Adobe I/O CLI (`aio`), logged in to the right IMS organization.
- An Adobe Developer Console project and workspace with Runtime, `AdobeIOManagementAPISDK`, `ACCS-REST-API` and OAuth Server-to-Server credentials.
- An ACCS sandbox where you can associate and install apps.

## Setup

```bash
npm install
aio app use --global --no-input --merge   # bind the Developer Console workspace
```

Binding writes a local `.env` and `.aio`. Use [`docs/.env.template`](docs/.env.template) for the variable names. These files hold credentials and must never be committed.

## Configuration

| Setting | Type | Default | Notes |
| --- | --- | --- | --- |
| `enabled` | boolean | `true` | When off, validation is skipped and the saved maximum is kept. |
| `maxQuantity` | text | `10` | A positive whole number. |
| `enableCompensatingCorrection` | boolean | `true` | When off, over-limit lines are only rejected. |

Settings are stored at global scope. The app definition, webhooks and Admin menu are declared in [`app.commerce.config.ts`](app.commerce.config.ts).

## Deploy and install

```bash
npm run typecheck
npm test
aio app build
aio app deploy
```

Then, in Commerce Admin, open **Apps > App Management**. Associate the app with the workspace once, then install it, and check that the three webhooks are active. The step-by-step flow, with recovery for the association error, is in [`docs/deployment-and-live-testing.md`](docs/deployment-and-live-testing.md).

## Testing

- `npm test` runs the unit tests (`node:test`) with all external services mocked.
- `npm run test:sandbox` runs live checks against a disposable ACCS sandbox. It fails on purpose until the `ACCS_*` variables from [`docs/verified-contracts.md`](docs/verified-contracts.md) are set.
- `npm run typecheck` checks the app configuration and the Admin UI source.

## Project structure

- `src/commerce-extensibility-1/actions/lib/`: settings, quantity comparison and associated-Commerce correction client.
- `src/commerce-extensibility-1/actions/webhook/`: webhook definitions (`actions.config.yaml`) and handler-specific `index.js` (orchestration) / `validator.js` (payload parsing).
- `src/commerce-configuration-1/`: SDK-generated native Business Config and scope endpoints.
- `src/commerce-backend-ui-2/actions/`: protected settings actions; `actions/lib/permissions.js` enforces menu ACL.
- `src/commerce-backend-ui-2/web-src/`: merchant settings UI; `src/config.json` is generated at build time.
- `test/`: unit tests that mirror `src/`, plus the separately run sandbox test in `test/integration/`.
- `docs/`: blueprint, HLD, LLD, implementation plan, runbook, test traceability, live-testing guide and verification record.

The SDK owns the `.generated/` directories. Do not edit them. Change `app.commerce.config.ts` and the handwritten actions instead.

## Documentation

- [Requirements and solution design](docs/requirements-and-solution-design.md): start here; includes the gap list
- [Blueprint](docs/blueprint.md), [HLD](docs/HLD.md) and [LLD](docs/LLD.md)
- [Implementation plan](docs/implementation-plan.md)
- [Deployment and live testing](docs/deployment-and-live-testing.md)
- [Operations runbook](docs/cart-item-validation-runbook.md)
- [Test traceability matrix](docs/test-traceability-matrix.md)
- [Verification record](docs/verified-contracts.md)

## Status

- Done: implementation, unit tests, Stage build and deployment.
- Pending: App Management association and installation, and live sandbox verification. That covers webhook payloads, rollback or correction behavior, merge, the Admin Create New Order path, Admin settings and role permissions.
- Open decisions: whether the webhooks stay `required` (an outage then blocks the cart), and the per-line versus cart-total quantity rule.

Deployment, passing unit tests and a Stage association status are not proof that cart enforcement works in Commerce.

## Security

Never commit `.env`, `.aio`, access tokens, client secrets or generated action URLs. Rotate any credential that has been shared outside the secret store.
