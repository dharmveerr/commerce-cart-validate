
# Cart Item Validation — Technical Blueprint v6 (ACCS / App Builder) — Gap Analysis Pass 2

## 0. Cleanup performed
- Refreshed and replaced the `observer.sales_quote_item_save_after` and `observer.sales_quote_merge_after` selection rationales — the previous text described them as if still co-equal/primary mechanisms; they now accurately state their narrower, fallback-only scope and their pairing with the v5 compensating-correction safety net. Old revisions removed; only the current, accurate descriptions remain in the decisions log.
- Audited all architecture nodes/edges: every recorded runtime action, the Admin UI menu, the external Commerce Cart REST API node, and all connecting edges are referenced by the current design. Nothing orphaned.

## 1. New gaps found this pass

### Missing entities
1. **Compensating-correction feature flag** — there was no way to disable *just* the outbound clamp-call behavior while keeping validation/blocking active. **Added**: a third `businessConfig.schema` field, `enableCompensatingCorrection` (boolean, default `true`) — if the compensating-write logic ever misbehaves in production, ops can disable it independently of the whole feature.
2. **Alerting destination** — the design said "log at CRITICAL severity" but never specified where that actually goes. A log line nobody reads is not a safety net. **Clarified**: CRITICAL logs must be routed through App Builder Log Forwarding to a destination with an active alert rule (Slack/PagerDuty/email) — this is now a named deployment prerequisite, not an implied one.

### Missing workflows
1. **Compensating-write race condition** — if a customer corrects their own cart (e.g., reduces qty) in the brief window between violation-detection and our compensating call, our clamp could overwrite their legitimate fix with a stale `maxQuantity` value. **Added a guard**: the compensating-call helper now does a `GET` on the item immediately before the `PUT`, and only clamps if the current qty still matches the value that triggered the violation — otherwise it treats the situation as already resolved and skips the write (logged as a no-op, not an error).
2. **Manual recovery runbook** — there was no documented human process for when the compensating call itself exhausts retries. **Added**: an explicit runbook step (search Log Forwarding for CRITICAL entries tagged `cart-validation`, manually inspect/correct the named cart via Commerce Admin).
3. **Quantity-removal edge case (qty=0)** — not explicitly tested. `isOverLimit` naturally allows qty=0 (0 is never > maxQuantity), so removals are unaffected — but this needs an explicit test case so a future refactor doesn't accidentally break it.
4. **Bulk/CSV import bypass** — confirmed via `checkCommerceWebhook` with `triggerContext: import`: **both** `sales_quote_add_item` and `sales_quote_item_save_after` are documented as **not reachable** from import. If this store uses any bulk/CSV-based cart creation (e.g., B2B quick-order-by-SKU-list or requisition-list import, if such a feature is in use), those paths **bypass this validation entirely**. Documented as a known limitation, not silently missed — flag to the business whether any such bulk-add feature exists and is in scope.

### Operational requirements
1. **Per-environment ACL grants** — the IMS technical account's cart-item-edit ACL permission (added in v5) must be granted in **every** environment (dev/staging/prod), not just production — sharpened from a generic note into an explicit per-environment checklist item.
2. **Alerting wiring is now a named prerequisite** (see above), not an assumption.

### Reporting requirements
No change to the confirmed "logs only" decision — the gap found here was about where CRITICAL logs *go* operationally, not about adding new reporting surfaces.

## 2. Updated Components

| Component | Change |
|---|---|
| `businessConfig.schema` | **+1 field**: `enableCompensatingCorrection` (boolean, default `true`) |
| Settings page | **+1 control**: toggle for compensating correction, alongside Enabled/Max Quantity |
| `commerce-api-client.js` | **+ read-before-write guard**: `GET` current qty, only `PUT` if it still matches the violating value |
| `validate-cart-item` / `revalidate-quote-merge` | Check `enableCompensatingCorrection` before attempting the clamp call; always still return the block response regardless |

## 3. Updated API contract

`get-cart-validation-settings` response:
```json
{ "statusCode": 200, "body": { "enabled": true, "maxQuantity": 10, "enableCompensatingCorrection": true } }
```

## 4. Updated Risks

| Priority | Risk | Mitigation |
|---|---|---|
| 1 | Compensating call fails after retries | Retry+backoff, CRITICAL alert **routed to a real destination** (named prerequisite), manual recovery runbook step (new) |
| 2 | Compensating write races a legitimate concurrent customer fix | **Read-before-write guard added** this pass — skips the clamp if qty no longer matches |
| 3 | Bulk/CSV import bypasses validation entirely | Documented known limitation; confirm with business whether any bulk-add feature is actually in use |
| 4 | Sandbox verification of original rollback behavior still pending (carried) | Sandbox test task, unchanged |
| 5 | Per-row dispatch for configurable/bundle children unverified (carried) | Integration test, unchanged |

## 5. Updated Test Plan (additions)

- Unit: `enableCompensatingCorrection=false` suppresses the clamp call but still returns the block response; read-before-write guard skips the write when qty no longer matches the violation.
- Unit: qty=0 (removal) never triggers validation or compensation on either handler.
- Settings page: new toggle persists and round-trips correctly (extends UI-FT test matrix).

## 6. Implementation Checklist (updated)

- [ ] `enableCompensatingCorrection` field added to schema, settings page, and both handlers
- [ ] Read-before-write guard implemented in `commerce-api-client.js`
- [ ] Log Forwarding destination with an active alert rule confirmed working (not just configured)
- [ ] Per-environment IMS ACL grants confirmed in dev, staging, and prod
- [ ] Manual recovery runbook step documented and reviewed by support/ops
- [ ] Business confirms whether any bulk/CSV cart-add feature is in scope (if yes, this is a new gap requiring its own design)
- [ ] All v5 checklist items still apply

<recommended_starter_kit>checkout</recommended_starter_kit>

<!-- BEGIN Requirement Fidelity (auto-generated — do not edit) -->
## Requirement Fidelity

These exact requirement tokens must be preserved verbatim through implementation. Later versions supersede earlier ones (most recent first):

- [v5] why you are taking observer.sales_quote_item_save_after
  observer
  That will call after item saved in cart with qty
  right?
- [v5] lets us go with option 2
- [v4] `observer.sales_quote_item_save_before`
- [v4] `commerce/backend-ui/1`
- [v4] `src/commerce-backend-ui-1`
- [v4] `App Builder State`
- [v3] `Logs only (current scope)`
- [v3] `Single global limit (current)`
- [v3] `Add merge-time revalidation`
- [v3] `Apply the same limit`
- [v2] `Custom Admin UI SDK page`
- [v2] `Parent + child lines`
- [v1] Act as a **Senior Adobe Commerce Architect and Technical senior consultant** with expertise in Adobe App Builder, Adobe Commerce Admin UI SDK, and Adobe Commerce extensibility.
  
  We are planning to implement the **Cart Item Validation** feature for the **ACCS (Adobe Commerce as a Cloud Service)** project using **Adobe App Builder and Admin UI SDK**.
  
  Please thoroughly review the attached implementation plan and prepare a comprehensive **Technical Blueprint and Implementation Plan**.
  
  ### Requirements
  
  **1. Review the Existing Plan**
  
  - Analyze the attached implementation plan.
  - Identify missing requirements, technical gaps, dependencies, risks, and potential improvements.
  - Validate the proposed approach against Adobe Commerce as a Cloud Service architecture and extensibility best practices.
  
  **2. Prepare the Technical Blueprint**
  
  - Define the overall solution architecture.
  - Explain the roles and responsibilities of Adobe App Builder and Admin UI SDK.
  - Identify the appropriate extension points, APIs, events, and integrations.
  - Define the cart item validation workflow and business logic.
  - Provide architecture diagrams and end-to-end data flow diagrams.
  - Clearly distinguish supported capabilities from assumptions requiring verification.
  
  **3. Design the Implementation**
  
  - Define the required App Builder actions and backend components.
  - Design the Admin UI SDK integration for managing validation rules, where applicable.
  - Explain how cart item validation will be triggered and executed.
  - Define API contracts, request/response payloads, and error-handling mechanisms.
  - Include authentication, authorisation, logging, and security considerations.
  - Provide a recommended project structure and configuration requirements.
  
  **4. Prepare a Step-by-Step Implementation Plan**
  
  - Break the implementation into logical development phases.
  - Provide detailed implementation steps for each component.
  - Include code examples and configuration snippets where applicable.
  - Identify dependencies and prerequisites.
  - Define unit testing, integration testing, and end-to-end testing strategies.
  - Explain deployment and validation procedures.
  
  **5. Deliverables**
  Provide the following:
  
  1. Review findings and recommendations.
  2. Detailed technical architecture blueprint.
  3. Component-level design and responsibilities.
  4. Cart item validation workflow and sequence diagrams.
  5. API and integration specifications.
  6. Recommended project folder structure.
  7. Step-by-step implementation guide.
  8. Testing and deployment strategy.
  9. Risks, limitations, and mitigation recommendations.
  10. Implementation checklist with milestones and acceptance criteria.
  
  ### Important Instructions
  
  - Follow Adobe Commerce as a Cloud Service best practices.
  - Prefer supported Adobe extensibility mechanisms over customizations.
  - Verify the compatibility of all proposed APIs, SDKs, events, and extension points with ACCS.
  - Do not assume that Admin UI SDK supports storefront cart validation directly; explain the appropriate separation between administrative configuration and runtime validation.
  - Use the attached plan as the primary reference.
  - Highlight any gaps or deviations from the original plan.
  - Do not invent unsupported Adobe Commerce capabilities.
  - If critical information is missing, document assumptions and open questions before proposing implementation details.
  
  ### Expected Outcome
  
  Produce a **development-ready technical blueprint and actionable implementation plan** that the engineering team can use to implement the Cart Item Validation feature in ACCS using Adobe App Builder and Admin UI SDK.
<!-- END Requirement Fidelity (auto-generated — do not edit) -->