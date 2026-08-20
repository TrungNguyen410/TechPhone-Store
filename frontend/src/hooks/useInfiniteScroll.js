import { useCallback, useEffect, useRef, useState } from 'react';

export const useInfiniteScroll = (items, pageSize = 12) => {
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const observerRef = useRef(null);
  const [hasMore, setHasMore] = useState(items.length > pageSize);

  useEffect(() => {
    setVisibleCount(pageSize);
    setHasMore(items.length > pageSize);
  }, [items, pageSize]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setVisibleCount((current) => {
            const next = current + pageSize;
            setHasMore(next < items.length);
            return next;
          });
        }
      },
      { threshold: 0.1 }
    );

    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [hasMore, items.length, pageSize]);

  return {
    visibleItems: items.slice(0, visibleCount),
    isLoading: false,
    hasMore,
    observerRef,
  };
};
