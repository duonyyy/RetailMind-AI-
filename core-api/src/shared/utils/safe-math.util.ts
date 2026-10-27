import Decimal from 'decimal.js';

/**
 * SafeMath: Bộ công cụ tính toán số học tiền tệ VNĐ tuyệt đối chính xác
 * Tuân thủ Hiến pháp AGENTS.md: 100% giá trị tiền dùng Decimal / NUMERIC(18, 0), cấm dùng float.
 */
export class SafeMath {
  /**
   * Chuyển đổi an toàn giá trị thành chuỗi số nguyên VNĐ không có phần thập phân
   */
  static toVndString(value: string | number | Decimal): string {
    return new Decimal(value).floor().toString();
  }

  /**
   * Cộng hai hoặc nhiều số tiền VNĐ
   */
  static add(...values: (string | number | Decimal)[]): string {
    const sum = values.reduce<Decimal>((acc, val) => acc.plus(new Decimal(val || 0)), new Decimal(0));
    return sum.floor().toString();
  }

  /**
   * Trừ hai số tiền VNĐ (kết quả không âm nếu clampNonNegative = true)
   */
  static subtract(a: string | number | Decimal, b: string | number | Decimal, clampNonNegative = true): string {
    const diff = new Decimal(a).minus(new Decimal(b));
    return clampNonNegative ? Decimal.max(0, diff).floor().toString() : diff.floor().toString();
  }

  /**
   * Nhân đơn giá với số lượng
   */
  static multiply(unitPrice: string | number | Decimal, quantity: number): string {
    return new Decimal(unitPrice).times(quantity).floor().toString();
  }

  /**
   * Tính thuế VAT 10% theo luật thuế GTGT Việt Nam
   */
  static calculateVat10(subtotal: string | number | Decimal): string {
    return new Decimal(subtotal).times(0.10).floor().toString();
  }

  /**
   * Định dạng tiền tệ VNĐ hiển thị thân thiện (e.g. 17.990.000 ₫)
   */
  static formatVnd(amount: string | number | Decimal): string {
    const dec = new Decimal(amount).floor();
    return `${new Intl.NumberFormat('vi-VN').format(dec.toNumber())} ₫`;
  }

  /**
   * Tính tỷ lệ phần trăm bị khống chế trần luật định (ví dụ Điều 301 Luật Thương Mại trần 8%)
   */
  static capPercentage(rate: number | Decimal, ceiling: number | Decimal): Decimal {
    return Decimal.min(new Decimal(rate), new Decimal(ceiling));
  }
}

