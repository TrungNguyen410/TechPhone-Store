import { useState } from 'react';
import { FiLock, FiMail, FiPhone, FiUserPlus } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../hooks/useAuth';
import { isStrongEnoughPassword, isValidEmail, isValidVietnamesePhone, validateRequired } from '../utils/validators';

export default function Register() {
  const navigate = useNavigate();
  const { register, logout } = useAuth();
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const update = (key, value) => {
    setForm({ ...form, [key]: value });
    setErrors({ ...errors, [key]: '' });
  };

  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = validateRequired(form);
    if (form.email && !isValidEmail(form.email)) nextErrors.email = 'Email không đúng định dạng';
    if (form.phone && !isValidVietnamesePhone(form.phone)) nextErrors.phone = 'Số điện thoại phải có 10 số';
    if (form.password && !isStrongEnoughPassword(form.password)) nextErrors.password = 'Mật khẩu cần ít nhất 6 ký tự';
    if (form.password !== form.confirmPassword) nextErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return toast.error('Vui lòng kiểm tra thông tin đăng ký');
    setLoading(true);
    try {
      const { confirmPassword: _confirmPassword, ...payload } = form;
      await register(payload);
      logout();
      toast.success('Đăng ký thành công. Vui lòng đăng nhập!');
      navigate('/login', { replace: true });
    } catch (error) {
      toast.error(error.friendlyMessage || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page register-page">
      <div className="auth-visual"><div><FiUserPlus /><h1>Gia nhập cộng đồng<br />TechPhone</h1><p>Theo dõi đơn hàng, nhận ưu đãi và chăm sóc cá nhân hóa.</p></div></div>
      <div className="auth-panel">
        <Link className="brand" to="/"><span className="brand-mark">T</span><span>Tech<span>Phone</span></span></Link>
        <form className="auth-form" onSubmit={submit}>
          <span className="eyebrow">Tạo tài khoản mới</span><h1>Đăng ký thành viên</h1><p>Chỉ mất một phút để bắt đầu.</p>
          <label className="input-with-icon"><span>Họ và tên</span><div><FiUserPlus /><input value={form.fullName} onChange={(event) => update('fullName', event.target.value)} /></div>{errors.fullName && <small>{errors.fullName}</small>}</label>
          <div className="auth-two-columns">
            <label className="input-with-icon"><span>Email</span><div><FiMail /><input value={form.email} onChange={(event) => update('email', event.target.value)} /></div>{errors.email && <small>{errors.email}</small>}</label>
            <label className="input-with-icon"><span>Số điện thoại</span><div><FiPhone /><input value={form.phone} onChange={(event) => update('phone', event.target.value)} /></div>{errors.phone && <small>{errors.phone}</small>}</label>
          </div>
          <div className="auth-two-columns">
            <label className="input-with-icon"><span>Mật khẩu</span><div><FiLock /><input type="password" value={form.password} onChange={(event) => update('password', event.target.value)} /></div>{errors.password && <small>{errors.password}</small>}</label>
            <label className="input-with-icon"><span>Xác nhận mật khẩu</span><div><FiLock /><input type="password" value={form.confirmPassword} onChange={(event) => update('confirmPassword', event.target.value)} /></div>{errors.confirmPassword && <small>{errors.confirmPassword}</small>}</label>
          </div>
          <button className="btn btn-primary auth-submit" disabled={loading}>{loading ? 'Đang tạo tài khoản...' : 'Đăng ký'}</button>
          <p className="auth-switch">Đã có tài khoản? <Link to="/login">Đăng nhập</Link></p>
        </form>
      </div>
    </main>
  );
}
