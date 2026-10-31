# Cart Item Validation — implementation plan (v7 organisation update)

This is a relocation of existing code, not a functional redesign. The previously approved Blueprint v7 remains the source for feature scope; no storage is approved. Keep native Business Config and custom Admin UI together until live comparison determines whether both are needed.

| Phase | Migration step | Acceptance |
| --- | --- | --- |
| 1 | Inventory existing config, SDK-generated App Management actions, references and unit/sandbox tests; keep `.generated/` unchanged. | Baseline behavior and existing Runtime names recorded. |
| 2 | Relocate extensibility helpers `actions/shared/` → `actions/lib/`, and webhook handlers → `actions/webhook/<action>/`; isolate payload parsing in `validator.js`. | Item, merge, compensation, fail-open and logging behavior unchanged; no root helper or alias. |
| 3 | Register `cart-validation` actions in included `actions/webhook/actions.config.yaml`, update extension-relative `function` paths, keep auth/IMS inputs, annotations, and App Management actions. | `aio app build` resolves both functions and preserves webhook runtimeAction names. |
| 4 | Relocate backend permissions to `actions/lib/`, update settings actions' relative imports to `../../../commerce-extensibility-1/actions/lib/`. | No changes to GET/POST responses or ACL checks. |
| 5 | Move seven unit files to mirrored `test/` paths, update imports and `npm run test`; keep sandbox suite and test coverage. Move runbook/evidence to `Docs/`, add HLD, LLD, blueprint, README and `.gitignore`. | All existing assertions plus validator parsing tests pass; docs contain no secrets/binding. |
| 6 | Generate SDK assets, run `npm install`, frontend/action typecheck, build and all unit tests. No deployment without explicit request. | Build succeeds; 17 unit assertions pass. |
| 7 | After installation in a disposable ACCS project, execute sandbox test in correction-off and correction-on modes, check Admin Create New Order and independent cart queries, repeat on another ACCS tenant. | Fill `verified-contracts.md`; three awaiting-user blueprint gates remain open until evidence exists. |

Rollback strategy: restore the former paths and extension function mappings as one commit if the build/merchant smoke tests regress; do not edit generated action files directly. Check Admin association/install separately from build and do not treat an `ASSOCIATED` record or a generic 500 as proof of successful installation. Workspace binding and credentials remain local/secret-managed and excluded from the repository.
