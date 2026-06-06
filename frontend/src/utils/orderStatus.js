export const ORDER_STATUS_MAP = {
  pending: { label: 'Chờ xác nhận', className: 'status-pending' },
  confirmed: { label: 'Đã xác nhận', className: 'status-confirmed' },
  shipping: { label: 'Đang giao hàng', className: 'status-shipping' },
  completed: { label: 'Hoàn thành', className: 'status-completed' },
  cancelled: { label: 'Đã hủy', className: 'status-cancelled' },
};

export const getOrderStatus = (status) => ORDER_STATUS_MAP[status] || ORDER_STATUS_MAP.pending;

export const ORDER_TIMELINE = ['pending', 'confirmed', 'shipping', 'completed'];
