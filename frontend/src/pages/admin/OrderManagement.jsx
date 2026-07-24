import { useEffect, useMemo, useState } from 'react';
import { FiEye, FiSearch } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { orderApi } from '../../api/orderApi';
import DataTable from '../../components/admin/DataTable';
import Loading from '../../components/common/Loading';
import { ORDER_STATUSES, PAYMENT_METHODS } from '../../utils/constants';
import { formatCurrency, formatDate } from '../../utils/formatCurrency';
import { getOrderStatus } from '../../utils/orderStatus';

const paymentMethodLabel = (value) => PAYMENT_METHODS.find((method) => method.value === value)?.label || value;

export default function OrderManagement() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const load = () => orderApi.getAllAdmin().then(setOrders).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const visible = useMemo(() => orders.filter((order) =>
    (!search || `${order.orderNumber} ${order.customer.phone} ${order.customer.fullName}`.toLowerCase().includes(search.toLowerCase())) &&
    (!statusFilter || order.status === statusFilter)
  ), [orders, search, statusFilter]);
  const updateStatus = async (order, status) => {
    await orderApi.updateStatus(order.id, status);
    toast.success(`Đã cập nhật đơn ${order.orderNumber}`);
    load();
  };
  const columns = [
    { key: 'orderNumber', label: 'Mã đơn', render: (order) => <strong>{order.orderNumber}</strong> },
    { key: 'customer', label: 'Khách hàng', render: (order) => <span>{order.customer.fullName}<small className="table-subtext">{order.customer.phone}</small></span> },
    { key: 'createdAt', label: 'Ngày đặt', render: (order) => formatDate(order.createdAt, true) },
    { key: 'items', label: 'Sản phẩm', render: (order) => `${order.items.reduce((sum, item) => sum + item.quantity, 0)} sản phẩm` },
    { key: 'total', label: 'Tổng tiền', render: (order) => <strong>{formatCurrency(order.total)}</strong> },
    { key: 'paymentMethod', label: 'Thanh toán', render: (order) => <span className="payment-method-badge">{paymentMethodLabel(order.paymentMethod)}</span> },
    { key: 'status', label: 'Trạng thái', render: (order) => <select className={`status-select ${getOrderStatus(order.status).className}`} value={order.status} onChange={(event) => updateStatus(order, event.target.value)}>{ORDER_STATUSES.map((status) => <option value={status} key={status}>{getOrderStatus(status).label}</option>)}</select> },
    { key: 'actions', label: '', render: (order) => <button className="table-view-button" onClick={() => setSelectedOrder(order)}><FiEye /></button> },
  ];
  if (loading) return <Loading />;
  return (
    <>
      <div className="admin-page-toolbar"><div className="admin-search"><FiSearch /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm mã đơn, khách hàng, số điện thoại..." /></div><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">Tất cả trạng thái</option>{ORDER_STATUSES.map((status) => <option value={status} key={status}>{getOrderStatus(status).label}</option>)}</select></div>
      <div className="admin-table-card"><div className="admin-table-title"><div><h2>Danh sách đơn hàng</h2><span>{visible.length} đơn hàng</span></div></div><DataTable columns={columns} rows={visible} /></div>
      {selectedOrder && <div className="modal-backdrop-custom" onMouseDown={() => setSelectedOrder(null)}><div className="order-detail-modal admin-order-modal" onMouseDown={(event) => event.stopPropagation()}><button className="icon-button modal-close" onClick={() => setSelectedOrder(null)}>×</button><span className="eyebrow">Chi tiết đơn hàng</span><h2>{selectedOrder.orderNumber}</h2><div className="admin-order-customer"><div><small>Khách hàng</small><strong>{selectedOrder.customer.fullName}</strong><span>{selectedOrder.customer.phone}</span></div><div><small>Địa chỉ giao hàng</small><strong>{selectedOrder.customer.address}</strong></div><div><small>Phương thức thanh toán</small><strong>{paymentMethodLabel(selectedOrder.paymentMethod)}</strong></div></div>{selectedOrder.items.map((item) => <div className="modal-order-item" key={item.id}><img src={item.image} alt="" /><span><strong>{item.name}</strong><small>{formatCurrency(item.price)} × {item.quantity}</small></span><b>{formatCurrency(item.price * item.quantity)}</b></div>)}<div className="success-total"><span>Tổng thanh toán</span><strong>{formatCurrency(selectedOrder.total)}</strong></div></div></div>}
    </>
  );
}
