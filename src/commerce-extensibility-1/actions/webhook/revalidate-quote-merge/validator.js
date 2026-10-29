// Candidate payload shape from CDA blueprint v7; confirm against live ACCS webhook logs.
export function parseMergePayload(params) {
  const quote = params?.data?.quote;
  return {
    quoteId: quote?.entity_id,
    items: Array.isArray(quote?.items) ? quote.items : null,
  };
}
