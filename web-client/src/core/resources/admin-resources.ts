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
    list: '/admin/overview',
    meta: { label: 'Tổng quan vận hành', icon: 'LayoutDashboard', roles: ['admin'] },
  },
  {
    name: 'admin-catalog',
    identifier: 'admin.catalog',
    list: '/admin/products',
    create: '/admin/products/new',
    show: '/admin/products/:id',
    meta: { label: 'Danh mục Laptop & Cấu hình', icon: 'Laptop', roles: ['admin'] },
  },
  {
    name: 'admin-inventory',
    identifier: 'admin.inventory',
    list: '/admin/inventory',
    meta: { label: 'Ma trận Tồn kho chi nhánh', icon: 'Boxes', roles: ['admin'] },
  },
  {
    name: 'admin-orders',
    identifier: 'admin.orders',
    list: '/admin/orders',
    show: '/admin/orders/:id',
    meta: { label: 'Quản lý Đơn hàng & Đối soát', icon: 'ShoppingBag', roles: ['admin'] },
  },
  {
    name: 'admin-ingestion',
    identifier: 'admin.ingestion',
    list: '/admin/documents',
    create: '/admin/documents/upload',
    meta: { label: 'Tri thức RAG (Nghị định 30)', icon: 'FileText', roles: ['admin'] },
  },
  {
    name: 'admin-audit',
    identifier: 'admin.audit',
    list: '/admin/audit-logs',
    meta: { label: 'Sổ cái kiểm toán Hash Chain', icon: 'ShieldCheck', roles: ['admin'] },
  },
];
