import { useEffect, useState } from 'react';
import {
  FiCheck,
  FiChevronRight,
  FiMinus,
  FiPlus,
  FiShield,
  FiShoppingBag,
  FiStar,
  FiTruck,
  FiZap,
} from 'react-icons/fi';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { productApi } from '../api/productApi';
import Loading from '../components/common/Loading';
import EmptyState from '../components/common/EmptyState';
import ProductGrid from '../components/product/ProductGrid';
import ProductReview from '../components/product/ProductReview';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';
import { formatCurrency } from '../utils/formatCurrency';

export default function ProductDetail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [selectedImage, setSelectedImage] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([productApi.getById(id), productApi.getAll()])
      .then(([detail, products]) => {
        setProduct(detail);
        setSelectedImage(detail.image);
        setQuantity(detail.stock > 0 ? 1 : 0);
        setRelated(products.filter((item) => item.brand === detail.brand && item.id !== detail.id).slice(0, 4));
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Loading />;
  if (!product) return <EmptyState title="Không tìm thấy sản phẩm" description="Sản phẩm có thể đã ngừng kinh doanh." actionLabel="Xem sản phẩm khác" actionTo="/products" />;

  const requireLogin = () => navigate('/login', { state: { from: location } });
  const isOutOfStock = product.status !== 'active' || product.stock <= 0;
  const add = () => {
    if (isOutOfStock) return toast.error('Sản phẩm đã hết hàng');
    addToCart(product, quantity);
    toast.success(`Đã thêm ${quantity} sản phẩm vào giỏ hàng`);
  };
  const buyNow = () => {
    if (isOutOfStock) return toast.error('Sản phẩm đã hết hàng');
    if (!isAuthenticated) return requireLogin();
    addToCart(product, quantity);
    navigate('/checkout');
  };

  return (
    <main className="page-shell">
      <div className="container">
        <nav className="breadcrumbs"><Link to="/">Trang chủ</Link><FiChevronRight /><Link to="/products">Điện thoại</Link><FiChevronRight /><span>{product.name}</span></nav>
        <section className="detail-grid">
          <div className="gallery">
            <div className="main-image"><img src={selectedImage} alt={product.name} /></div>
            <div className="thumbnail-row">
              {product.images.map((image, index) => (
                <button className={selectedImage === image ? 'active' : ''} key={image} onClick={() => setSelectedImage(image)}>
                  <img src={image} alt={`${product.name} ${index + 1}`} />
                </button>
              ))}
            </div>
          </div>
          <div className="detail-info">
            <span className="detail-brand">{product.brand}</span>
            <h1>{product.name}</h1>
            <div className="detail-rating"><span><FiStar /> {product.rating}</span><span>{product.sold} sản phẩm đã bán</span></div>
            <div className="detail-price">
              <strong>{formatCurrency(product.price)}</strong>
              <del>{formatCurrency(product.oldPrice)}</del>
              <span>Tiết kiệm {product.discountPercent}%</span>
            </div>
            <div className="quick-specs">
              <div><small>RAM</small><strong>{product.ram}</strong></div>
              <div><small>Bộ nhớ</small><strong>{product.storage}</strong></div>
              <div><small>Màn hình</small><strong>{product.screen.split(',')[0]}</strong></div>
              <div><small>Pin</small><strong>{product.battery}</strong></div>
            </div>
            <div className="promotion-box">
              <h3><FiZap /> Ưu đãi dành riêng cho bạn</h3>
              <p><FiCheck /> Giảm thêm 200.000đ khi thanh toán chuyển khoản</p>
              <p><FiCheck /> Tặng gói bảo hành mở rộng 12 tháng</p>
              <p><FiCheck /> Miễn phí giao hàng toàn quốc</p>
            </div>
            <div className="purchase-row">
              <div className="quantity-control large">
                <button disabled={isOutOfStock || quantity <= 1} onClick={() => setQuantity(Math.max(1, quantity - 1))}><FiMinus /></button>
                <span>{quantity}</span>
                <button disabled={isOutOfStock || quantity >= product.stock} onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}><FiPlus /></button>
              </div>
              <span className={`in-stock ${isOutOfStock ? 'out-of-stock' : ''}`}>
                <FiCheck /> {isOutOfStock ? 'Hết hàng' : `Còn ${product.stock} sản phẩm`}
              </span>
            </div>
            <div className="detail-actions">
              <button className="btn btn-outline-primary" disabled={isOutOfStock} onClick={add}><FiShoppingBag /> Thêm vào giỏ</button>
              <button className="btn btn-primary" disabled={isOutOfStock} onClick={buyNow}>{isOutOfStock ? 'Hết hàng' : 'Mua ngay'}</button>
            </div>
            <div className="detail-assurances">
              <span><FiShield /> Bảo hành 12 tháng</span>
              <span><FiTruck /> Giao nhanh toàn quốc</span>
            </div>
          </div>
        </section>

        <section className="detail-content-grid">
          <article className="panel description-panel"><h2>Mô tả sản phẩm</h2><p>{product.description}</p></article>
          <aside className="panel specs-panel">
            <h2>Thông số kỹ thuật</h2>
            {Object.entries(product.specifications).map(([key, value]) => <div key={key}><span>{key}</span><strong>{value}</strong></div>)}
          </aside>
        </section>

        <ProductReview productId={product.id} onRequireLogin={requireLogin} />

        {related.length > 0 && (
          <section className="product-section related-section">
            <div className="section-heading"><div><span>Có thể bạn quan tâm</span><h2>Sản phẩm liên quan</h2></div></div>
            <ProductGrid products={related} />
          </section>
        )}
      </div>
    </main>
  );
}
