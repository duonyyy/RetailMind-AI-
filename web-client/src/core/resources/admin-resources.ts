export interface ResourceDefinition {
  name: string;
  identifier: string;
  list?: string;
  create?: string;
  edit?: string;
  show?: string;
  meta: {
    label: string;
    icon?: string;
    roles: ('admin' | 'customer' | 'guest')[];
    parent?: string;
  };
}

export const adminResources: ResourceDefinition[] = [
  {
    name: 'admin-dashboard',
    identifier: 'admin.dashboard',
    list: '/admin/dashboard',
    meta: { label: 'Tổng quan & FinOps', icon: 'LayoutDashboard', roles: ['admin'] },
  },
  {
    name: 'admin-catalog',
    identifier: 'admin.catalog',
    list: '/admin/products',
    create: '/admin/products/new',
    show: '/admin/products/:id',
    meta: { label: 'Quản lý Sản phẩm PIM', icon: 'Laptop', roles: ['admin'] },
  },
  {
    name: 'admin-inventory',
    identifier: 'admin.inventory',
    list: '/admin/inventory',
    meta: { label: 'Ma trận Tồn kho chi nhánh', icon: 'Warehouse', roles: ['admin'] },
  },
  {
    name: 'admin-orders',
    identifier: 'admin.orders',
    list: '/admin/orders',
    show: '/admin/orders/:id',
    meta: { label: 'Quản lý Đơn hàng OMS', icon: 'ShoppingBag', roles: ['admin'] },
  },
  {
    name: 'admin-hitl',
    identifier: 'admin.hitl',
    list: '/admin/hitl',
    meta: { label: 'Cổng Duyệt HITL Gate', icon: 'ShieldAlert', roles: ['admin'] },
  },
  {
    name: 'admin-ingestion',
    identifier: 'admin.ingestion',
    list: '/admin/knowledge',
    meta: { label: 'Tri thức RAG & Qdrant', icon: 'BookOpenCheck', roles: ['admin'] },
  },
  {
    name: 'admin-promotions',
    identifier: 'admin.promotions',
    list: '/admin/promotions',
    meta: { label: 'Khuyến mãi & Quy tắc Giá', icon: 'Tag', roles: ['admin'] },
  },
  {
    name: 'admin-observability',
    identifier: 'admin.observability',
    list: '/admin/observability',
    meta: { label: 'Giám sát Phoenix & Traces', icon: 'Activity', roles: ['admin'] },
  },
  {
    name: 'admin-audit',
    identifier: 'admin.audit',
    list: '/admin/audit-logs',
    meta: { label: 'Sổ cái SHA-256 & RBAC', icon: 'FileSpreadsheet', roles: ['admin'] },
  },
  {
    name: 'admin-stores',
    identifier: 'admin.stores',
    list: '/admin/stores',
    meta: { label: 'Điểm bán Siêu thị MWG', icon: 'Building2', roles: ['admin'] },
  },
  {
    name: 'admin-settings',
    identifier: 'admin.settings',
    list: '/admin/settings',
    meta: { label: 'Cấu hình & Chống chịu', icon: 'Settings', roles: ['admin'] },
  },
];
