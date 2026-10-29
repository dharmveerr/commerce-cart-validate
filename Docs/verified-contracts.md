# ACCS contract verification record

Status: **NOT VERIFIED on a live ACCS sandbox**. A mocked test/build does not prove hook dispatch, rollback or correction. The sandbox script is deliberately **failing**, not skipped, without explicit credentials and mode. Do not interpret a deployed action as a successful test.

## Sources and assumptions

- The SDK accepts `webhooks[].runtimeAction`, `webhook.webhook_method`, `webhook.webhook_type: before` and returns `ok(exceptionOperation(message))`: [Webhook app management](https://developer.adobe.com/commerce/extensibility/app-management/installation/webhooks/) and [response helpers](https://github.com/adobe/aio-commerce-sdk/blob/main/packages/aio-commerce-lib-webhooks/docs/usage.md).
- `observer.sales_quote_add_item` (`data.quoteItem`), `observer.sales_quote_item_save_after` (`data.item`) and `observer.sales_quote_merge_after` (`data.quote.items[]`) are blueprint-selected **candidate** hooks. Their ACCS payloads, availability and rollback behavior are not confirmed. The published [add-to-cart sample](https://github.com/adobe/adobe-commerce-samples/blob/main/webhooks/add-to-cart-stock-validation/README.md) uses `observer.checkout_cart_product_add_before` instead; confirm the selected hooks on the target project before Marketplace listing.
- `webhook_type: before` on an observer whose name ends in `_after` does **not** establish database rollback. Test with correction off and an independent cart query.
- GraphQL [updateCartItems](https://developer.adobe.com/commerce/webapi/graphql/schema/cart/mutations/update-items/) and [mergeCarts](https://developer.adobe.com/commerce/webapi/graphql/schema/cart/mutations/merge/) probe persistence separately from the webhook response. REST correction and its guest/customer cart ACL require live confirmation. `getCommerceClient` resolves the associated merchant.
- The Admin menu ACL check uses `getAdminUiPermissionClient` and the merchant-associated client. Check actual role attribution (not merely the technical account's role) in sandbox by invoking both settings actions as two Admin users with different menu permissions.

## Sandbox evidence procedure

1. Install on a **disposable** ACCS sandbox with two distinct merchant-owned carts. Set Enabled=true, Max Quantity=10 and Enable Compensating Correction=false in App Management. Put a compliant target item in the destination and the **same SKU** at a compliant quantity in the guest source; their combined quantity must exceed 10. Use an authorized shopper token able to query both carts, or prepare two independent tests with appropriate access. Verify three webhook registrations, payload fields and **System > Webhook Logs**.
2. Export locally `ACCS_GRAPHQL_URL` (HTTPS), `ACCS_BEARER_TOKEN`, `ACCS_CART_ID` (destination), `ACCS_CART_ITEM_UID` (target UID), `ACCS_MERGE_SOURCE_CART_ID` (guest) and `ACCS_EXPECT_MODE=rollback`; never commit tokens. Run `npm run test:sandbox`. An absent variable causes failure. The harness asserts both mutations reject and the cart is unchanged; it logs no token, cart ID or request body. A failure can indicate either missing hook or an incorrect payload/GraphQL contract; diagnose before claiming prevention.
3. Recreate the source guest cart, set Enable Compensating Correction=true and `ACCS_EXPECT_MODE=correct`, then rerun with fresh destination/source carts. The test asserts a rejected mutation and a final cart whose lines are <=10. If the session cannot query the source cart or Commerce does not support the GraphQL mutation input type, fix the test against the real ACCS schema rather than treating failure as evidence of rollback.
4. Capture sanitized observer payload examples (parent and child rows), hook invocation count, error text and latency. Check whether correction PUT re-enters save hooks. Run storefront guest/customer add and quantity update, login merge and **Commerce Admin Create New Order**; inspect resulting cart/order in Commerce, not just the mutation response. Also test a denied and allowed Admin role calling settings actions directly to establish ACL enforcement.
5. Repeat after upgrading and on a second ACCS project. If hooks or payloads differ, do not promote to production; amend code/config, rerun build and tests and record date/environment/evidence below.

## Results

| Contract | Live outcome | Required evidence |
| --- | --- | --- |
| add hook dispatched before persistence | pending | webhook logs + post-cart query |
| save-after named hook rollback | pending | correction off + post-cart query |
| merge-after named hook rollback | pending | correction off + post-cart query |
| correction on guest/customer cart | pending | GET/PUT and post-cart query |
| parent/child row coverage | pending | sanitized webhook logs |
| admin order creation | pending | admin UI and webhook logs |
| UI settings round-trip and role ACL | pending | Admin UI + native Business Config comparison and two-role check |
