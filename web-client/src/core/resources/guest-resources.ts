import { ResourceDefinition } from './admin-resources';

export const guestResources: ResourceDefinition[] = [
  {
    name: 'guest-home',
    identifier: 'guest.home',
    list: '/',
    meta: { label: 'Trang chủ & AI Advisor', icon: 'Sparkles', roles: ['guest', 'customer', 'admin'] },
  },
  {
    name: 'guest-catalog',
    identifier: 'guest.catalog',
    list: '/catalog',
    show: '/products/:sku',
    meta: { label: 'Danh mục Laptop MWG', icon: 'Laptop', roles: ['guest', 'customer', 'admin'] },
  },
  {
    name: 'guest-compare',
    identifier: 'guest.compare',
    list: '/compare',
    meta: { label: 'So sánh đối đầu 4 máy', icon: 'Scale', roles: ['guest', 'customer', 'admin'] },
  },
  {
    name: 'guest-auth',
    identifier: 'guest.auth',
    list: '/login',
    create: '/register',
    meta: { label: 'Đăng nhập / Đăng ký', icon: 'LogIn', roles: ['guest'] },
  },
];

