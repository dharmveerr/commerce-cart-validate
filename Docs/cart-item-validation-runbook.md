# Cart Item Validation deployment and validation runbook

## Developer Console / deployment checklist

1. Choose an **ACCS sandbox** workspace in Adobe Developer Console. Configure its organization, project, workspace and Runtime credentials using the authorized secret store; do not put values in source, chat or committed config. Keep local workspace binding files out of the repository.
2. Subscribe workspace to SDK-required **AdobeIOManagementAPISDK** (I/O Management API) and ACCS **ACCS-REST-API**; connect ACCS project through App Management. IMS technical account must read and edit cart items in each environment. Confirm actual permissions for dev/stage/production (role names vary). Complete workspace login/subscriptions before retrying association.
3. Run `npm install`, `npx aio-commerce-lib-app generate all`, `npm run typecheck`, `npm run test`, `aio app build`. Generated `web-src/src/config.json` can contain `undefined.adobeio-static.net` without workspace context; verify regenerated URLs have the selected namespace before opening Admin page. Do not hardcode/commit action URLs. After editing `app.commerce.config.ts`, regenerate the SDK manifest and actions before validation/deploy. Validate the included `actions/webhook/actions.config.yaml` resolves both function paths.
4. Only on explicit approval deploy with `aio app deploy`. **Deploy does not install** an App Management app on ACCS: associate and install through Commerce Admin, verify three webhook registrations, native Business Config and custom Stores menu, and grant menu ACL to intended Admin roles. `require-adobe-auth` restricts settings access by IMS; custom settings actions additionally check the menu ACL server-side. Test allowed and denied roles directly.
5. A Stage association record can report `ASSOCIATED` while Admin shows a generic 500. Check actual failed Network URL/method and redacted response/activation; verify installation and scope sync independently. If scopes did not sync, try Manage scopes → Quick actions → Sync commerce scopes. Do not retry/unassociate blindly.
6. Candidate observer names/payload shapes, timeout and ordering remain unverified. Inspect webhook test tool and **System > Webhook Logs**. After-named observers with `webhook_type: before` may not roll back. Do not claim operational or Marketplace-ready until `verified-contracts.md` contains live evidence. Test install/upgrade on two ACCS projects; no fixed backend URL, org or store code assumed.

## Smoke tests

1. In native App Management settings set Enabled=true, Max Quantity=10, Enable Compensating Correction=true. Load same values in custom Stores menu, save Max Quantity=5, refresh both and confirm storefront rejection follows 5. Reject invalid 0/fractional/enormous values in custom UI/action. Native text max has no numeric type; invalid native value causes reader fail-open. Correct before release.
2. In Commerce Admin webhook test tool submit boundary, above boundary, invalid/missing qty and qty=0 removal; inspect success/exception and handler/source/decision logs. Test storefront guest add, customer add, cart update/remove, then independently query cart after each. Include simple/configurable/bundle parent **and** child lines; dispatch per row remains unverified.
3. Merge guest and customer carts whose combined per-line quantity exceeds limit; inspect first offending SKU message, UX, final cart. Sign off customer-facing merge-block message. Run correction off to isolate rollback and correction on to verify final <=maxQuantity. Use separate disposable carts per attempt.
4. In **Commerce Admin Create New Order**, test above-limit and valid quantities; confirm dispatch/end state instead of assuming storefront trigger applies. Test concurrent fixes: read-before-write guard must skip stale quantities. Check `CRITICAL` on exhausted retry and manual recovery.
5. Run `npm run test:sandbox` in each correction mode with disposable carts and local variables from `verified-contracts.md`; missing variables cause failure. Check ACCS timeout, then repeat after upgrade and on second project.

## Operations and limitations

- Kill switch: Enabled=false in **native Business Config** (independent of custom UI), verify a new cart request bypasses. Disable correction alone to keep blocking but stop REST writes. Require change approval for production safety changes.
- On `CRITICAL` correction log, inspect identified quote/item using authorized query, manually reduce/remove excess line, verify final state; investigate ACL, association and transient failures. Never log tokens/cart PII.
- Business Config failure or invalid native limit **fails open** for cart hooks. Alert on `phase: configuration, decision: fail_open` and `phase: compensation, decision: CRITICAL`; Admin settings actions fail closed.
- Bulk/CSV imports and other quote modifications outside candidate observers are not guaranteed. Admin UI SDK manages settings, not storefront enforcement. Multi-store rules, aggregate SKU quantity and historical-cart remediation are outside scope.
- Marketplace gate: compare native Business Config and custom UI after live validation; **keep both for now**.
