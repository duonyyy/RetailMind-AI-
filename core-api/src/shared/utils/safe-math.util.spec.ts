import { SafeMath } from './safe-math.util';

describe('SafeMath (VNĐ Zero-Float Precision)', () => {
  it('should format and round down to whole integer VNĐ without decimal drift', () => {
    expect(SafeMath.toVndString('17990000.85')).toBe('17990000');
    expect(SafeMath.formatVnd('17990000')).toContain('17.990.000');
  });

  it('should add multiple currency amounts with exact precision', () => {
    const total = SafeMath.add('15000000', '2990000', 500000);
    expect(total).toBe('18490000');
  });

  it('should calculate 10% VAT correctly with floor rounding', () => {
    // 19.990.000 * 0.10 = 1.999.000
    expect(SafeMath.calculateVat10('19990000')).toBe('1999000');
  });

  it('should clamp negative subtraction when requested', () => {
    expect(SafeMath.subtract('1000000', '1500000', true)).toBe('0');
    expect(SafeMath.subtract('1000000', '1500000', false)).toBe('-500000');
  });

  it('should cap penalty percentage according to legal ceiling', () => {
    const capped12 = SafeMath.capPercentage(12, 8);
    expect(capped12.toNumber()).toBe(8);

    const capped5 = SafeMath.capPercentage(5, 8);
    expect(capped5.toNumber()).toBe(5);
  });
});

