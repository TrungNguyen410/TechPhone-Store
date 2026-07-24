import { useEffect, useState } from 'react';
import { FiCheck, FiHome, FiPackage } from 'react-icons/fi';
import { Link, useLocation, useParams } from 'react-router-dom';
import { orderApi } from '../api/orderApi';
import EmptyState from '../components/common/EmptyState';
import Loading from '../components/common/Loading';
import { formatCurrency, formatDate } from '../utils/formatCurrency';
import { getOrderStatus } from '../utils/orderStatus';

export default function OrderSuccess() {
  const { orderId } = useParams();
  const location = useLocation();
  const [order, setOrder] = useState(location.state?.order || null);
  const [loading, setLoading] = useState(!location.state?.order);
  const [error, setError] = useState('');

  useEffect(() => {
    if (order) return undefined;
    let active = true;
    orderApi.getById(orderId)
      .then((data) => {
        if (active) setOrder(data);
      })
      .catch((requestError) => {
        if (active) setError(requestError.friendlyMessage || requestError.message || 'Không tìm thấy đơn hàng');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [order, orderId]);

  if (loading) return <Loading />;
  if (!order) {
    return (
      <main className="page-shell">
        <div className="container narrow-page">
          <EmptyState
            title="Không tìm thấy đơn hàng"
            description={error || 'Đơn hàng không tồn tại hoặc đường dẫn xác nhận không còn hợp lệ.'}
            actionLabel="Đến đơn hàng của tôi"
            actionTo="/account?tab=orders"
          />
        </div>
      </main>
    );
  }
  const status = getOrderStatus(order.status);

  return (
    <main className="page-shell success-page">
      <div className="container narrow-page">
        <section className="success-card panel">
          <div className="success-icon"><FiCheck /></div>
          <span className="eyebrow">Đặt hàng thành công</span>
          <h1>Cảm ơn bạn đã mua sắm!</h1>
          <p>Đơn hàng đã được tiếp nhận. TechPhone sẽ liên hệ xác nhận trong thời gian sớm nhất.</p>
          <div className="order-highlight">
            <div><small>Mã đơn hàng</small><strong>{order.orderNumber}</strong></div>
            <div><small>Ngày đặt</small><strong>{formatDate(order.createdAt, true)}</strong></div>
            <div><small>Trạng thái</small><span className={`status-badge ${status.className}`}>{status.label}</span></div>
          </div>
          <div className="success-details">
            <div><h3>Thông tin người nhận</h3><p>{order.customer.fullName}</p><p>{order.customer.phone}</p><p>{order.customer.email}</p><p>{order.customer.address}</p></div>
            <div><h3>Sản phẩm</h3>{order.items.map((item) => <p key={item.id}>{item.name} <strong>x{item.quantity}</strong></p>)}</div>
          </div>
          <div className="success-total"><span>Tổng thanh toán</span><strong>{formatCurrency(order.total)}</strong></div>
          <div className="success-actions">
            <Link className="btn btn-light" to="/"><FiHome /> Về trang chủ</Link>
            <Link className="btn btn-primary" to="/account?tab=orders"><FiPackage /> Xem đơn hàng</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
