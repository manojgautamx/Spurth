// DRF hands back one of two shapes depending on whether the endpoint
// paginates: a plain array, or a {count, next, previous, results} envelope.
// Screens shouldn't have to know which — several were already guessing with
// an inline `res.data.results || res.data`, and the ones that weren't broke
// outright the moment an endpoint started paginating.

export function listFrom(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
}

// True when the server says there's another page. Absent on unpaginated
// endpoints, which is the same as "that's everything".
export function hasMore(data) {
  return Boolean(data && data.next);
}

export function totalCount(data, fallbackList) {
  if (data && typeof data.count === 'number') return data.count;
  return (fallbackList || listFrom(data)).length;
}

// Walk every page of an endpoint and return one combined array.
//
// Only for lists bounded by something about the user — the activities they
// created or joined — where "all of them" is the honest answer and the count
// is naturally small. Never point this at a platform-wide feed; that's what
// usePagedList is for. `maxPages` is a backstop against a paginator that
// never stops saying `next`.
export async function fetchAllPages(client, path, { params, maxPages = 10 } = {}) {
  const collected = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const res = await client.get(path, { params: { page, ...params } });
    collected.push(...listFrom(res.data));
    if (!hasMore(res.data)) break;
  }
  return collected;
}

// Append a page, dropping anything already held. Re-fetching page 1 on
// refresh while page 2 is in flight can genuinely deliver the same row
// twice, and a duplicate key in a FlatList renders as a duplicate card.
export function mergeById(existing, incoming) {
  const seen = new Set(existing.map(item => item && item.id));
  const added = incoming.filter(item => item && !seen.has(item.id));
  return added.length ? existing.concat(added) : existing;
}
