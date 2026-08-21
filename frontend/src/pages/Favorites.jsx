import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { FiHeart } from 'react-icons/fi';
import { accessoryApi } from '../api/accessoryApi';
import { productApi } from '../api/productApi';
import EmptyState from '../components/common/EmptyState';
import Loading from '../components/common/Loading';
import LoadError from '../components/common/LoadError';
import ProductGrid from '../components/product/ProductGrid';
import { STORAGE_KEYS } from '../utils/constants';
import { storage } from '../utils/storage';
import { AuthContext } from '../context/AuthContext';

export default function Favorites() {
  const auth = useContext(AuthContext);
  const user = auth?.user;
  const persistWishlist = auth?.setWishlist;
  const [catalog, setCatalog] = useState({ products: [], accessories: [] });
  const [wishlist, setWishlist] = useState(() => user?.wishlist || storage.get(STORAGE_KEYS.wishlist, []));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const syncWishlist = useCallback(() => {
    setWishlist(user?.wishlist || storage.get(STORAGE_KEYS.wishlist, []));
  }, [user?.wishlist]);

  const loadCatalog = useCallback(() => {
    setLoading(true);
    setError('');
    return Promise.all([productApi.getAll(), accessoryApi.getAll()])
      .then(([products, accessories]) => setCatalog({ products, accessories }))
      .catch((loadError) => setError(loadError.friendlyMessage || loadError.message))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { loadCatalog(); }, [loadCatalog]);

  useEffect(() => {
    window.addEventListener('wishlist-updated', syncWishlist);
    return () => window.removeEventListener('wishlist-updated', syncWishlist);
  }, [syncWishlist]);

  // Chi giu lai id con ton tai trong catalog, roi ghi nguoc lai de badge o header
  // khong dem nhung san pham da bi xoa/an (nguyen nhan "chon 1 nhung hien 2").
  const liveIds = useMemo(
    () => new Set([...catalog.products, ...catalog.accessories].map((item) => item.id)),
    [catalog],
  );
  const prunedRef = useRef(false);

  useEffect(() => {
    if (loading || error || prunedRef.current || !persistWishlist) return;
    const kept = wishlist.filter((id) => liveIds.has(id));
    if (kept.length === wishlist.length) return;
    prunedRef.current = true;
    Promise.resolve(persistWishlist(kept)).catch(() => { prunedRef.current = false; });
  }, [error, liveIds, loading, persistWishlist, wishlist]);

  if (loading) return <Loading />;
  if (error) {
    return (
      <main className="page-shell favorites-page">
        <div className="container">
          <LoadError message={error} onRetry={loadCatalog} />
        </div>
      </main>
    );
  }

  const products = catalog.products.filter((item) => wishlist.includes(item.id));
  const accessories = catalog.accessories.filter((item) => wishlist.includes(item.id));
  const total = products.length + accessories.length;

  return (
    <main className="page-shell favorites-page">
      <div className="container">
        <div className="page-hero small">
          <div>
            <span>Danh sách của bạn</span>
            <h1>Sản phẩm yêu thích</h1>
          </div>
          <p>{total ? `${total} sản phẩm đang được lưu` : 'Lưu sản phẩm để dễ dàng xem lại sau.'}</p>
        </div>

        {!total ? (
          <EmptyState
            icon={FiHeart}
            title="Chưa có sản phẩm yêu thích"
            description="Nhấn biểu tượng trái tim trên sản phẩm bạn quan tâm."
            actionLabel="Khám phá sản phẩm"
            actionTo="/products"
          />
        ) : (
          <>
            {products.length > 0 && (
              <section className="product-section">
                <div className="section-heading compact"><div><h2>Điện thoại</h2></div></div>
                <ProductGrid products={products} />
              </section>
            )}
            {accessories.length > 0 && (
              <section className="product-section">
                <div className="section-heading compact"><div><h2>Phụ kiện</h2></div></div>
                <ProductGrid products={accessories} type="accessory" />
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
