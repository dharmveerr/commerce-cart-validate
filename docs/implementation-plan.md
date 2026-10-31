# Cart Item Validation — implementation plan (v7 organisation update)

This is relocation of existing code, not functional redesign. Previously approved Blueprint v7 remains source for feature scope; no storage is approved. Keep native Business Config and custom Admin UI together until live comparison determines whether both are needed.

| Phase | Migration step | Acceptance |
| --- | --- | --- |
| 1 | Inventory existing config, SDK-generated App Management actions, references and unit/sandbox tests; keep `.generated/` unchanged. | Baseline behavior and existing Runtime names recorded. |
| 2 | Relocate extensibility helpers `actions/shared/` → `actions/lib/`, and webhook handlers → `actions/webhook/<action>/`; isolate payload parsing in `validator.js`. | Item, merge, compensation, fail-open and logging behavior unchanged; no root helper or alias. |
| 3 | Register `cart-validation` actions in included `actions/webhook/actions.config.yaml`, update include-relative `function` paths, keep auth/IMS inputs, annotations, and App Management actions. | `aio app build` resolves both functions and preserves webhook runtimeAction names. |
| 4 | Relocate backend permissions to `actions/lib/`, update settings actions' relative imports to `../../../commerce-extensibility-1/actions/lib/`. | No changes to GET/POST responses or ACL checks. |
| 5 | Move seven unit files to mirrored `test/` paths, update imports and `npm run test`; keep sandbox suite and test coverage. Consolidate runbook/evidence and HLD, LLD, blueprint, README in lowercase `docs/`. Delete obsolete `src/**/__tests__/`, `actions/shared/` and old handler copies, then verify inventory. | All existing assertions plus validator parsing tests pass; only one docs folder and no old source copies remain. |
| 6 | Generate SDK assets, run `npm install`, frontend/action typecheck, build and unit tests. No deploy without explicit request. | Build succeeds; 17 unit assertions pass. |
| 7 | After installation in disposable ACCS project, execute sandbox test with correction off/on, check Admin Create New Order and independent cart queries, repeat on another ACCS tenant. | Fill `verified-contracts.md`; three awaiting-user blueprint gates remain open until live evidence exists. |

Rollback: restore former paths and extension function mappings as one commit if build or merchant smoke tests regress; do not edit generated action files. Check Admin association/install separately from build and do not treat `ASSOCIATED` or generic 500 as proof of successful installation. Workspace binding and credentials remain local/secret-managed and excluded from repository.
