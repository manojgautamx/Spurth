import { useCallback, useRef, useState } from 'react';
import axiosInstance from './axiosInstance';
import { getErrorMessage } from './errorMessage';
import { listFrom, hasMore, mergeById } from './paginated';

// One list, fetched a page at a time.
//
// Every feed in the app used to render exactly the first page the server
// sent and stop there, with nothing in the UI to suggest more existed. This
// holds the items, the page cursor and the error in one place so a screen
// can wire `onEndReached={loadMore}` and be done.
//
// Pages are requested by number rather than by following DRF's absolute
// `next` URL: the URL is built from the inbound request, and behind a proxy
// that's one more thing to get right for no benefit here.
export default function usePagedList(path, options) {
  const { params, pageSize, transform, enabled = true } = options || {};

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [more, setMore] = useState(false);

  // A ref, not state: loadMore reads it at call time and must see the value
  // the last completed fetch wrote, not the one captured when it rendered.
  const pageRef = useRef(1);
  const inFlight = useRef(false);

  const fetchPage = useCallback(
    async (page, { append }) => {
      if (inFlight.current) return;
      inFlight.current = true;
      if (append) setLoadingMore(true);
      else if (items.length === 0) setLoading(true);

      try {
        const res = await axiosInstance.get(path, {
          params: { page, ...(pageSize ? { page_size: pageSize } : null), ...params },
        });
        const rows = transform ? listFrom(res.data).map(transform) : listFrom(res.data);

        setItems(prev => (append ? mergeById(prev, rows) : rows));
        setMore(hasMore(res.data));
        pageRef.current = page;
        setError(null);
      } catch (err) {
        // A failed "load more" shouldn't blank the page the user is reading;
        // only a failed first page replaces the list with an error state.
        if (!append) setItems([]);
        setError(getErrorMessage(err, "Couldn't load this right now."));
      } finally {
        inFlight.current = false;
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    // `params` is usually an object literal, so it changes identity every
    // render; serialize it rather than re-creating this callback each time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [path, pageSize, JSON.stringify(params || null), transform]
  );

  const reload = useCallback(() => {
    if (!enabled) return;
    return fetchPage(1, { append: false });
  }, [fetchPage, enabled]);

  const refresh = useCallback(() => {
    if (!enabled) return;
    setRefreshing(true);
    return fetchPage(1, { append: false });
  }, [fetchPage, enabled]);

  const loadMore = useCallback(() => {
    if (!enabled || !more || loadingMore || loading || inFlight.current) return;
    return fetchPage(pageRef.current + 1, { append: true });
  }, [fetchPage, enabled, more, loadingMore, loading]);

  return {
    items, setItems, loading, loadingMore, refreshing,
    error, hasMore: more, reload, refresh, loadMore,
  };
}
