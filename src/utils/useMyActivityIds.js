import { useEffect, useState } from 'react';
import { fetchAllPages } from './paginated';

// Every activity id the current user created or joined. Used to decide which
// posts are exempt from the distance filter in the Experiences rail and the
// Experience tab — see postVisibility.js.
export default function useMyActivityIds(axiosInstance, enabled) {
  const [ids, setIds] = useState(new Set());

  useEffect(() => {
    if (!enabled) {
      setIds(new Set());
      return;
    }
    let cancelled = false;
    Promise.all([
      fetchAllPages(axiosInstance, 'my-activities/'),
      fetchAllPages(axiosInstance, 'joined-activities/'),
    ])
      .then(([created, joined]) => {
        if (cancelled) return;
        setIds(new Set([...created, ...joined].map(a => a.id)));
      })
      .catch(() => {
        // Non-fatal: without this, posts from your own activities just get
        // distance-filtered like everyone else's instead of being exempt.
        if (!cancelled) setIds(new Set());
      });
    return () => { cancelled = true; };
  }, [axiosInstance, enabled]);

  return ids;
}
