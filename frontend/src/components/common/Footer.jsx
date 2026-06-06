import { FiFacebook, FiInstagram, FiMail, FiMapPin, FiPhone, FiYoutube } from 'react-icons/fi';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-about">
          <Link className="brand brand-light" to="/">
            <span className="brand-mark">T</span><span>Tech<span>Phone</span></span>
          </Link>
          <p>Hệ thống bán lẻ điện thoại và phụ kiện chính hãng, tận tâm từ tư vấn đến hậu mãi.</p>
          <div className="social-links">
            <a href="#facebook" aria-label="Facebook"><FiFacebook /></a>
            <a href="#instagram" aria-label="Instagram"><FiInstagram /></a>
            <a href="#youtube" aria-label="Youtube"><FiYoutube /></a>
          </div>
        </div>
        <div>
          <h4>Về TechPhone</h4>
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
          <p><FiMapPin /> 123 Nguyễn Huệ, Quận 1, TP.HCM</p>
          <p><FiPhone /> 1900 6868</p>
          <p><FiMail /> support@techphone.vn</p>
        </div>
      </div>
      <div className="footer-bottom">
        <div className="container">© 2026 TechPhone. Bảo lưu mọi quyền.</div>
      </div>
    </footer>
  );
}
