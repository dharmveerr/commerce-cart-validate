// Adobe documents `data.quote_item` for observer.sales_quote_add_item; model save observers send `data_object`.
export function parseCartItemPayload(params) {
  const data = params?.data ?? {};
  const addedItem = data.quote_item ?? data.quoteItem;
  const item = addedItem ?? data.data_object ?? data.item;
  return {
    source: addedItem ? 'observer.sales_quote_add_item' : 'observer.sales_quote_item_save_after',
    item: item && typeof item === 'object' ? item : null,
    quoteId: item?.quote_id ?? data.quote?.entity_id ?? data.quote_id,
  };
}
