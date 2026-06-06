import { FiArrowRight, FiShield } from 'react-icons/fi';
import { formatCurrency } from '../../utils/formatCurrency';
import VoucherBox from './VoucherBox';

export default function CartSummary({ subtotal, shippingFee, discount, total, onCheckout, checkoutLabel = 'Tiến hành thanh toán' }) {
  return (
    <aside className="cart-summary panel">
      <h3>Tóm tắt đơn hàng</h3>
      <VoucherBox />
      <div className="summary-lines">
        <div><span>Tạm tính</span><strong>{formatCurrency(subtotal)}</strong></div>
        <div><span>Phí vận chuyển</span><strong>{shippingFee ? formatCurrency(shippingFee) : 'Miễn phí'}</strong></div>
        <div className="discount-line"><span>Giảm giá</span><strong>-{formatCurrency(discount)}</strong></div>
      </div>
      <div className="summary-total"><span>Tổng thanh toán</span><strong>{formatCurrency(total)}</strong></div>
      <button className="btn btn-primary checkout-button" onClick={onCheckout}>
        {checkoutLabel} <FiArrowRight />
      </button>
      <p className="secure-note"><FiShield /> Thanh toán an toàn và bảo mật</p>
    </aside>
  );
}
