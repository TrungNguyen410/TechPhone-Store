import { useEffect, useState } from 'react';
import {
  FiArrowRight,
  FiAward,
  FiHeadphones,
  FiRefreshCcw,
  FiShield,
  FiSmartphone,
  FiTruck,
  FiWatch,
  FiZap,
} from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { accessoryApi } from '../api/accessoryApi';
import { bannerApi } from '../api/bannerApi';
import { productApi } from '../api/productApi';
import Loading from '../components/common/Loading';
import ProductGrid from '../components/product/ProductGrid';

const categories = [
  { name: 'iPhone', icon: FiSmartphone, query: 'Apple', color: 'blue' },
  { name: 'Samsung', icon: FiSmartphone, query: 'Samsung', color: 'violet' },
  { name: 'Xiaomi', icon: FiZap, query: 'Xiaomi', color: 'orange' },
  { name: 'Tai nghe', icon: FiHeadphones, path: '/accessories?category=Tai%20nghe', color: 'cyan' },
  { name: 'Đồng hồ', icon: FiWatch, path: '/accessories?category=Dong%20ho', color: 'green' },
  { name: 'Thu cũ đổi mới', icon: FiRefreshCcw, path: '/contact', color: 'pink' },
];

export default function Home() {
  const [products, setProducts] = useState([]);
  const [accessories, setAccessories] = useState([]);
  const [banners, setBanners] = useState([]);
  const [activeBanner, setActiveBanner] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([productApi.getAll(), accessoryApi.getAll(), bannerApi.getAll()])
      .then(([productData, accessoryData, bannerData]) => {
        setProducts(productData.filter((item) => item.status === 'active'));
        setAccessories(accessoryData.filter((item) => item.status === 'active'));
        setBanners(bannerData.filter((item) => item.active));
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (banners.length < 2) return undefined;
    const timer = setInterval(() => setActiveBanner((current) => (current + 1) % banners.length), 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  if (loading) return <Loading />;

  const hotProducts = [...products].sort((a, b) => b.sold - a.sold).slice(0, 8);
  const saleProducts = [...products].sort((a, b) => b.discountPercent - a.discountPercent).slice(0, 8);

  return (
    <>
      <section className="hero-section">
        <div className="container">
          <div className="hero-slider">
            {banners.map((banner, index) => (
              <Link
                to={banner.link}
                className={`hero-slide ${index === activeBanner ? 'active' : ''}`}
                key={banner.id}
              >
                <img src={banner.image} alt={banner.title} />
              </Link>
            ))}
            <div className="slider-dots">
              {banners.map((banner, index) => (
                <button
                  key={banner.id}
                  className={index === activeBanner ? 'active' : ''}
                  onClick={() => setActiveBanner(index)}
                  aria-label={`Xem banner ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container category-section">
        <div className="section-heading compact">
          <div><span>Mua sắm dễ dàng</span><h2>Danh mục nổi bật</h2></div>
        </div>
        <div className="category-grid">
          {categories.map(({ name, icon: Icon, query, path, color }) => (
            <Link
              key={name}
              to={path || `/products?brand=${query}`}
              className="category-card"
            >
              <div className={`category-icon ${color}`}><Icon /></div>
              <strong>{name}</strong>
              <span>Khám phá <FiArrowRight /></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="container product-section">
        <div className="section-heading">
          <div><span>Được yêu thích nhất</span><h2>Sản phẩm bán chạy</h2></div>
          <Link to="/products">Xem tất cả <FiArrowRight /></Link>
        </div>
        <ProductGrid products={hotProducts} />
      </section>

      <section className="sale-band">
        <div className="container">
          <div className="section-heading light">
            <div><span>Ưu đãi có hạn</span><h2>Giá tốt hôm nay</h2></div>
            <Link to="/products">Săn ưu đãi <FiArrowRight /></Link>
          </div>
          <ProductGrid products={saleProducts} />
        </div>
      </section>

      <section className="container product-section" id="accessories">
        <div className="section-heading">
          <div><span>Hoàn thiện trải nghiệm</span><h2>Phụ kiện nổi bật</h2></div>
          <Link to="/accessories">Xem tất cả <FiArrowRight /></Link>
        </div>
        <ProductGrid products={accessories.slice(0, 8)} type="accessory" />
      </section>

      <section className="store-story">
        <div className="container store-story-grid">
          <div>
            <span className="eyebrow">An tâm chọn TechPhone</span>
            <h2>Công nghệ tốt hơn, trải nghiệm gần gũi hơn</h2>
            <p>
              Mỗi thiết bị đều được kiểm định kỹ, công khai tình trạng và đi kèm chính sách bảo hành
              minh bạch. Đội ngũ của chúng tôi luôn sẵn sàng giúp bạn chọn đúng sản phẩm.
            </p>
            <Link className="btn btn-light btn-lg" to="/contact">Tìm hiểu về chúng tôi</Link>
          </div>
          <div className="story-stats">
            <div><strong>8+</strong><span>Năm kinh nghiệm</span></div>
            <div><strong>50K+</strong><span>Khách hàng tin chọn</span></div>
            <div><strong>98%</strong><span>Khách hàng hài lòng</span></div>
            <div><strong>24/7</strong><span>Hỗ trợ trực tuyến</span></div>
          </div>
        </div>
      </section>

      <section className="container benefit-grid">
        <div><FiShield /><span><strong>Sản phẩm kiểm định</strong><small>Chất lượng được cam kết</small></span></div>
        <div><FiTruck /><span><strong>Giao hàng toàn quốc</strong><small>Nhanh chóng, an toàn</small></span></div>
        <div><FiRefreshCcw /><span><strong>Đổi trả linh hoạt</strong><small>Trong vòng 30 ngày</small></span></div>
        <div><FiAward /><span><strong>Bảo hành tận tâm</strong><small>Hỗ trợ rõ ràng</small></span></div>
      </section>
    </>
  );
}
