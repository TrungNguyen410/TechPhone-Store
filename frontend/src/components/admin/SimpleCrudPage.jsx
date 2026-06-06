import { useEffect, useState } from 'react';
import { FiEdit2, FiPlus, FiTrash2, FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';
import ConfirmModal from '../common/ConfirmModal';
import Loading from '../common/Loading';
import DataTable from './DataTable';

export default function SimpleCrudPage({ api, title, singular, fields, columns, createDefaults = {} }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const load = () => api.getAll().then(setItems).finally(() => setLoading(false));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const save = async (event) => {
    event.preventDefault();
    const payload = fields.reduce((result, field) => {
      let value = form[field.key];
      if (field.type === 'number') value = Number(value);
      if (field.type === 'checkbox') value = Boolean(value);
      result[field.key] = value;
      return result;
    }, {});
    if (form.id) await api.update(form.id, payload);
    else await api.create(payload);
    setForm(null);
    toast.success(`Đã lưu ${singular.toLowerCase()}`);
    load();
  };
  const remove = async () => { await api.remove(deleteId); setDeleteId(null); toast.success(`Đã xóa ${singular.toLowerCase()}`); load(); };
  const tableColumns = [...columns, { key: 'actions', label: 'Thao tác', render: (item) => <div className="table-actions"><button onClick={() => setForm(item)}><FiEdit2 /></button><button className="danger" onClick={() => setDeleteId(item.id)}><FiTrash2 /></button></div> }];
  if (loading) return <Loading />;
  return (
    <>
      <div className="admin-page-toolbar"><div /><button className="btn btn-primary" onClick={() => setForm({ ...createDefaults })}><FiPlus /> Thêm {singular.toLowerCase()}</button></div>
      <div className="admin-table-card"><div className="admin-table-title"><div><h2>{title}</h2><span>{items.length} mục</span></div></div><DataTable columns={tableColumns} rows={items} /></div>
      {form && <div className="modal-backdrop-custom" onMouseDown={() => setForm(null)}><form className="admin-form-modal simple-form-modal" onSubmit={save} onMouseDown={(event) => event.stopPropagation()}><div className="admin-modal-head"><div><span>{form.id ? 'Chỉnh sửa' : 'Thêm mới'}</span><h2>{singular}</h2></div><button type="button" onClick={() => setForm(null)}><FiX /></button></div><div className="form-grid">{fields.map((field) => field.type === 'checkbox' ? <label className="admin-checkbox" key={field.key}><input type="checkbox" checked={Boolean(form[field.key])} onChange={(event) => setForm({ ...form, [field.key]: event.target.checked })} /><span>{field.label}</span></label> : <label className={`form-field ${field.full ? 'full' : ''}`} key={field.key}><span>{field.label}</span>{field.type === 'select' ? <select required={field.required} value={form[field.key] ?? ''} onChange={(event) => setForm({ ...form, [field.key]: event.target.value })}>{field.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : field.type === 'textarea' ? <textarea required={field.required} rows="3" value={form[field.key] ?? ''} onChange={(event) => setForm({ ...form, [field.key]: event.target.value })} /> : <input required={field.required} type={field.type || 'text'} value={form[field.key] ?? ''} onChange={(event) => setForm({ ...form, [field.key]: event.target.value })} />}</label>)}</div><div className="admin-modal-actions"><button type="button" className="btn btn-light" onClick={() => setForm(null)}>Hủy</button><button className="btn btn-primary">Lưu dữ liệu</button></div></form></div>}
      <ConfirmModal open={Boolean(deleteId)} title={`Xóa ${singular.toLowerCase()}?`} message="Dữ liệu sẽ bị xóa khỏi chế độ mock." onCancel={() => setDeleteId(null)} onConfirm={remove} />
    </>
  );
}
