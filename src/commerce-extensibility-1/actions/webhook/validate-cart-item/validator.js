// Adobe documents `data.quote_item` for add_item; save observers are expected to send `data_object` (verify live).
export function parseCartItemPayload(data) {
  const payload = data ?? {};
  const addedItem = payload.quote_item ?? payload.quoteItem;
  const source = addedItem ? 'observer.sales_quote_add_item' : 'observer.sales_quote_item_save_after';
  const item = addedItem ?? payload.data_object ?? payload.item;
  return {
    item,
    context: {
      handler: 'validate-cart-item', source,
      quote_id: item?.quote_id ?? payload.quote?.entity_id ?? payload.quote_id,
      item_id: item?.item_id, sku: item?.sku, qty: item?.qty, product_type: item?.product_type,
    },
  };
}
