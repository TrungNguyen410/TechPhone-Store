import { useState } from 'react';
import {
  FiChevronDown,
  FiMenu,
  FiPhoneCall,
  FiSearch,
  FiShoppingBag,
  FiUser,
  FiX,
} from 'react-icons/fi';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../hooks/useCart';
import { useStoreSettings } from '../../hooks/useStoreSettings';
import StoreBrand from './StoreBrand';

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const { cartCount } = useCart();
  const settings = useStoreSettings();

  const submitSearch = (event) => {
    event.preventDefault();
    navigate(`/products?q=${encodeURIComponent(search.trim())}`);
    setMobileOpen(false);
  };

  return (
    <>
      <div className="topbar">
        <div className="container topbar-inner">
          <span>Miễn phí vận chuyển đơn từ 10 triệu</span>
          <div><FiPhoneCall /> Hotline: <strong>{settings.hotline}</strong></div>
        </div>
      </div>
      <header className="site-header">
        <div className="container header-main">
          <button className="mobile-menu-button" onClick={() => setMobileOpen(true)} aria-label="Mở menu">
            <FiMenu />
          </button>
          <StoreBrand />
          <form className="header-search" onSubmit={submitSearch}>
            <FiSearch />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Bạn cần tìm điện thoại nào?"
            />
            <button>Tìm kiếm</button>
          </form>
          <div className="header-actions">
            <Link className="header-action" to={isAuthenticated ? '/account' : '/login'}>
              <FiUser />
              <span>
                <small>{isAuthenticated ? 'Xin chào' : 'Tài khoản'}</small>
                <strong>{isAuthenticated ? (user.fullName || user.email).split(' ').slice(-2).join(' ') : 'Đăng nhập'}</strong>
              </span>
              <FiChevronDown className="chevron" />
            </Link>
            <Link className="header-action cart-action" to="/cart">
              <FiShoppingBag />
              <span><small>Giỏ hàng</small><strong>{cartCount} sản phẩm</strong></span>
              {cartCount > 0 && <b>{cartCount}</b>}
            </Link>
          </div>
        </div>
        <nav className="desktop-nav">
          <div className="container nav-inner">
            <NavLink to="/" end>Trang chủ</NavLink>
            <NavLink to="/products">Điện thoại</NavLink>
            <NavLink to="/accessories">Phụ kiện</NavLink>
            <NavLink to="/reviews">Đánh giá</NavLink>
            <NavLink to="/order-lookup">Tra cứu đơn hàng</NavLink>
            <NavLink to="/contact">Liên hệ</NavLink>
            {user?.role === 'admin' && <NavLink to="/admin/dashboard">Quản trị</NavLink>}
            {isAuthenticated && <button className="nav-logout" onClick={logout}>Đăng xuất</button>}
          </div>
        </nav>
      </header>
      <div className={`mobile-drawer ${mobileOpen ? 'open' : ''}`}>
        <div className="mobile-drawer-header">
          <StoreBrand onClick={() => setMobileOpen(false)} />
          <button onClick={() => setMobileOpen(false)}><FiX /></button>
        </div>
        <form className="mobile-search" onSubmit={submitSearch}>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm sản phẩm..." />
          <button><FiSearch /></button>
        </form>
        <nav>
          <NavLink to="/" onClick={() => setMobileOpen(false)}>Trang chủ</NavLink>
          <NavLink to="/products" onClick={() => setMobileOpen(false)}>Điện thoại</NavLink>
          <NavLink to="/accessories" onClick={() => setMobileOpen(false)}>Phụ kiện</NavLink>
          <NavLink to="/reviews" onClick={() => setMobileOpen(false)}>Đánh giá</NavLink>
          <NavLink to="/order-lookup" onClick={() => setMobileOpen(false)}>Tra cứu đơn hàng</NavLink>
          <NavLink to="/contact" onClick={() => setMobileOpen(false)}>Liên hệ</NavLink>
          <NavLink to={isAuthenticated ? '/account' : '/login'} onClick={() => setMobileOpen(false)}>
            {isAuthenticated ? 'Tài khoản của tôi' : 'Đăng nhập'}
          </NavLink>
          {user?.role === 'admin' && <NavLink to="/admin/dashboard">Quản trị</NavLink>}
        </nav>
      </div>
      {mobileOpen && <div className="drawer-overlay" onClick={() => setMobileOpen(false)} />}
    </>
  );
}
