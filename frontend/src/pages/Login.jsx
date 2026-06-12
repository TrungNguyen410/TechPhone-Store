import { useState } from 'react';
import { FiEye, FiEyeOff, FiLock, FiLogIn, FiMail, FiShield } from 'react-icons/fi';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, isAdmin } = useAuth();
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const from = location.state?.from;
  const requestedPath = from ? `${from.pathname}${from.search || ''}${from.hash || ''}` : '/';
  const customerDestination = requestedPath.startsWith('/admin') ? '/' : requestedPath;
  const adminDestination = requestedPath.startsWith('/admin') ? requestedPath : '/admin/dashboard';

  if (isAuthenticated) return <Navigate to={isAdmin ? adminDestination : customerDestination} replace />;

  const submit = async (event) => {
    event.preventDefault();
    if (!form.identifier.trim() || !form.password) return toast.error('Vui lòng nhập đầy đủ thông tin');
    setLoading(true);
    try {
      const session = await login(form);
      toast.success(`Chào mừng ${session.user.fullName}`);
      navigate(session.user.role === 'admin' ? adminDestination : customerDestination, { replace: true });
    } catch (error) {
      toast.error(error.friendlyMessage || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-visual">
        <div><FiShield /><h1>Mua sắm công nghệ<br />an tâm mỗi ngày</h1><p>Sản phẩm kiểm định, bảo hành rõ ràng và hỗ trợ tận tâm.</p></div>
      </div>
      <div className="auth-panel">
        <Link className="brand" to="/"><span className="brand-mark">T</span><span>Tech<span>Phone</span></span></Link>
        <form className="auth-form" onSubmit={submit}>
          <span className="eyebrow">Chào mừng trở lại</span>
          <h1>Đăng nhập tài khoản</h1>
          <p>Tiếp tục mua sắm và quản lý đơn hàng của bạn.</p>
          <label className="input-with-icon"><span>Email hoặc số điện thoại</span><div><FiMail /><input value={form.identifier} onChange={(event) => setForm({ ...form, identifier: event.target.value })} placeholder="user@gmail.com" /></div></label>
          <label className="input-with-icon"><span>Mật khẩu</span><div><FiLock /><input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Nhập mật khẩu" /><button type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <FiEyeOff /> : <FiEye />}</button></div></label>
          <button className="btn btn-primary auth-submit" disabled={loading}><FiLogIn /> {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}</button>
          <div className="mock-accounts">
            <strong>Tài khoản dùng thử</strong>
            <button type="button" onClick={() => setForm({ identifier: 'user@gmail.com', password: '123456' })}>Khách hàng: user@gmail.com</button>
            <button type="button" onClick={() => setForm({ identifier: 'admin@gmail.com', password: '123456' })}>Quản trị: admin@gmail.com</button>
          </div>
          <p className="auth-switch">Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link></p>
        </form>
      </div>
    </main>
  );
}
