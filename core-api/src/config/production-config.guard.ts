/**
 * Production Configuration Guard
 * Học tập từ Foodee Core-API: Đảm bảo khi chạy production, hệ thống không bao giờ
 * sử dụng mật khẩu mặc định/placeholder dễ bị tấn công.
 */
export function assertProductionConfiguration(environment: Record<string, string | undefined> = process.env): void {
  if (environment.NODE_ENV !== 'production') {
    return;
  }

  const requiredSecrets = [
    'JWT_SECRET',
    'DB_PASSWORD',
    'MINIO_SECRET_KEY',
    'INTERNAL_TOOL_SECRET',
  ] as const;

  const placeholders = new Set([
    'changeme',
    'password',
    '123456',
    'admin',
    'root',
    'minioadmin',
    'retailmind_internal_super_secret_2026',
    'retailmind_jwt_secret_production_2026',
  ]);

  for (const key of requiredSecrets) {
    const value = environment[key]?.trim();
    if (!value || placeholders.has(value.toLowerCase())) {
      throw new Error(
        `[SECURITY CRITICAL] Biến môi trường ${key} bắt buộc phải được cấu hình bằng bí mật thực tế, không được để trống hoặc dùng giá trị placeholder mặc định khi chạy production!`,
      );
    }
  }
}
