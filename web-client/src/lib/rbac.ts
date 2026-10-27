/**
 * Dynamic UI RBAC & PBAC Access Control Matrix (ADR-009 & AGENTS.md Section 4)
 * Strictly enforces the 3 Personas: Guest, Customer, Admin.
 */
export type PersonaRole = 'guest' | 'customer' | 'admin';

export type ResourceKey =
  | 'catalog'
  | 'advisor'
  | 'cart'
  | 'checkout'
  | 'orders'
  | 'warranty'
  | 'support'
  | 'profile'
  | 'admin.dashboard'
  | 'admin.products'
  | 'admin.inventory'
  | 'admin.orders'
  | 'admin.hitl'
  | 'admin.knowledge'
  | 'admin.promotions'
  | 'admin.observability'
  | 'admin.audit'
  | 'admin.stores'
  | 'admin.settings';

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'approve';

const ROLE_MATRIX: Record<PersonaRole, Record<ResourceKey, PermissionAction[]>> = {
  guest: {
    catalog: ['view'],
    advisor: ['view', 'create'],
    cart: [],
    checkout: [],
    orders: [],
    warranty: ['view'],
    support: ['view'],
    profile: [],
    'admin.dashboard': [],
    'admin.products': [],
    'admin.inventory': [],
    'admin.orders': [],
    'admin.hitl': [],
    'admin.knowledge': [],
    'admin.promotions': [],
    'admin.observability': [],
    'admin.audit': [],
    'admin.stores': [],
    'admin.settings': [],
  },
  customer: {
    catalog: ['view'],
    advisor: ['view', 'create'],
    cart: ['view', 'create', 'edit', 'delete'],
    checkout: ['view', 'create'],
    orders: ['view', 'edit'],
    warranty: ['view', 'create'],
    support: ['view', 'create'],
    profile: ['view', 'edit', 'delete'],
    'admin.dashboard': [],
    'admin.products': [],
    'admin.inventory': [],
    'admin.orders': [],
    'admin.hitl': [],
    'admin.knowledge': [],
    'admin.promotions': [],
    'admin.observability': [],
    'admin.audit': [],
    'admin.stores': [],
    'admin.settings': [],
  },
  admin: {
    catalog: ['view', 'create', 'edit', 'delete'],
    advisor: ['view', 'create'],
    cart: ['view'],
    checkout: ['view'],
    orders: ['view', 'edit'],
    warranty: ['view', 'edit'],
    support: ['view', 'edit'],
    profile: ['view', 'edit'],
    'admin.dashboard': ['view'],
    'admin.products': ['view', 'create', 'edit', 'delete'],
    'admin.inventory': ['view', 'edit'],
    'admin.orders': ['view', 'edit'],
    'admin.hitl': ['view', 'approve'],
    'admin.knowledge': ['view', 'create', 'edit'],
    'admin.promotions': ['view', 'create', 'edit'],
    'admin.observability': ['view'],
    'admin.audit': ['view'],
    'admin.stores': ['view', 'create', 'edit'],
    'admin.settings': ['view', 'edit'],
  },
};

export function canAccessResource(
  role: PersonaRole,
  resource: ResourceKey,
  action: PermissionAction = 'view'
): boolean {
  const allowedActions = ROLE_MATRIX[role]?.[resource] || [];
  return allowedActions.includes(action);
}

/**
 * Anti-IDOR Ownership Check (AGENTS.md Section 4)
 */
export function verifyOwnershipOrAdmin(
  resourceUserId: string,
  currentUserId: string,
  currentRole: PersonaRole
): boolean {
  if (currentRole === 'admin') return true;
  return Boolean(resourceUserId && currentUserId && resourceUserId === currentUserId);
}

