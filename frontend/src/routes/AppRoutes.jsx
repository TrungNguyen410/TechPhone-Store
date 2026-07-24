import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import AdminRoute from '../components/auth/AdminRoute';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import Footer from '../components/common/Footer';
import Header from '../components/common/Header';
import Accessories from '../pages/Accessories';
import AccessoryDetail from '../pages/AccessoryDetail';
import Account from '../pages/Account';
import Cart from '../pages/Cart';
import Checkout from '../pages/Checkout';
import Contact from '../pages/Contact';
import Favorites from '../pages/Favorites';
import ForgotPassword from '../pages/ForgotPassword';
import Home from '../pages/Home';
import Login from '../pages/Login';
import NotFound from '../pages/NotFound';
import OrderSuccess from '../pages/OrderSuccess';
import ProductDetail from '../pages/ProductDetail';
import Products from '../pages/Products';
import Register from '../pages/Register';
import Reviews from '../pages/Reviews';
import AccessoryManagement from '../pages/admin/AccessoryManagement';
import AdminLayout from '../pages/admin/AdminLayout';
import BannerManagement from '../pages/admin/BannerManagement';
import BrandManagement from '../pages/admin/BrandManagement';
import CategoryManagement from '../pages/admin/CategoryManagement';
import ContactManagement from '../pages/admin/ContactManagement';
import CustomerManagement from '../pages/admin/CustomerManagement';
import Dashboard from '../pages/admin/Dashboard';
import OrderManagement from '../pages/admin/OrderManagement';
import ProductManagement from '../pages/admin/ProductManagement';
import ReviewManagement from '../pages/admin/ReviewManagement';
import SettingManagement from '../pages/admin/SettingManagement';
import VoucherManagement from '../pages/admin/VoucherManagement';

function StoreLayout() {
  return (
    <div className="store-layout">
      <Header />
      <div className="store-content"><Outlet /></div>
      <Footer />
    </div>
  );
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<StoreLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route path="/accessories" element={<Accessories />} />
        <Route path="/accessories/:id" element={<AccessoryDetail />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
        <Route path="/order-success/:orderId" element={<OrderSuccess />} />
        <Route path="/reviews" element={<Reviews />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/order-lookup" element={<Navigate to="/account?tab=orders" replace />} />
        <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route
        path="/admin"
        element={<AdminRoute><AdminLayout /></AdminRoute>}
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="products" element={<ProductManagement />} />
        <Route path="accessories" element={<AccessoryManagement />} />
        <Route path="orders" element={<OrderManagement />} />
        <Route path="customers" element={<CustomerManagement />} />
        <Route path="contacts" element={<ContactManagement />} />
        <Route path="reviews" element={<ReviewManagement />} />
        <Route path="banners" element={<BannerManagement />} />
        <Route path="vouchers" element={<VoucherManagement />} />
        <Route path="categories" element={<CategoryManagement />} />
        <Route path="brands" element={<BrandManagement />} />
        <Route path="settings" element={<SettingManagement />} />
      </Route>
    </Routes>
  );
}
