import { useState } from 'react';
import { FiKey, FiLock, FiMail, FiPhone } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { authApi } from '../api/authApi';
import { isStrongEnoughPassword } from '../utils/validators';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState('request');
  const [form, setForm] = useState({
    identifier: '',
    channel: 'email',
    otp: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [deliveryTarget, setDeliveryTarget] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const requestOtp = async (event) => {
    event.preventDefault();
    if (!form.identifier.trim()) return toast.error('Vui lòng nhập email hoặc số điện thoại');
    setLoading(true);
    try {
      const result = await authApi.requestPasswordReset({
        identifier: form.identifier.trim(),
        channel: form.channel,
      });
      setDeliveryTarget(result.deliveryTarget || form.identifier);
      setStep('reset');
      toast.success(result.debugOtp ? `Mã OTP thử nghiệm: ${result.debugOtp}` : 'Nếu tài khoản tồn tại, mã OTP đã được gửi');
    } catch (error) {
      toast.error(error.friendlyMessage || error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (event) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(form.otp)) return toast.error('Mã OTP phải gồm 6 chữ số');
    if (!isStrongEnoughPassword(form.newPassword)) return toast.error('Mật khẩu mới cần ít nhất 6 ký tự');
    if (form.newPassword !== form.confirmPassword) return toast.error('Mật khẩu xác nhận không khớp');
    setLoading(true);
    try {
      await authApi.resetPassword({
        identifier: form.identifier.trim(),
        channel: form.channel,
        otp: form.otp,
        newPassword: form.newPassword,
      });
      toast.success('Đặt lại mật khẩu thành công');
      navigate('/login', { replace: true });
    } catch (error) {
      toast.error(error.friendlyMessage || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-visual">
        <div><FiKey /><h1>Khôi phục tài khoản<br />an toàn bằng OTP</h1><p>Mã chỉ có hiệu lực trong 10 phút và được dùng một lần.</p></div>
      </div>
      <div className="auth-panel">
        <Link className="brand" to="/"><span className="brand-mark">T</span><span>Tech<span>Phone</span></span></Link>
        <form className="auth-form" onSubmit={step === 'request' ? requestOtp : resetPassword}>
          <span className="eyebrow">Bảo mật tài khoản</span>
          <h1>{step === 'request' ? 'Quên mật khẩu' : 'Tạo mật khẩu mới'}</h1>
          <p>{step === 'request' ? 'Chọn nơi nhận mã OTP rồi nhập thông tin tài khoản.' : `Nhập mã đã gửi đến ${deliveryTarget}.`}</p>
          {step === 'request' ? (
            <>
              <div className="otp-channel-options">
                <label><input type="radio" name="channel" value="email" checked={form.channel === 'email'} onChange={() => update('channel', 'email')} /><FiMail /> Nhận qua email</label>
                <label><input type="radio" name="channel" value="sms" checked={form.channel === 'sms'} onChange={() => update('channel', 'sms')} /><FiPhone /> Nhận qua SMS</label>
              </div>
              <label className="input-with-icon">
                <span>{form.channel === 'email' ? 'Email tài khoản' : 'Số điện thoại tài khoản'}</span>
                <div>{form.channel === 'email' ? <FiMail /> : <FiPhone />}<input value={form.identifier} onChange={(event) => update('identifier', event.target.value)} /></div>
              </label>
            </>
          ) : (
            <>
              <label className="input-with-icon otp-input"><span>Mã OTP</span><div><FiKey /><input inputMode="numeric" maxLength="6" value={form.otp} onChange={(event) => update('otp', event.target.value.replace(/\D/g, ''))} placeholder="••••••" /></div></label>
              <label className="input-with-icon"><span>Mật khẩu mới</span><div><FiLock /><input type="password" value={form.newPassword} onChange={(event) => update('newPassword', event.target.value)} /></div></label>
              <label className="input-with-icon"><span>Xác nhận mật khẩu mới</span><div><FiLock /><input type="password" value={form.confirmPassword} onChange={(event) => update('confirmPassword', event.target.value)} /></div></label>
              <button type="button" className="auth-text-button" onClick={() => setStep('request')}>Gửi lại hoặc đổi phương thức nhận mã</button>
            </>
          )}
          <button className="btn btn-primary auth-submit" disabled={loading}>{loading ? 'Đang xử lý...' : step === 'request' ? 'Gửi mã OTP' : 'Đặt lại mật khẩu'}</button>
          <p className="auth-switch"><Link to="/login">Quay lại đăng nhập</Link></p>
        </form>
      </div>
    </main>
  );
}
