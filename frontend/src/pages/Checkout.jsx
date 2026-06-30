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
  return 'Thông tin thanh toán sẽ được hướng dẫn sau khi đặt hàng';
};

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
  const [bankTransferStep, setBankTransferStep] = useState(false);
  const [paymentReference] = useState(() => `TP${Date.now().toString().slice(-8)}`);
  const bankTransferRef = useRef(null);

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
    if (key === 'paymentMethod') setBankTransferStep(false);
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
        note: [form.note.trim(), form.paymentMethod === 'bank' ? `Ma chuyen khoan: ${transferContent}` : '']
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

    if (form.paymentMethod === 'bank' && !bankTransferStep) {
      setBankTransferStep(true);
      toast.info('Vui lòng quét mã QR và bấm đã chuyển khoản sau khi thanh toán.');
      requestAnimationFrame(() => bankTransferRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
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

            {bankTransferStep && (
              <section className="panel checkout-section bank-transfer-section" ref={bankTransferRef}>
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
                : bankTransferStep
                  ? 'Tôi đã chuyển khoản'
                  : form.paymentMethod === 'bank'
                    ? 'Tiếp tục thanh toán'
                    : 'Xác nhận đặt hàng'}
            </button>
            {bankTransferStep && (
              <>
                <button type="button" className="bank-edit-button" onClick={() => setBankTransferStep(false)}>
                  Quay lại sửa thông tin
                </button>
                <p className="checkout-address-note">
                  <FiCheckCircle /> Chưa tạo đơn hàng cho tới khi bạn xác nhận đã chuyển khoản
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
