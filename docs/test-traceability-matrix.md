# Acceptance-test traceability

Local unit tests assert action contracts. AT/FT/UI-FT live scenarios require an ACCS sandbox; they are not implied by local green tests. Source blueprint does not specify individual test-case descriptions for every numbered ID; mapping below is execution plan, not live verification evidence.

| Case | Scenario | Unit / integration coverage | Live verification |
| --- | --- | --- | --- |
| AT-01 | add qty below limit | `test/commerce-extensibility-1/actions/webhook/validate-cart-item/validate-cart-item.test.js` | storefront guest add |
| AT-02 | add qty above limit | same | storefront add and independent cart query |
| AT-03 | qty at limit | same | boundary add/update |
| AT-04 | disabled bypass | same | native kill switch |
| AT-05 | missing/non-numeric qty | same | webhook test tool |
| AT-06 | Business Config unavailable | same | fault-injection sandbox |
| AT-07 | parent/child rows and remove zero | same; `test/commerce-extensibility-1/actions/lib/is-over-limit.test.js` | configurable/bundle per-row dispatch |
| FT-01 | saved item rollback versus correction | `test/commerce-extensibility-1/actions/lib/commerce-api-client.test.js`, validator test, `test/integration/prevention-guarantee.sandbox.test.js` | correction off/on, independent cart query |
| FT-02 | guest/customer merge | `test/commerce-extensibility-1/actions/webhook/revalidate-quote-merge/revalidate-quote-merge.test.js`, sandbox test | merge + independent cart query |
| FT-03 | admin order creation | item handler test (same handler) | Create New Order in Commerce Admin |
| FT-04 | retry, 404 and stale read | commerce-api-client test | fault injection/concurrent edits |
| UI-FT-01 | native and custom settings round-trip | `test/commerce-backend-ui-2/actions/{get-cart-validation-settings,save-cart-validation-settings}/*.test.js` | edit/refresh both Admin screens |
| UI-FT-02 | invalid max / save failure | same | invalid text and outage in Admin |
| UI-FT-03 | correction toggle | both webhook tests, save-settings test | correction off/on sandbox |

All active unit tests live under root `test/`, mirroring extension source; sandbox must run explicitly with disposable carts. Script fails when prerequisites are missing; it cannot be treated as a skipped passing test.
