import { FiAlertCircle, FiCheckCircle, FiClock, FiSearch } from 'react-icons/fi';
import { Link, useSearchParams } from 'react-router-dom';

export default function PaymentResult() {
  const [searchParams] = useSearchParams();
  const valid = searchParams.get('valid') === 'true';
  const responseCode = searchParams.get('code');
  const mock = searchParams.get('mock') === 'true';
  const reference = searchParams.get('reference') || '';
  const pending = JSON.parse(sessionStorage.getItem('techphone_pending_payment') || 'null');
  const accepted = valid && responseCode === '00';

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
            <Link className="btn btn-light" to="/products">Tiếp tục mua sắm</Link>
          </div>
          <p className="payment-result-help">
            Nếu tài khoản đã bị trừ tiền nhưng đơn chưa cập nhật, hãy giữ lại mã giao dịch và liên hệ TechPhone.
          </p>
        </section>
      </div>
    </main>
  );
}
