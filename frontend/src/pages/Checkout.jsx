import { useMemo, useRef, useState } from 'react';
import { FiCheckCircle, FiCreditCard, FiMapPin, FiPackage, FiUser } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { orderApi } from '../api/orderApi';
import EmptyState from '../components/common/EmptyState';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';
import { PAYMENT_METHODS } from '../utils/constants';
import { formatCurrency } from '../utils/formatCurrency';
import { isValidEmail, isValidVietnamesePhone, validateRequired } from '../utils/validators';

const BANK_TRANSFER = {
  bankName: 'Vietcombank Demo',
  bankBin: '970436',
  accountNumber: '0000000000',
  accountName: 'TECHPHONE STORE DEMO',
  branch: 'Tai khoan demo de test',
};

const paymentHint = (method) => {
  if (method === 'cod') return 'Thanh toán trực tiếp cho nhân viên giao hàng';
  if (method === 'bank') return 'Quét mã QR và xác nhận đã chuyển khoản trước khi đặt hàng';
  if (method === 'momo') return 'Quét mã MoMo và xác nhận thanh toán trước khi đặt hàng';
  return 'Xác nhận thanh toán thẻ giả lập trước khi đặt hàng';
};
const PAYMENT_CONFIRM_METHODS = ['bank', 'momo', 'card'];

export default function Checkout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const cart = useCart();
  const [form, setForm] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '',
    note: '',
    paymentMethod: 'cod',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [paymentConfirmStep, setPaymentConfirmStep] = useState(false);
  const [cardDetails, setCardDetails] = useState({ number: '', expiry: '', cvv: '' });
  const [paymentReference] = useState(() => `TP${Date.now().toString().slice(-8)}`);
  const paymentConfirmRef = useRef(null);

  const transferContent = useMemo(
    () => `${paymentReference} ${form.phone || 'TECHPHONE'}`.trim().toUpperCase(),
    [form.phone, paymentReference],
  );

  const bankQrUrl = useMemo(() => {
    const params = new URLSearchParams({
      amount: String(cart.total),
      addInfo: transferContent,
      accountName: BANK_TRANSFER.accountName,
    });
    return `https://img.vietqr.io/image/${BANK_TRANSFER.bankBin}-${BANK_TRANSFER.accountNumber}-compact2.png?${params.toString()}`;
  }, [cart.total, transferContent]);
  const momoQrUrl = useMemo(() => `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(`MOMO|0900000000|${cart.total}|${transferContent}`)}`, [cart.total, transferContent]);

  if (cart.cartItems.length === 0) {
    return (
      <main className="page-shell">
        <div className="container narrow-page">
          <EmptyState title="Không có sản phẩm để thanh toán" actionLabel="Tiếp tục mua sắm" actionTo="/products" />
        </div>
      </main>
    );
  }

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: '' }));
    if (key === 'paymentMethod') setPaymentConfirmStep(false);
  };

  const validateCheckout = () => {
    const nextErrors = validateRequired({
      fullName: form.fullName,
      email: form.email,
      phone: form.phone,
      address: form.address,
    });
    if (form.email && !isValidEmail(form.email)) nextErrors.email = 'Email không đúng định dạng';
    if (form.phone && !isValidVietnamesePhone(form.phone)) nextErrors.phone = 'Số điện thoại Việt Nam phải có 10 số';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      toast.error('Vui lòng kiểm tra lại thông tin nhận hàng');
      return false;
    }
    return true;
  };

  const createOrder = async () => {
    setSubmitting(true);
    try {
      const order = await orderApi.create({
        userId: user?.id,
        items: cart.cartItems,
        customer: {
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
        },
        note: [
          form.note.trim(),
          form.paymentMethod === 'bank' ? `Ma chuyen khoan: ${transferContent}` : '',
          form.paymentMethod === 'momo' ? `Ma giao dich MoMo: ${transferContent}` : '',
          form.paymentMethod === 'card' ? 'Da xac nhan thanh toan the (demo)' : '',
        ]
          .filter(Boolean)
          .join('\n'),
        paymentMethod: form.paymentMethod,
        subtotal: cart.subtotal,
        shippingFee: cart.shippingFee,
        discount: cart.discount,
        total: cart.total,
        voucherCode: cart.voucher?.code || null,
      });
      cart.clearCart();
      navigate(`/order-success/${order.id}`, { state: { order }, replace: true });
    } catch (error) {
      toast.error(error.friendlyMessage || error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!validateCheckout()) return;

    if (PAYMENT_CONFIRM_METHODS.includes(form.paymentMethod) && !paymentConfirmStep) {
      setPaymentConfirmStep(true);
      toast.info('Hoàn tất thanh toán và bấm "Tôi đã thanh toán" để tạo đơn hàng.');
      requestAnimationFrame(() => paymentConfirmRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      return;
    }

    await createOrder();
  };

  return (
    <main className="page-shell checkout-page">
      <div className="container">
        <div className="page-hero small">
          <div><span>Chỉ còn một bước</span><h1>Hoàn tất đơn hàng</h1></div>
          <p>Kiểm tra thông tin trước khi xác nhận đặt hàng.</p>
        </div>
        <form className="checkout-layout" onSubmit={submit}>
          <div className="checkout-main">
            <section className="panel checkout-section">
              <h2><FiUser /> Thông tin người nhận</h2>
              <div className="form-grid">
                <label className="form-field">
                  <span>Họ và tên *</span>
                  <input value={form.fullName} onChange={(event) => update('fullName', event.target.value)} />
                  {errors.fullName && <small>{errors.fullName}</small>}
                </label>
                <label className="form-field">
                  <span>Số điện thoại *</span>
                  <input value={form.phone} onChange={(event) => update('phone', event.target.value)} />
                  {errors.phone && <small>{errors.phone}</small>}
                </label>
                <label className="form-field full">
                  <span>Email *</span>
                  <input type="email" value={form.email} onChange={(event) => update('email', event.target.value)} />
                  {errors.email && <small>{errors.email}</small>}
                </label>
                <label className="form-field full">
                  <span>Địa chỉ nhận hàng *</span>
                  <textarea rows="3" value={form.address} onChange={(event) => update('address', event.target.value)} />
                  {errors.address && <small>{errors.address}</small>}
                </label>
                <label className="form-field full">
                  <span>Ghi chú đơn hàng</span>
                  <textarea
                    rows="3"
                    value={form.note}
                    onChange={(event) => update('note', event.target.value)}
                    placeholder="Ví dụ: giao giờ hành chính"
                  />
                </label>
              </div>
            </section>

            <section className="panel checkout-section">
              <h2><FiCreditCard /> Phương thức thanh toán</h2>
              <div className="payment-options">
                {PAYMENT_METHODS.map((method) => (
                  <label className={form.paymentMethod === method.value ? 'active' : ''} key={method.value}>
                    <input
                      type="radio"
                      name="payment"
                      value={method.value}
                      checked={form.paymentMethod === method.value}
                      onChange={(event) => update('paymentMethod', event.target.value)}
                    />
                    <span><strong>{method.label}</strong><small>{paymentHint(method.value)}</small></span>
                  </label>
                ))}
              </div>
            </section>

            {paymentConfirmStep && form.paymentMethod === 'bank' && (
              <section className="panel checkout-section bank-transfer-section" ref={paymentConfirmRef}>
                <h2><FiCreditCard /> Thanh toán chuyển khoản</h2>
                <div className="bank-transfer-grid">
                  <div className="bank-qr-card">
                    <img src={bankQrUrl} alt="Mã QR chuyển khoản TechPhone" />
                  </div>
                  <div className="bank-transfer-info">
                    <span>Quét QR hoặc chuyển khoản thủ công</span>
                    <h3>{BANK_TRANSFER.bankName}</h3>
                    <div><small>Số tài khoản</small><strong>{BANK_TRANSFER.accountNumber}</strong></div>
                    <div><small>Chủ tài khoản</small><strong>{BANK_TRANSFER.accountName}</strong></div>
                    <div><small>Chi nhánh</small><strong>{BANK_TRANSFER.branch}</strong></div>
                    <div><small>Số tiền</small><strong>{formatCurrency(cart.total)}</strong></div>
                    <div><small>Nội dung chuyển khoản</small><strong>{transferContent}</strong></div>
                  </div>
                </div>
                <p className="bank-transfer-note">
                  Sau khi chuyển khoản, bấm <strong>Tôi đã chuyển khoản</strong> để hoàn tất đơn hàng.
                  Nhân viên TechPhone sẽ đối soát và xác nhận thanh toán.
                </p>
              </section>
            )}
            {paymentConfirmStep && form.paymentMethod === 'momo' && <section className="panel checkout-section bank-transfer-section" ref={paymentConfirmRef}><h2><FiCreditCard /> Thanh toán qua MoMo</h2><div className="bank-transfer-grid"><div className="bank-qr-card"><img src={momoQrUrl} alt="Mã QR thanh toán MoMo" /></div><div className="bank-transfer-info"><span>Quét mã trong ứng dụng MoMo</span><div><small>Số điện thoại nhận</small><strong>0900 000 000</strong></div><div><small>Số tiền</small><strong>{formatCurrency(cart.total)}</strong></div><div><small>Nội dung</small><strong>{transferContent}</strong></div></div></div><p className="bank-transfer-note">Sau khi thanh toán qua MoMo, bấm <strong>Tôi đã thanh toán</strong> để hoàn tất đơn hàng.</p></section>}
            {paymentConfirmStep && form.paymentMethod === 'card' && <section className="panel checkout-section bank-transfer-section" ref={paymentConfirmRef}><h2><FiCreditCard /> Thanh toán bằng thẻ</h2><div className="form-grid"><label className="form-field full"><span>Số thẻ</span><input inputMode="numeric" placeholder="4242 4242 4242 4242" value={cardDetails.number} onChange={(event) => setCardDetails((current) => ({ ...current, number: event.target.value }))} /></label><label className="form-field"><span>Ngày hết hạn</span><input placeholder="MM/YY" value={cardDetails.expiry} onChange={(event) => setCardDetails((current) => ({ ...current, expiry: event.target.value }))} /></label><label className="form-field"><span>CVV</span><input inputMode="numeric" placeholder="123" value={cardDetails.cvv} onChange={(event) => setCardDetails((current) => ({ ...current, cvv: event.target.value }))} /></label></div><p className="bank-transfer-note">Đây là form thẻ giả lập; thông tin thẻ không được lưu lại.</p></section>}
          </div>

          <aside className="panel checkout-order">
            <h2><FiPackage /> Đơn hàng ({cart.cartCount})</h2>
            <div className="checkout-items">
              {cart.cartItems.map((item) => (
                <div key={item.id}>
                  <img src={item.image} alt={item.name} />
                  <span><strong>{item.name}</strong><small>Số lượng: {item.quantity}</small></span>
                  <b>{formatCurrency(item.price * item.quantity)}</b>
                </div>
              ))}
            </div>
            <div className="summary-lines">
              <div><span>Tạm tính</span><strong>{formatCurrency(cart.subtotal)}</strong></div>
              <div><span>Phí vận chuyển</span><strong>{cart.shippingFee ? formatCurrency(cart.shippingFee) : 'Miễn phí'}</strong></div>
              <div className="discount-line"><span>Giảm giá</span><strong>-{formatCurrency(cart.discount)}</strong></div>
            </div>
            <div className="summary-total"><span>Tổng thanh toán</span><strong>{formatCurrency(cart.total)}</strong></div>
            <button className="btn btn-primary checkout-button" disabled={submitting}>
              {submitting
                ? 'Đang tạo đơn hàng...'
                : paymentConfirmStep
                  ? 'Tôi đã thanh toán'
                  : PAYMENT_CONFIRM_METHODS.includes(form.paymentMethod)
                    ? 'Tiếp tục thanh toán'
                    : 'Xác nhận đặt hàng'}
            </button>
            {paymentConfirmStep && (
              <>
                <button type="button" className="bank-edit-button" onClick={() => setPaymentConfirmStep(false)}>
                  Quay lại sửa thông tin
                </button>
                <p className="checkout-address-note">
                  <FiCheckCircle /> Chưa tạo đơn hàng cho tới khi bạn xác nhận đã thanh toán
                </p>
              </>
            )}
            <p className="checkout-address-note"><FiMapPin /> Giao đến địa chỉ bạn đã cung cấp</p>
          </aside>
        </form>
      </div>
    </main>
  );
}
