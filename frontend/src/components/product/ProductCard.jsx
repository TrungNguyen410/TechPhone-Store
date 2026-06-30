import { useEffect, useState } from 'react';
import { FiHeart, FiShoppingCart, FiStar } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useCart } from '../../hooks/useCart';
import { STORAGE_KEYS } from '../../utils/constants';
import { formatCurrency } from '../../utils/formatCurrency';
import { storage } from '../../utils/storage';

export default function ProductCard({ product, type = 'product' }) {
  const { addToCart } = useCart();
  const detailPath = type === 'accessory' ? `/accessories/${product.id}` : `/products/${product.id}`;
  const [favorite, setFavorite] = useState(() => storage.get(STORAGE_KEYS.wishlist, []).includes(product.id));
  const isOutOfStock = product.status !== 'active' || product.stock <= 0;

  useEffect(() => {
    const sync = () => setFavorite(storage.get(STORAGE_KEYS.wishlist, []).includes(product.id));
    window.addEventListener('wishlist-updated', sync);
    return () => window.removeEventListener('wishlist-updated', sync);
  }, [product.id]);

  const add = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (isOutOfStock) return toast.error('Sản phẩm đã hết hàng');
    addToCart(product, 1, type);
    toast.success(`Đã thêm ${product.name} vào giỏ hàng`);
  };
  const toggleFavorite = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const wishlist = storage.get(STORAGE_KEYS.wishlist, []);
    const nextWishlist = wishlist.includes(product.id)
      ? wishlist.filter((id) => id !== product.id)
      : [...wishlist, product.id];
    storage.set(STORAGE_KEYS.wishlist, nextWishlist);
    setFavorite(nextWishlist.includes(product.id));
    window.dispatchEvent(new CustomEvent('wishlist-updated'));
    toast.success(nextWishlist.includes(product.id) ? 'Đã thêm vào danh sách yêu thích' : 'Đã bỏ khỏi danh sách yêu thích');
  };

  return (
    <article className="product-card">
      <Link to={detailPath} className="product-card-link">
        <div className="product-image-wrap">
          <img src={product.image} alt={product.name} loading="lazy" />
          {product.discountPercent > 0 && <span className="discount-badge">-{product.discountPercent}%</span>}
          {isOutOfStock && <span className="stock-badge">Hết hàng</span>}
          <button
            type="button"
            className={`wishlist-button ${favorite ? 'active' : ''}`}
            aria-label={favorite ? 'Bỏ khỏi yêu thích' : 'Thêm vào yêu thích'}
            aria-pressed={favorite}
            onClick={toggleFavorite}
          >
            <FiHeart />
          </button>
        </div>
        <div className="product-card-body">
          <span className="product-brand">{product.brand}</span>
          <h3>{product.name}</h3>
          {type === 'product' && (
            <div className="spec-chips">
              <span>{product.ram}</span>
              <span>{product.storage}</span>
            </div>
          )}
          <div className="price-row">
            <strong>{formatCurrency(product.price)}</strong>
            {product.oldPrice > product.price && <del>{formatCurrency(product.oldPrice)}</del>}
          </div>
          <div className="product-meta">
            <span><FiStar /> {product.rating}</span>
            <span>Đã bán {product.sold}</span>
          </div>
          <button className="add-cart-button" disabled={isOutOfStock} onClick={add}>
            <FiShoppingCart /> {isOutOfStock ? 'Hết hàng' : 'Thêm vào giỏ'}
          </button>
        </div>
      </Link>
    </article>
  );
}
