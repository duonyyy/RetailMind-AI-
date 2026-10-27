'use client';

import React from 'react';

export type UserRole = 'admin' | 'customer' | 'guest';

interface CanAccessProps {
  userRole?: UserRole;
  requiredRoles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Component kiểm soát phân quyền hiển thị giao diện động (Dynamic UI RBAC)
 * Dựa trên vai trò hiện tại của người dùng đối chiếu với danh sách quyền yêu cầu.
 */
export function CanAccess({
  userRole = 'guest',
  requiredRoles,
  children,
  fallback = null,
}: CanAccessProps) {
  const isAllowed = requiredRoles.includes(userRole);

  if (!isAllowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
