import { FiFacebook, FiInstagram, FiMail, FiMapPin, FiPhone, FiYoutube } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { useStoreSettings } from '../../hooks/useStoreSettings';
import StoreBrand from './StoreBrand';

export default function Footer() {
  const settings = useStoreSettings();
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-about">
          <StoreBrand className="brand-light" />
          <p>Hệ thống bán lẻ điện thoại và phụ kiện chính hãng, tận tâm từ tư vấn đến hậu mãi.</p>
          <div className="social-links">
            <a href={settings.facebook} target="_blank" rel="noreferrer" aria-label="Facebook"><FiFacebook /></a>
            <a href={settings.instagram} target="_blank" rel="noreferrer" aria-label="Instagram"><FiInstagram /></a>
            <a href={settings.youtube} target="_blank" rel="noreferrer" aria-label="Youtube"><FiYoutube /></a>
          </div>
        </div>
        <div>
          <h4>Về {settings.storeName}</h4>
          <Link to="/contact">Giới thiệu công ty</Link>
          <Link to="/contact">Hệ thống cửa hàng</Link>
          <Link to="/contact">Tuyển dụng</Link>
          <Link to="/contact">Liên hệ</Link>
        </div>
        <div>
          <h4>Hỗ trợ khách hàng</h4>
          <Link to="/order-lookup">Tra cứu đơn hàng</Link>
          <Link to="/contact">Chính sách bảo hành</Link>
          <Link to="/contact">Chính sách đổi trả</Link>
          <Link to="/contact">Hướng dẫn mua hàng</Link>
        </div>
        <div className="footer-contact">
          <h4>Thông tin liên hệ</h4>
          <p><FiMapPin /> {settings.address}</p>
          <p><FiPhone /> {settings.hotline}</p>
          <p><FiMail /> {settings.email}</p>
        </div>
      </div>
      <div className="footer-bottom">
        <div className="container">© 2026 {settings.storeName}. Bảo lưu mọi quyền.</div>
      </div>
    </footer>
  );
}
