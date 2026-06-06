import { FiHeart, FiShoppingCart, FiStar } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useCart } from '../../hooks/useCart';
import { formatCurrency } from '../../utils/formatCurrency';

export default function ProductCard({ product, type = 'product' }) {
  const { addToCart } = useCart();
  const detailPath = type === 'accessory' ? `/accessories/${product.id}` : `/products/${product.id}`;

  const add = (event) => {
    event.preventDefault();
    addToCart(product, 1, type);
    toast.success(`Đã thêm ${product.name} vào giỏ hàng`);
  };

  return (
    <article className="product-card">
      <Link to={detailPath} className="product-card-link">
        <div className="product-image-wrap">
          <img src={product.image} alt={product.name} loading="lazy" />
          {product.discountPercent > 0 && <span className="discount-badge">-{product.discountPercent}%</span>}
          <button className="wishlist-button" aria-label="Yêu thích" onClick={(event) => event.preventDefault()}>
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
          <button className="add-cart-button" onClick={add}><FiShoppingCart /> Thêm vào giỏ</button>
        </div>
      </Link>
    </article>
  );
}
