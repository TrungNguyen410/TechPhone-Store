import { FiBell, FiMenu, FiSearch } from 'react-icons/fi';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const titles = {
  dashboard: 'Tổng quan hệ thống',
  products: 'Quản lý sản phẩm',
  accessories: 'Quản lý phụ kiện',
  orders: 'Quản lý đơn hàng',
  customers: 'Quản lý khách hàng',
  reviews: 'Quản lý đánh giá',
  banners: 'Quản lý banner',
  vouchers: 'Quản lý voucher',
  categories: 'Quản lý danh mục',
  brands: 'Quản lý thương hiệu',
  settings: 'Cài đặt hệ thống',
};

export default function AdminHeader({ onMenu }) {
  const location = useLocation();
  const { user } = useAuth();
  const page = location.pathname.split('/').pop();
  return (
    <header className="admin-header">
      <div>
        <button className="admin-menu-button" onClick={onMenu}><FiMenu /></button>
        <div><small>TechPhone Admin</small><h1>{titles[page] || 'Quản trị'}</h1></div>
      </div>
      <div className="admin-header-actions">
        <button className="admin-search-button"><FiSearch /></button>
        <button className="notification-button"><FiBell /><span /></button>
        <div className="admin-profile"><div>{user?.fullName?.charAt(0)}</div><span><strong>{user?.fullName}</strong><small>Quản trị viên</small></span></div>
      </div>
    </header>
  );
}
