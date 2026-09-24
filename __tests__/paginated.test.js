import { listFrom, hasMore, mergeById, fetchAllPages } from '../src/utils/paginated';

// The bug this guards against: an endpoint starts paginating, the screen
// keeps calling .map on the response, and the feed goes blank in
// production. Both shapes have to keep working.

describe('listFrom', () => {
  it('passes through a plain array', () => {
    expect(listFrom([{ id: 1 }])).toEqual([{ id: 1 }]);
  });

  it('unwraps a DRF page envelope', () => {
    expect(listFrom({ count: 1, next: null, previous: null, results: [{ id: 1 }] }))
      .toEqual([{ id: 1 }]);
  });

  it('returns an empty array for anything else, rather than throwing', () => {
    expect(listFrom(null)).toEqual([]);
    expect(listFrom(undefined)).toEqual([]);
    expect(listFrom({ detail: 'Not found.' })).toEqual([]);
  });
});

describe('hasMore', () => {
  it('is true only when the server offers a next page', () => {
    expect(hasMore({ next: 'http://x/?page=2', results: [] })).toBe(true);
    expect(hasMore({ next: null, results: [] })).toBe(false);
    expect(hasMore([])).toBe(false);
  });
});

describe('mergeById', () => {
  it('appends only rows not already held', () => {
    const existing = [{ id: 1 }, { id: 2 }];
    expect(mergeById(existing, [{ id: 2 }, { id: 3 }])).toEqual([
      { id: 1 }, { id: 2 }, { id: 3 },
    ]);
  });

  it('returns the same array when there is nothing new', () => {
    const existing = [{ id: 1 }];
    expect(mergeById(existing, [{ id: 1 }])).toBe(existing);
  });
});

describe('fetchAllPages', () => {
  it('follows pages until the server stops offering one', async () => {
    const pages = {
      1: { next: 'p2', results: [{ id: 1 }] },
      2: { next: 'p3', results: [{ id: 2 }] },
      3: { next: null, results: [{ id: 3 }] },
    };
    const client = { get: jest.fn(async (_p, cfg) => ({ data: pages[cfg.params.page] })) };

    await expect(fetchAllPages(client, 'my-activities/')).resolves.toEqual([
      { id: 1 }, { id: 2 }, { id: 3 },
    ]);
    expect(client.get).toHaveBeenCalledTimes(3);
  });

  it('stops at maxPages even if the server keeps saying there is more', async () => {
    const client = { get: jest.fn(async () => ({ data: { next: 'always', results: [{ id: Math.random() }] } })) };
    const all = await fetchAllPages(client, 'x/', { maxPages: 4 });
    expect(all).toHaveLength(4);
    expect(client.get).toHaveBeenCalledTimes(4);
  });

  it('handles an unpaginated endpoint in one request', async () => {
    const client = { get: jest.fn(async () => ({ data: [{ id: 1 }, { id: 2 }] })) };
    await expect(fetchAllPages(client, 'x/')).resolves.toHaveLength(2);
    expect(client.get).toHaveBeenCalledTimes(1);
  });
});
