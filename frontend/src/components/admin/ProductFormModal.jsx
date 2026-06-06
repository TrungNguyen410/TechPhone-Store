import { useEffect, useState } from 'react';
import { FiX } from 'react-icons/fi';
import { makeAccessoryImage, makeProductImage } from '../../mock/imageFactory';

const emptyProduct = {
  name: '',
  brand: '',
  category: 'Điện thoại',
  price: '',
  oldPrice: '',
  ram: '8GB',
  storage: '256GB',
  screen: '6.7 inch OLED, 120Hz',
  battery: '5000 mAh',
  camera: '50MP',
  chip: 'Chip 8 nhân hiệu năng cao',
  stock: 10,
  status: 'active',
  description: '',
  image: '',
};

export default function ProductFormModal({ open, item, kind = 'product', onClose, onSubmit }) {
  const [form, setForm] = useState(emptyProduct);

  useEffect(() => {
    if (!open) return;
    setForm(item || { ...emptyProduct, category: kind === 'accessory' ? 'Tai nghe' : 'Điện thoại' });
  }, [item, kind, open]);

  if (!open) return null;
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = (event) => {
    event.preventDefault();
    const price = Number(form.price);
    const oldPrice = Number(form.oldPrice || form.price);
    const image =
      form.image ||
      (kind === 'accessory'
        ? makeAccessoryImage(form.name || 'Phụ kiện')
        : makeProductImage(form.name || 'Điện thoại'));
    onSubmit({
      ...form,
      price,
      oldPrice,
      stock: Number(form.stock),
      image,
      images: form.images?.length ? form.images : [image],
      discountPercent: oldPrice > price ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0,
      rating: form.rating || 5,
      sold: form.sold || 0,
      specifications:
        kind === 'accessory'
          ? { 'Thương hiệu': form.brand, 'Loại phụ kiện': form.category, 'Bảo hành': '12 tháng' }
          : {
              'Màn hình': form.screen,
              RAM: form.ram,
              'Bộ nhớ trong': form.storage,
              Pin: form.battery,
              Camera: form.camera,
              Chip: form.chip,
            },
    });
  };

  return (
    <div className="modal-backdrop-custom" onMouseDown={onClose}>
      <form className="admin-form-modal" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <div className="admin-modal-head">
          <div><span>{item ? 'Chỉnh sửa dữ liệu' : 'Tạo dữ liệu mới'}</span><h2>{item ? item.name : kind === 'product' ? 'Thêm sản phẩm' : 'Thêm phụ kiện'}</h2></div>
          <button type="button" onClick={onClose}><FiX /></button>
        </div>
        <div className="form-grid">
          <label className="form-field full"><span>Tên {kind === 'product' ? 'sản phẩm' : 'phụ kiện'} *</span><input required value={form.name} onChange={(event) => update('name', event.target.value)} /></label>
          <label className="form-field"><span>Thương hiệu *</span><input required value={form.brand} onChange={(event) => update('brand', event.target.value)} /></label>
          <label className="form-field"><span>Danh mục *</span><input required value={form.category} onChange={(event) => update('category', event.target.value)} /></label>
          <label className="form-field"><span>Giá bán *</span><input required min="0" type="number" value={form.price} onChange={(event) => update('price', event.target.value)} /></label>
          <label className="form-field"><span>Giá cũ</span><input min="0" type="number" value={form.oldPrice} onChange={(event) => update('oldPrice', event.target.value)} /></label>
          <label className="form-field"><span>Tồn kho *</span><input required min="0" type="number" value={form.stock} onChange={(event) => update('stock', event.target.value)} /></label>
          <label className="form-field"><span>Trạng thái</span><select value={form.status} onChange={(event) => update('status', event.target.value)}><option value="active">Đang bán</option><option value="inactive">Ngừng bán</option></select></label>
          {kind === 'product' && <>
            <label className="form-field"><span>RAM</span><input value={form.ram} onChange={(event) => update('ram', event.target.value)} /></label>
            <label className="form-field"><span>Bộ nhớ</span><input value={form.storage} onChange={(event) => update('storage', event.target.value)} /></label>
            <label className="form-field"><span>Màn hình</span><input value={form.screen} onChange={(event) => update('screen', event.target.value)} /></label>
            <label className="form-field"><span>Pin</span><input value={form.battery} onChange={(event) => update('battery', event.target.value)} /></label>
            <label className="form-field"><span>Camera</span><input value={form.camera} onChange={(event) => update('camera', event.target.value)} /></label>
            <label className="form-field"><span>Chip</span><input value={form.chip} onChange={(event) => update('chip', event.target.value)} /></label>
          </>}
          <label className="form-field full"><span>URL hình ảnh (để trống dùng ảnh mẫu)</span><input value={form.image} onChange={(event) => update('image', event.target.value)} /></label>
          <label className="form-field full"><span>Mô tả *</span><textarea required rows="4" value={form.description} onChange={(event) => update('description', event.target.value)} /></label>
        </div>
        <div className="admin-modal-actions"><button type="button" className="btn btn-light" onClick={onClose}>Hủy</button><button className="btn btn-primary">{item ? 'Lưu thay đổi' : 'Thêm mới'}</button></div>
      </form>
    </div>
  );
}
