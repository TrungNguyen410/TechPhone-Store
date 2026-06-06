import SimpleCrudPage from './SimpleCrudPage';

export default function TaxonomyManagement({ api, type }) {
  const label = type === 'category' ? 'Danh mục' : 'Thương hiệu';
  return <SimpleCrudPage api={api} title={`Danh sách ${label.toLowerCase()}`} singular={label} createDefaults={{ name: '', active: true }} fields={[
    { key: 'name', label: `Tên ${label.toLowerCase()}`, required: true, full: true },
    { key: 'active', label: 'Đang hoạt động', type: 'checkbox' },
  ]} columns={[
    { key: 'name', label },
    { key: 'active', label: 'Trạng thái', render: (item) => <span className={`status-badge ${item.active ? 'status-completed' : 'status-cancelled'}`}>{item.active ? 'Hoạt động' : 'Tạm ẩn'}</span> },
  ]} />;
}
