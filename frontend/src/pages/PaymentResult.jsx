import { FiAlertCircle, FiCheckCircle, FiClock, FiSearch } from 'react-icons/fi';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCart } from '../hooks/useCart';

const PENDING_PAYMENT_KEY = 'techphone_pending_payment';
const PENDING_PAYMENT_MAX_AGE = 2 * 60 * 60 * 1000;

const readPendingPayment = () => {
  try {
    const value = JSON.parse(sessionStorage.getItem(PENDING_PAYMENT_KEY) || 'null');
    return value && typeof value === 'object' ? value : null;
  } catch {
    return null;
  }
};

export default function PaymentResult() {
  const { clearCart } = useCart();
  const [searchParams] = useSearchParams();
  const valid = searchParams.get('valid') === 'true';
  const responseCode = searchParams.get('code');
  const mock = searchParams.get('mock') === 'true';
  const reference = searchParams.get('reference') || '';
  const [renderedAt] = useState(Date.now);
  const pending = readPendingPayment();
  const accepted = valid && responseCode === '00';
  const pendingAge = renderedAt - Number(pending?.createdAt);
  const pendingIsFresh = Boolean(
    pending?.orderId
      && pending.reference === reference
      && Number.isFinite(Number(pending.createdAt))
      && pendingAge >= 0
      && pendingAge <= PENDING_PAYMENT_MAX_AGE,
  );
  const completedCheckout = accepted && pendingIsFresh;

  useEffect(() => {
    if (!completedCheckout) return;
    clearCart();
    try {
      sessionStorage.removeItem(PENDING_PAYMENT_KEY);
    } catch {
      // The verified result remains usable when browser storage is unavailable.
    }
  }, [clearCart, completedCheckout]);

  const icon = accepted ? (mock ? <FiCheckCircle /> : <FiClock />) : <FiAlertCircle />;
  const title = accepted
    ? mock
      ? 'Thanh toán mô phỏng thành công'
      : 'VNPay đã tiếp nhận giao dịch'
    : 'Giao dịch chưa hoàn tất';
  const description = accepted
    ? mock
      ? 'Chế độ dữ liệu mẫu đã hoàn tất luồng thanh toán.'
      : 'TechPhone đang chờ VNPay gửi xác nhận máy chủ. Trạng thái đơn sẽ tự cập nhật sau khi đối soát.'
    : valid
      ? 'VNPay không ghi nhận thanh toán thành công. Bạn có thể tra cứu đơn và chọn lại phương thức thanh toán.'
      : 'Chữ ký phản hồi không hợp lệ. Không có đơn hàng nào được đánh dấu đã thanh toán.';

  return (
    <main className="page-shell payment-result-page">
      <div className="container narrow-page">
        <section className={`panel payment-result-card ${accepted ? 'is-accepted' : 'is-failed'}`}>
          <div className="payment-result-icon" aria-hidden="true">{icon}</div>
          <span className="eyebrow">Kết quả VNPay</span>
          <h1>{title}</h1>
          <p>{description}</p>
          <dl className="payment-result-reference">
            <div><dt>Mã giao dịch</dt><dd>{reference || 'Không có'}</dd></div>
            {pending?.orderNumber && <div><dt>Mã đơn hàng</dt><dd>{pending.orderNumber}</dd></div>}
          </dl>
          <div className="success-actions">
            <Link className="btn btn-primary" to="/order-lookup"><FiSearch /> Tra cứu đơn</Link>
            <Link className="btn btn-light" to={completedCheckout ? '/products' : '/checkout'}>
              {completedCheckout ? 'Tiếp tục mua sắm' : 'Thử lại thanh toán'}
            </Link>
          </div>
          <p className="payment-result-help">
            Nếu tài khoản đã bị trừ tiền nhưng đơn chưa cập nhật, hãy giữ lại mã giao dịch và liên hệ TechPhone.
          </p>
        </section>
      </div>
    </main>
  );
}
