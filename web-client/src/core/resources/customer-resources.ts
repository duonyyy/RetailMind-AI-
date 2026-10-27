import { ResourceDefinition } from './admin-resources';

export const customerResources: ResourceDefinition[] = [
  {
    name: 'customer-catalog',
    identifier: 'customer.catalog',
    list: '/catalog',
    meta: { label: 'Khám phá Laptop', icon: 'Compass', roles: ['customer', 'guest'] },
  },
  {
    name: 'customer-advisor',
    identifier: 'customer.advisor',
    list: '/advisor',
    meta: { label: 'Trợ lý AI Advisor', icon: 'Bot', roles: ['customer'] },
  },
  {
    name: 'customer-orders',
    identifier: 'customer.orders',
    list: '/my-orders',
    show: '/my-orders/:id',
    meta: { label: 'Đơn hàng của tôi', icon: 'Package', roles: ['customer'] },
  },
  {
    name: 'customer-cart',
    identifier: 'customer.cart',
    list: '/cart',
    meta: { label: 'Giỏ hàng & Thanh toán', icon: 'ShoppingCart', roles: ['customer'] },
  },
];
