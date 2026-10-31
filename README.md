# Commerce Cart Validate

Adobe Commerce App Builder cart-item validation app for ACCS, designed for installation across merchant projects. The SDK owns the `.generated/` directories; edit `app.commerce.config.ts` and the handwritten actions instead. The approved implementation basis is Cart Item Validation Blueprint v7; this repository's organisation-only blueprint/HLD/LLD and plan are in [`docs/`](docs/blueprint.md).

## Layout

- `src/commerce-extensibility-1/actions/lib/`: settings, quantity comparison and associated-Commerce correction client.
- `src/commerce-extensibility-1/actions/webhook/`: webhook definitions (`actions.config.yaml`) and handler-specific `index.js` (orchestration) / `validator.js` (payload parsing).
- `src/commerce-configuration-1/`: SDK-generated native Business Config and scope endpoints.
- `src/commerce-backend-ui-2/actions/`: protected settings actions; `actions/lib/permissions.js` enforces menu ACL.
- `src/commerce-backend-ui-2/web-src/`: merchant settings UI; `src/config.json` is generated at build time.
- `test/`: mirrored unit tests and a separately run sandbox integration test. Historical `src/**/__tests__/` copies are not part of the active test suite.
- `docs/`: architecture, implementation plan, runbook, test traceability and live verification record.

## Development

Run `npm install`, `npx aio-commerce-lib-app generate all`, `npm run typecheck`, `npm run test`, and `aio app build`. Do not edit SDK-generated files. `npm run test:sandbox` needs disposable ACCS carts and the prerequisites in [`docs/verified-contracts.md`](docs/verified-contracts.md); it deliberately fails without them. Deployment alone does not install the app into Commerce. Never commit `.env`, `.aio` binding files, access tokens or generated action URLs. See [`docs/cart-item-validation-runbook.md`](docs/cart-item-validation-runbook.md) before installation.

The application is **not production-verified**: webhook payload/rollback behavior and Admin Create New Order coverage require sandbox evidence. Stage association status and a generic 500 do not prove installation or enforcement.
