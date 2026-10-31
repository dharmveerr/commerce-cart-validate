// Payload parsing is separated from action orchestration; live ACCS shape remains to be verified.
export function parseMergePayload(data) {
  const quote = data?.quote;
  return {
    quote,
    context: { handler: 'revalidate-quote-merge', source: 'observer.sales_quote_merge_after', quote_id: quote?.entity_id },
  };
}
