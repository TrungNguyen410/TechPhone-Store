import { useEffect, useState } from 'react';
import {
  FiChevronDown,
  FiHeart,
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
import { useDebounce } from '../../hooks/useDebounce';
import { useStoreSettings } from '../../hooks/useStoreSettings';
import { accessoryApi } from '../../api/accessoryApi';
import { productApi } from '../../api/productApi';
import { STORAGE_KEYS } from '../../utils/constants';
import { formatCurrency } from '../../utils/formatCurrency';
import { storage } from '../../utils/storage';
import StoreBrand from './StoreBrand';
import { trackEvent } from '../../utils/analytics';

const normalizeSearch = (value = '') => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replaceAll('đ', 'd')
  .toLowerCase();

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searchFocused, setSearchFocused] = useState(false);
  const [wishlistCount, setWishlistCount] = useState(
    () => storage.get(STORAGE_KEYS.wishlist, []).length,
  );
  const debouncedSearch = useDebounce(search.trim(), 250);
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const { cartCount } = useCart();
  const settings = useStoreSettings();

  useEffect(() => {
    const sync = () => setWishlistCount(storage.get(STORAGE_KEYS.wishlist, []).length);
    window.addEventListener('wishlist-updated', sync);
    return () => window.removeEventListener('wishlist-updated', sync);
  }, []);

  useEffect(() => {
    setWishlistCount((user?.wishlist || storage.get(STORAGE_KEYS.wishlist, [])).length);
  }, [user?.wishlist]);

  useEffect(() => {
    let active = true;
    if (debouncedSearch.length < 2) {
      setSuggestions([]);
      return undefined;
    }
    Promise.all([
      productApi.getAll({ q: debouncedSearch }),
      accessoryApi.getAll({ q: debouncedSearch }),
    ]).then(([products, accessories]) => {
      if (!active) return;
      const term = normalizeSearch(debouncedSearch);
      const matches = [
        ...products.map((item) => ({ ...item, type: 'product' })),
        ...accessories.map((item) => ({ ...item, type: 'accessory' })),
      ]
        .filter((item) =>
          normalizeSearch(`${item.name} ${item.brand} ${item.category}`).includes(term))
        .slice(0, 6);
      setSuggestions(matches);
    }).catch(() => {
      if (active) setSuggestions([]);
    });
    return () => { active = false; };
  }, [debouncedSearch]);

  const submitSearch = (event) => {
    event.preventDefault();
    trackEvent('search', { query_length: search.trim().length });
    navigate(`/products?q=${encodeURIComponent(search.trim())}`);
    setSearchFocused(false);
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
          <form
            className="header-search"
            onSubmit={submitSearch}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 120)}
          >
            <FiSearch />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Bạn cần tìm điện thoại nào?"
            />
            <button>Tìm kiếm</button>
            {searchFocused && debouncedSearch.length >= 2 && (
              <div className="search-suggestions">
                {suggestions.length ? suggestions.map((item) => (
                  <button
                    type="button"
                    key={`${item.type}-${item.id}`}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      navigate(item.type === 'accessory' ? `/accessories/${item.id}` : `/products/${item.id}`);
                      setSearch('');
                      setSearchFocused(false);
                    }}
                  >
                    <img src={item.image} alt="" />
                    <span><strong>{item.name}</strong><small>{item.brand} · {formatCurrency(item.price)}</small></span>
                  </button>
                )) : <p>Không tìm thấy sản phẩm phù hợp.</p>}
              </div>
            )}
          </form>
          <div className="header-actions">
            <Link className="header-action favorite-action" to="/favorites">
              <FiHeart />
              <span><small>Đã lưu</small><strong>Yêu thích</strong></span>
              {wishlistCount > 0 && <b>{wishlistCount}</b>}
            </Link>
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
            <NavLink to="/compare">So sánh</NavLink>
            <NavLink to="/reviews">Đánh giá</NavLink>
            <NavLink to="/contact">Liên hệ</NavLink>
            {user?.role === 'admin' && <NavLink to="/admin/dashboard">Quản trị</NavLink>}
            {isAuthenticated && <button className="nav-logout" onClick={logout}>Đăng xuất</button>}
          </div>
        </nav>
      </header>
      <div className={`mobile-drawer ${mobileOpen ? 'open' : ''}`}>
        <div className="mobile-drawer-header">
          <StoreBrand onClick={() => setMobileOpen(false)} />
          <button onClick={() => setMobileOpen(false)} aria-label="Đóng menu"><FiX /></button>
        </div>
        <form className="mobile-search" onSubmit={submitSearch}>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm sản phẩm..." />
          <button><FiSearch /></button>
        </form>
        <nav aria-label="Điều hướng di động">
          <NavLink to="/" onClick={() => setMobileOpen(false)}>Trang chủ</NavLink>
          <NavLink to="/products" onClick={() => setMobileOpen(false)}>Điện thoại</NavLink>
          <NavLink to="/accessories" onClick={() => setMobileOpen(false)}>Phụ kiện</NavLink>
          <NavLink to="/compare" onClick={() => setMobileOpen(false)}>So sánh sản phẩm</NavLink>
          <NavLink to="/reviews" onClick={() => setMobileOpen(false)}>Đánh giá</NavLink>
          <NavLink to="/favorites" onClick={() => setMobileOpen(false)}>Sản phẩm yêu thích ({wishlistCount})</NavLink>
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
