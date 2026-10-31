// The two observer payload shapes are candidates until verified in an ACCS sandbox.
export function parseCartItemPayload(data) {
  const payload = data ?? {};
  const source = payload.quoteItem ? 'observer.sales_quote_add_item' : 'observer.sales_quote_item_save_after';
  const item = payload.quoteItem ?? payload.item;
  return {
    item,
    context: {
      handler: 'validate-cart-item', source,
      quote_id: item?.quote_id ?? payload.quote?.entity_id ?? payload.quote_id,
      item_id: item?.item_id, sku: item?.sku, qty: item?.qty, product_type: item?.product_type,
    },
  };
}
