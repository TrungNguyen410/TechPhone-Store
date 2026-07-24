import { useCallback, useEffect, useState } from 'react';
import { FiEye, FiLock, FiLogOut, FiPackage, FiRefreshCcw, FiUser, FiXCircle } from 'react-icons/fi';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { orderApi } from '../api/orderApi';
import ConfirmModal from '../components/common/ConfirmModal';
import EmptyState from '../components/common/EmptyState';
import Loading from '../components/common/Loading';
import OrderLookupPanel from '../components/order/OrderLookupPanel';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';
import { formatCurrency, formatDate } from '../utils/formatCurrency';
import { getOrderStatus } from '../utils/orderStatus';
import { isStrongEnoughPassword, isValidEmail, isValidVietnamesePhone, validateRequired } from '../utils/validators';

export default function Account() {
  const [searchParams] = useSearchParams();
  const { user, updateProfile, changePassword, logout } = useAuth();
  const { addToCart } = useCart();
  const [tab, setTab] = useState(searchParams.get('tab') || 'profile');
  const [profile, setProfile] = useState({ fullName: user.fullName, email: user.email, phone: user.phone, address: user.address || '' });
  const [profileErrors, setProfileErrors] = useState({});
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [cancelOrderId, setCancelOrderId] = useState(null);

  useEffect(() => {
    const requestedTab = searchParams.get('tab');
    if (['profile', 'orders', 'password'].includes(requestedTab)) setTab(requestedTab);
  }, [searchParams]);

  const loadOrders = useCallback(
    () => orderApi.getMyOrders(user.id).then(setOrders).finally(() => setLoadingOrders(false)),
    [user.id],
  );
  useEffect(() => { loadOrders(); }, [loadOrders]);

  const saveProfile = async (event) => {
    event.preventDefault();
    const nextErrors = validateRequired({
      fullName: profile.fullName,
      email: profile.email,
      phone: profile.phone,
    });
    if (profile.email && !isValidEmail(profile.email)) nextErrors.email = 'Email không đúng định dạng';
    if (profile.phone && !isValidVietnamesePhone(profile.phone)) nextErrors.phone = 'Số điện thoại Việt Nam phải có 10 số';
    setProfileErrors(nextErrors);
    if (Object.keys(nextErrors).length) return toast.error('Vui lòng kiểm tra lại thông tin cá nhân');
    try {
      await updateProfile({
        ...profile,
        fullName: profile.fullName.trim(),
        email: profile.email.trim(),
        phone: profile.phone.trim(),
        address: profile.address.trim(),
      });
      toast.success('Đã cập nhật thông tin cá nhân');
    } catch (error) {
      toast.error(error.friendlyMessage || error.message);
    }
  };
  const updateProfileField = (key, value) => {
    setProfile((current) => ({ ...current, [key]: value }));
    setProfileErrors((current) => ({ ...current, [key]: '' }));
  };
  const savePassword = async (event) => {
    event.preventDefault();
    if (!isStrongEnoughPassword(passwords.newPassword)) return toast.error('Mật khẩu mới cần ít nhất 6 ký tự');
    if (passwords.newPassword !== passwords.confirmPassword) return toast.error('Mật khẩu xác nhận không khớp');
    try {
      await changePassword(passwords);
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Đổi mật khẩu thành công');
    } catch (error) {
      toast.error(error.message);
    }
  };
  const cancelOrder = async () => {
    await orderApi.cancel(cancelOrderId);
    setCancelOrderId(null);
    loadOrders();
    toast.success('Đã hủy đơn hàng');
  };
  const reorder = (order) => {
    order.items.forEach((item) => addToCart({ ...item, stock: 99 }, item.quantity, item.type));
    toast.success('Đã thêm lại sản phẩm vào giỏ hàng');
  };

  return (
    <main className="page-shell account-page">
      <div className="container">
        <div className="page-title-row"><div><span className="eyebrow">Khu vực thành viên</span><h1>Tài khoản của tôi</h1></div></div>
        <div className="account-layout">
          <aside className="account-sidebar panel">
            <div className="account-user"><div>{(user.fullName || user.email || '?').charAt(0)}</div><span><strong>{user.fullName}</strong><small>{user.email}</small></span></div>
            <button className={tab === 'profile' ? 'active' : ''} onClick={() => setTab('profile')}><FiUser /> Thông tin cá nhân</button>
            <button className={tab === 'orders' ? 'active' : ''} onClick={() => setTab('orders')}><FiPackage /> Đơn hàng của tôi</button>
            <button className={tab === 'password' ? 'active' : ''} onClick={() => setTab('password')}><FiLock /> Đổi mật khẩu</button>
            <button className="logout" onClick={logout}><FiLogOut /> Đăng xuất</button>
          </aside>
          <section className="account-content panel">
            {tab === 'profile' && (
              <form onSubmit={saveProfile}>
                <div className="content-heading"><h2>Thông tin cá nhân</h2><p>Cập nhật thông tin dùng cho đơn hàng và liên hệ.</p></div>
                <div className="form-grid">
                  <label className="form-field"><span>Họ và tên *</span><input value={profile.fullName} onChange={(event) => updateProfileField('fullName', event.target.value)} />{profileErrors.fullName && <small>{profileErrors.fullName}</small>}</label>
                  <label className="form-field"><span>Số điện thoại *</span><input value={profile.phone} onChange={(event) => updateProfileField('phone', event.target.value)} />{profileErrors.phone && <small>{profileErrors.phone}</small>}</label>
                  <label className="form-field full"><span>Email *</span><input type="email" value={profile.email} onChange={(event) => updateProfileField('email', event.target.value)} />{profileErrors.email && <small>{profileErrors.email}</small>}</label>
                  <label className="form-field full"><span>Địa chỉ</span><textarea rows="3" value={profile.address} onChange={(event) => updateProfileField('address', event.target.value)} /></label>
                </div>
                <button className="btn btn-primary">Lưu thay đổi</button>
              </form>
            )}
            {tab === 'orders' && (
              <div>
                <div className="content-heading"><h2>Đơn hàng của tôi</h2><p>Theo dõi trạng thái và xem lại lịch sử mua sắm.</p></div>
                <OrderLookupPanel initialPhone={user.phone} />
                {loadingOrders ? <Loading /> : orders.length === 0 ? <EmptyState title="Bạn chưa có đơn hàng" actionLabel="Mua sắm ngay" actionTo="/products" /> : (
                  <div className="account-orders">
                    {orders.map((order) => {
                      const status = getOrderStatus(order.status);
                      return (
                        <article key={order.id}>
                          <div className="order-card-head"><span><small>Mã đơn</small><strong>{order.orderNumber}</strong></span><span><small>Ngày đặt</small><strong>{formatDate(order.createdAt)}</strong></span><span className={`status-badge ${status.className}`}>{status.label}</span></div>
                          <div className="order-preview"><img src={order.items[0].image} alt="" /><div><strong>{order.items[0].name}</strong><small>{order.items.length > 1 ? `và ${order.items.length - 1} sản phẩm khác` : `${order.items[0].quantity} sản phẩm`}</small></div><b>{formatCurrency(order.total)}</b></div>
                          <div className="order-card-actions"><button onClick={() => setSelectedOrder(order)}><FiEye /> Chi tiết</button><button onClick={() => reorder(order)}><FiRefreshCcw /> Đặt lại</button>{['pending', 'confirmed'].includes(order.status) && <button className="danger" onClick={() => setCancelOrderId(order.id)}><FiXCircle /> Hủy đơn</button>}</div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            {tab === 'password' && (
              <form onSubmit={savePassword}>
                <div className="content-heading"><h2>Đổi mật khẩu</h2><p>Sử dụng mật khẩu có ít nhất 6 ký tự để bảo vệ tài khoản.</p></div>
                <div className="password-form">
                  <label className="form-field"><span>Mật khẩu hiện tại</span><input type="password" value={passwords.currentPassword} onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })} required /></label>
                  <label className="form-field"><span>Mật khẩu mới</span><input type="password" value={passwords.newPassword} onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })} required /></label>
                  <label className="form-field"><span>Xác nhận mật khẩu mới</span><input type="password" value={passwords.confirmPassword} onChange={(event) => setPasswords({ ...passwords, confirmPassword: event.target.value })} required /></label>
                </div>
                <button className="btn btn-primary">Cập nhật mật khẩu</button>
              </form>
            )}
          </section>
        </div>
      </div>
      {selectedOrder && (
        <div className="modal-backdrop-custom" onMouseDown={() => setSelectedOrder(null)}>
          <div className="order-detail-modal" onMouseDown={(event) => event.stopPropagation()}>
            <button className="icon-button modal-close" onClick={() => setSelectedOrder(null)}>×</button>
            <h2>Chi tiết đơn {selectedOrder.orderNumber}</h2>
            {selectedOrder.items.map((item) => <div className="modal-order-item" key={item.id}><img src={item.image} alt={item.name} /><span><strong>{item.name}</strong><small>{formatCurrency(item.price)} × {item.quantity}</small></span><b>{formatCurrency(item.price * item.quantity)}</b></div>)}
            <div className="success-total"><span>Tổng thanh toán</span><strong>{formatCurrency(selectedOrder.total)}</strong></div>
          </div>
        </div>
      )}
      <ConfirmModal open={Boolean(cancelOrderId)} title="Hủy đơn hàng?" message="Đơn hàng sẽ được chuyển sang trạng thái đã hủy và không thể khôi phục." onCancel={() => setCancelOrderId(null)} onConfirm={cancelOrder} />
    </main>
  );
}
