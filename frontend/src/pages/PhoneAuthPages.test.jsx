import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ForgotPassword from './ForgotPassword';
import Register from './Register';

const register = vi.fn();
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    logout: vi.fn(),
    register: (...args) => register(...args),
  }),
}));
vi.mock('../api/authApi', () => ({
  authApi: {
    requestPasswordReset: vi.fn(),
    resetPassword: vi.fn(),
  },
}));
vi.mock('react-toastify', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const fillRegisterForm = (phone) => {
  fireEvent.change(screen.getByLabelText('Họ và tên'), { target: { value: 'Nguyễn Văn A' } });
  fireEvent.change(screen.getByPlaceholderText('0912 345 678'), { target: { value: phone } });
  fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: '123456' } });
  fireEvent.change(screen.getByLabelText('Xác nhận mật khẩu'), { target: { value: '123456' } });
  fireEvent.click(screen.getByRole('button', { name: 'Đăng ký' }));
};

describe('phone-only authentication pages', () => {
  afterEach(() => {
    cleanup();
    register.mockReset();
  });

  it('registers in a single step without an OTP or email field', () => {
    render(<MemoryRouter><Register /></MemoryRouter>);
    expect(screen.getByText('Số điện thoại')).toBeInTheDocument();
    expect(screen.queryByText(/^Email$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/OTP/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Đăng ký' })).toBeInTheDocument();
  });

  it('rejects a phone whose prefix belongs to no operating carrier', () => {
    render(<MemoryRouter><Register /></MemoryRouter>);
    fillRegisterForm('0123456789');
    expect(screen.getByText(/Đầu số 012 không thuộc nhà mạng/i)).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
  });

  it('submits a phone carrying a real carrier prefix', () => {
    render(<MemoryRouter><Register /></MemoryRouter>);
    fillRegisterForm('0912345678');
    expect(register).toHaveBeenCalledWith(
      expect.objectContaining({ phone: '0912345678', fullName: 'Nguyễn Văn A', password: '123456' }),
    );
  });

  it('recovers a password through SMS without channel selection', () => {
    render(<MemoryRouter><ForgotPassword /></MemoryRouter>);
    expect(screen.getByText(/nhận mã OTP qua SMS/i)).toBeInTheDocument();
    expect(screen.getByText('Số điện thoại tài khoản')).toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });
});
