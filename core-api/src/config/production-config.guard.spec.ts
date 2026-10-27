import { assertProductionConfiguration } from './production-config.guard';

describe('ProductionConfigGuard', () => {
  it('should pass without error in development mode even with placeholder values', () => {
    expect(() =>
      assertProductionConfiguration({
        NODE_ENV: 'development',
        JWT_SECRET: 'password',
      }),
    ).not.toThrow();
  });

  it('should throw Error in production mode if a secret is missing', () => {
    expect(() =>
      assertProductionConfiguration({
        NODE_ENV: 'production',
        JWT_SECRET: '',
        DB_PASSWORD: 'secure_password_123',
        MINIO_SECRET_KEY: 'secure_minio_key_456',
        INTERNAL_TOOL_SECRET: 'secure_internal_key_789',
      }),
    ).toThrow(/JWT_SECRET bắt buộc phải được cấu hình/);
  });

  it('should throw Error in production mode if a secret is a placeholder like changeme', () => {
    expect(() =>
      assertProductionConfiguration({
        NODE_ENV: 'production',
        JWT_SECRET: 'changeme',
        DB_PASSWORD: 'secure_password_123',
        MINIO_SECRET_KEY: 'secure_minio_key_456',
        INTERNAL_TOOL_SECRET: 'secure_internal_key_789',
      }),
    ).toThrow(/không được để trống hoặc dùng giá trị placeholder/);
  });

  it('should pass in production mode when all secrets are properly configured', () => {
    expect(() =>
      assertProductionConfiguration({
        NODE_ENV: 'production',
        JWT_SECRET: 'prod_jwt_super_secret_key_long_enough',
        DB_PASSWORD: 'prod_postgres_db_password_xyz987',
        MINIO_SECRET_KEY: 'prod_minio_secret_key_qwerty123',
        INTERNAL_TOOL_SECRET: 'prod_internal_tool_secret_safe_456',
      }),
    ).not.toThrow();
  });
});
