import { ResourceDefinition } from './admin-resources';

export const customerResources: ResourceDefinition[] = [
  {
    name: 'customer-advisor',
    identifier: 'customer.advisor',
    list: '/',
    meta: { label: 'Trợ lý AI Advisor', icon: 'MessageSquareText', roles: ['customer', 'guest'] },
  },
  {
    name: 'customer-catalog',
    identifier: 'customer.catalog',
    list: '/catalog',
    show: '/products/:sku',
    meta: { label: 'Danh mục Laptop MWG', icon: 'Laptop', roles: ['customer', 'guest'] },
  },
  {
    name: 'customer-compare',
    identifier: 'customer.compare',
    list: '/compare',
    meta: { label: 'So sánh kỹ thuật', icon: 'Scale', roles: ['customer', 'guest'] },
  },
  {
    name: 'customer-cart',
    identifier: 'customer.cart',
    list: '/cart',
    meta: { label: 'Giỏ hàng & Tính tiền', icon: 'ShoppingCart', roles: ['customer'] },
  },
  {
    name: 'customer-checkout',
    identifier: 'customer.checkout',
    list: '/checkout',
    show: '/checkout/success',
    meta: { label: 'Đặt hàng & Khóa tồn', icon: 'CreditCard', roles: ['customer'] },
  },
  {
    name: 'customer-orders',
    identifier: 'customer.orders',
    list: '/orders',
    show: '/orders/:id',
    meta: { label: 'Đơn hàng của tôi', icon: 'PackageCheck', roles: ['customer'] },
  },
  {
    name: 'customer-warranty',
    identifier: 'customer.warranty',
    list: '/warranty',
    meta: { label: 'Bảo hành & Đổi trả 30 ngày', icon: 'ShieldCheck', roles: ['customer'] },
  },
  {
    name: 'customer-support',
    identifier: 'customer.support',
    list: '/support',
    meta: { label: 'Trung tâm Hỗ trợ & Ticket', icon: 'Headphones', roles: ['customer'] },
  },
  {
    name: 'customer-profile',
    identifier: 'customer.profile',
    list: '/profile',
    meta: { label: 'Hồ sơ & Quyền riêng tư PII', icon: 'UserCheck', roles: ['customer'] },
  },
];
