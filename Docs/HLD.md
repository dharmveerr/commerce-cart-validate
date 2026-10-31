# Cart Item Validation — HLD (organisation-only update)

## Context and boundaries

Commerce (ACCS) owns carts, webhooks, Admin and App Management. App Builder hosts webhook actions, two protected settings actions and a custom Admin UI page; App Management Business Config persists the three global settings. No new persistent store or Commerce customization is introduced. The SDK owns installation/association, configuration/scope, manifest and Admin UI scaffolding under `.generated/`. Adobe's SDK convention is three extension directories; the `actions/webhook/` and `actions/lib/` split is a project organisation choice rather than an SDK requirement.

```text
Commerce cart operation ── candidate SaaS observer webhook ──> cart-validation runtime action
       ^                                                     │
       │                                        actions/webhook/<action>/index.js
       │                                                     │
       └──── success/exception operation <── validator.js + actions/lib/settings.js
                                                            │
                                      optional read-before-write correction via
                                          actions/lib/commerce-api-client.js

Commerce Admin ── native Business Config ──┐
Commerce Admin ── custom Stores menu ── settings actions ── menu ACL check
                                           └────── shared global Business Config
```

## Extension interfaces

`app.config.yaml` binds `commerce/extensibility/1`, `commerce/configuration/1` and `commerce/backend-ui/2`. `app.commerce.config.ts` retains webhook and menu declarations. `src/commerce-extensibility-1/ext.config.yaml` includes `./actions/webhook/actions.config.yaml` as `cart-validation.actions`; the include maps `validate-cart-item/index.js` and `revalidate-quote-merge/index.js` relative to the include directory (confirmed by SDK build). Runtime annotations `final`, `require-adobe-auth` and IMS credentials are unchanged. Admin settings actions retain existing Runtime paths and call extension-local helpers by relative import, not a root alias. Frontend build generates `web-src/src/config.json`; never commit tenant-specific URLs.

## Security and reliability

Webhook actions require Adobe authentication; settings actions also require server-side menu ACL. IMS credentials and Runtime binding live outside repository. Global settings reading fails open for cart hooks; settings management fails closed. Optional correction uses associated merchant client, reads before writing, retries transient faults twice and logs `CRITICAL` when exhausted. A returned exception from an after-named observer is **not evidence** of rollback; independently query cart in ACCS.

See [LLD](LLD.md), [implementation plan](implementation-plan.md), [runbook](cart-item-validation-runbook.md) and [live evidence](verified-contracts.md).
