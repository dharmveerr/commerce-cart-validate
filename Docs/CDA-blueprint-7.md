
# Cart Item Validation — Technical Blueprint v7 (ACCS / App Builder) — Marketplace Distribution Note

## 0. New context this revision: Marketplace distribution

This extension is intended to be published as a **Marketplace app**, installable across **any ACCS project** (multi-tenant distribution), not built as a bespoke single-client extension. This doesn't change the current build plan, but it does change the long-term recommendation for which Admin UI mechanism to keep.

### Decision: build both now, decide later (confirmed)
Per this turn's discussion: keep both settings surfaces during initial implementation/validation —
1. The **native, auto-generated App Management settings screen** — exists automatically the moment `businessConfig.schema` is declared, per Adobe's own documentation ("Merchants configure settings through the auto-generated UI"). **This is a real, live, editable config page in Commerce Admin, not static/hardcoded values** — `@adobe/aio-commerce-lib-config` only ever reads whatever a merchant most recently saved there (or the schema's `default` if nothing's been saved yet).
2. The **custom Admin UI SDK page** (`adminUi.menu`) already in the v2+ design.

Both read/write the exact same underlying config, so they cannot drift out of sync with each other.

### Recommendation for marketplace launch: Native Business Config as the primary/likely sole surface

For a Marketplace app specifically (as opposed to a single bespoke build), **Native Business Config is the better long-term choice**, for reasons specific to multi-tenant distribution:

| Factor | Native Business Config | Custom Admin UI SDK page |
|---|---|---|
| Maintenance across many merchant installs | Zero custom frontend code; Adobe maintains the renderer | A React bundle + 2 actions to keep compatible across every install, and across future Admin UI SDK versions (this project has already seen one such version bump, `/1` → `/2`) |
| Fit with Adobe's intended pattern | This **is** the designated "settings for installed apps" surface per App Management's own documentation | A bespoke addition, not the platform's default expectation for app settings |
| Admin UI clutter across many installed marketplace apps | No extra menu entry | Adds a dedicated menu entry per install — multiplies across however many marketplace apps a merchant has installed |
| Marketplace review/certification friction | Lower — uses the blessed, declarative mechanism | Higher — more custom surface area to review |
| UX flexibility | Limited to schema field types (no native numeric type, as already noted) | Full control |

**Net recommendation**: once validation confirms the native schema fields are sufficient (which they should be for a simple Enabled/Max Quantity/Compensating-Correction toggle set), plan to **drop the custom Admin UI SDK page before general Marketplace listing**, keeping Native Business Config as the sole settings surface. Retain the custom page only if testing surfaces a real requirement the native schema genuinely cannot express.

This is a **recommendation to revisit after validation**, not a decision made now — the current task list (building both) is unchanged by this note.

## 1. No other architectural changes this revision

All webhook selections, architecture elements, risks, and tasks from v6 remain as-is. This revision is documentation-only: it records the Marketplace-distribution context and the native-vs-custom decision criteria for a future go/no-go call, so the rationale isn't lost between now and when that call is made.

<recommended_starter_kit>checkout</recommended_starter_kit>

<!-- BEGIN Requirement Fidelity (auto-generated — do not edit) -->
## Requirement Fidelity

These exact requirement tokens must be preserved verbatim through implementation. Later versions supersede earlier ones (most recent first):

- [v7] `Lets implement both for now, after checking it we will decide which one is required`
- [v7] `marketplace app`
- [v7] `can be deployed to any accs project`
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