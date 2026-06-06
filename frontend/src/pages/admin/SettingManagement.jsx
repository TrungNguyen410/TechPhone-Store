import { useState } from 'react';
import { FiGlobe, FiMail, FiMapPin, FiPhone, FiSave, FiSettings } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { STORAGE_KEYS } from '../../utils/constants';
import { storage } from '../../utils/storage';

const defaults = {
  storeName: 'TechPhone',
  hotline: '1900 6868',
  email: 'support@techphone.vn',
  address: '123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh',
  logo: '',
  facebook: 'https://facebook.com/techphone',
  instagram: 'https://instagram.com/techphone',
  youtube: 'https://youtube.com/@techphone',
};

export default function SettingManagement() {
  const [form, setForm] = useState(() => storage.get(STORAGE_KEYS.mockSettings, defaults));
  const update = (key, value) => setForm({ ...form, [key]: value });
  const save = (event) => {
    event.preventDefault();
    storage.set(STORAGE_KEYS.mockSettings, form);
    toast.success('Đã lưu cài đặt hệ thống');
  };
  return (
    <form className="settings-layout" onSubmit={save}>
      <section className="admin-card settings-card">
        <div className="settings-heading"><FiSettings /><div><h2>Thông tin cửa hàng</h2><p>Thông tin hiển thị trên website và hóa đơn.</p></div></div>
        <div className="form-grid">
          <label className="form-field full"><span>Tên cửa hàng</span><input value={form.storeName} onChange={(event) => update('storeName', event.target.value)} /></label>
          <label className="form-field"><span><FiPhone /> Hotline</span><input value={form.hotline} onChange={(event) => update('hotline', event.target.value)} /></label>
          <label className="form-field"><span><FiMail /> Email</span><input value={form.email} onChange={(event) => update('email', event.target.value)} /></label>
          <label className="form-field full"><span><FiMapPin /> Địa chỉ</span><textarea rows="3" value={form.address} onChange={(event) => update('address', event.target.value)} /></label>
          <label className="form-field full"><span>URL Logo</span><input value={form.logo} onChange={(event) => update('logo', event.target.value)} placeholder="Để trống để dùng logo mặc định" /></label>
        </div>
      </section>
      <section className="admin-card settings-card">
        <div className="settings-heading"><FiGlobe /><div><h2>Mạng xã hội</h2><p>Các kênh chính thức của TechPhone.</p></div></div>
        <div className="form-grid">
          <label className="form-field full"><span>Facebook</span><input value={form.facebook} onChange={(event) => update('facebook', event.target.value)} /></label>
          <label className="form-field full"><span>Instagram</span><input value={form.instagram} onChange={(event) => update('instagram', event.target.value)} /></label>
          <label className="form-field full"><span>YouTube</span><input value={form.youtube} onChange={(event) => update('youtube', event.target.value)} /></label>
        </div>
      </section>
      <div className="settings-actions"><button className="btn btn-primary"><FiSave /> Lưu cài đặt</button></div>
    </form>
  );
}
