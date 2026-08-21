import { useCallback, useEffect, useState } from 'react';

/**
 * Hiển thị dần danh sách: render `pageSize` mục đầu tiên, mỗi lần người dùng
 * cuộn tới cuối lưới thì nạp thêm một lô nữa (không dùng nút chuyển trang).
 */
export const useInfiniteScroll = (items, pageSize = 9) => {
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const [sentinel, setSentinel] = useState(null);
  const observerRef = useCallback((node) => setSentinel(node), []);

  // Bộ lọc / từ khoá / sắp xếp đổi -> quay lại lô đầu tiên.
  useEffect(() => {
    setVisibleCount(pageSize);
  }, [items, pageSize]);

  const total = items.length;
  const hasMore = visibleCount < total;

  useEffect(() => {
    if (!sentinel || !hasMore) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      setVisibleCount((current) => Math.min(current + pageSize, total));
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        setVisibleCount((current) => Math.min(current + pageSize, total));
      },
      { rootMargin: '240px 0px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
    // visibleCount nam trong deps de observer duoc gan lai sau moi lo,
    // neu khong sentinel van con trong viewport se khong ban them su kien nao.
  }, [hasMore, pageSize, sentinel, total, visibleCount]);

  return {
    visibleItems: items.slice(0, visibleCount),
    isLoading: false,
    hasMore,
    observerRef,
  };
};
