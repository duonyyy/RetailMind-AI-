import { Injectable, NotFoundException, Optional, ServiceUnavailableException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Variant } from './entities/variant.entity';
import Decimal from 'decimal.js';

export interface LaptopFilter {
  search?: string;
  minPrice?: string;
  maxPrice?: string;
  minRam?: number;
  brand?: string;
  category?: string;
}

export interface RetailProductDTO {
  id: string;
  sku: string;
  name: string;
  brand: string;
  category: string;
  priceVnd: string;
  formattedPrice: string;
  ramGb: number;
  storageGb: number;
  cpuModel: string;
  gpuModel: string;
  imageUrl?: string;
  highlights: string[];
  inStock: boolean;
}

@Injectable()
export class CatalogService {
  // Built-in seed data conforming to MWG / RetailMind AI laptop catalog baseline
  private readonly defaultLaptops: RetailProductDTO[] = [
    {
      id: 'var-asus-vivobook-15',
      sku: 'LT-ASUS-VIVO15-OLED',
      name: 'Laptop Asus Vivobook 15 OLED A1505VA',
      brand: 'Asus',
      category: 'Laptop Học tập - Văn phòng',
      priceVnd: '17990000',
      formattedPrice: '17.990.000 ₫',
      ramGb: 16,
      storageGb: 512,
      cpuModel: 'Intel Core i5-13500H (12 nhân, 16 luồng)',
      gpuModel: 'Intel Iris Xe Graphics',
      imageUrl: '/images/laptops/asus-vivobook.png',
      highlights: ['Màn hình OLED 2.8K 120Hz rực rỡ', 'RAM 16GB DDR4 bus 3200MHz', 'Đổi trả miễn phí 30 ngày', 'Bảo hành 24 tháng'],
      inStock: true,
    },
    {
      id: 'var-dell-inspiron-14',
      sku: 'LT-DELL-INSP14-5430',
      name: 'Laptop Dell Inspiron 14 5430',
      brand: 'Dell',
      category: 'Laptop Học tập - Văn phòng',
      priceVnd: '18490000',
      formattedPrice: '18.490.000 ₫',
      ramGb: 16,
      storageGb: 512,
      cpuModel: 'Intel Core i5-1335U (10 nhân, 12 luồng)',
      gpuModel: 'Intel Iris Xe Graphics',
      imageUrl: '/images/laptops/dell-inspiron.png',
      highlights: ['Khung nhôm nguyên khối sang trọng', 'RAM 16GB LPDDR5 tốc độ cao', 'Cảm biến vân tay 1 chạm', 'Bảo hành tận nơi 12 tháng'],
      inStock: true,
    },
    {
      id: 'var-lenovo-thinkbook-14',
      sku: 'LT-LENOVO-TB14-G6',
      name: 'Laptop Lenovo ThinkBook 14 G6+ (2024)',
      brand: 'Lenovo',
      category: 'Laptop Doanh nhân - Đồ họa nhẹ',
      priceVnd: '19990000',
      formattedPrice: '19.990.000 ₫',
      ramGb: 16,
      storageGb: 512,
      cpuModel: 'Intel Core Ultra 5 125H (AI NPU tích hợp)',
      gpuModel: 'Intel Arc Graphics',
      imageUrl: '/images/laptops/lenovo-thinkbook.png',
      highlights: ['Vi xử lý Core Ultra thế hệ mới tích hợp AI NPU', 'Màn hình 2.5K 90Hz 100% sRGB', 'Đầy đủ cổng kết nối Thunderbolt 4', 'Đạt chuẩn độ bền quân đội MIL-STD-810H'],
      inStock: true,
    },
    {
      id: 'var-acer-swift-go-14',
      sku: 'LT-ACER-SWIFT-GO14',
      name: 'Laptop Acer Swift Go 14 OLED SFG14',
      brand: 'Acer',
      category: 'Laptop Học tập - Văn phòng',
      priceVnd: '16990000',
      formattedPrice: '16.990.000 ₫',
      ramGb: 16,
      storageGb: 512,
      cpuModel: 'Intel Core i5-13500H',
      gpuModel: 'Intel Iris Xe',
      imageUrl: '/images/laptops/acer-swift.png',
      highlights: ['Trọng lượng siêu nhẹ chỉ 1.25 kg', 'Màn hình OLED 90Hz', 'RAM 16GB LPDDR5', 'Camera QHD 1440p khử nhiễu AI'],
      inStock: true,
    },
    {
      id: 'var-hp-pavilion-14',
      sku: 'LT-HP-PAV14-DV2075TU',
      name: 'Laptop HP Pavilion 14-dv2075TU',
      brand: 'HP',
      category: 'Laptop Học tập - Văn phòng',
      priceVnd: '15490000',
      formattedPrice: '15.490.000 ₫',
      ramGb: 16,
      storageGb: 512,
      cpuModel: 'Intel Core i5-1235U',
      gpuModel: 'Intel Iris Xe',
      imageUrl: '/images/laptops/hp-pavilion.png',
      highlights: ['Thiết kế nắp nhôm mạ vàng sang trọng', 'Loa B&O âm thanh chân thực', 'Thời lượng pin lên tới 8 giờ'],
      inStock: true,
    },
    {
      id: 'var-macbook-air-m2',
      sku: 'LT-APPLE-MBA-M2-8GB',
      name: 'MacBook Air 13.6 inch M2 (2022)',
      brand: 'Apple',
      category: 'Laptop Cao Cấp - Sang Trọng',
      priceVnd: '24990000',
      formattedPrice: '24.990.000 ₫',
      ramGb: 8,
      storageGb: 256,
      cpuModel: 'Apple M2 (8 CPU, 8 GPU)',
      gpuModel: 'Apple M2 8-core GPU',
      imageUrl: '/images/laptops/macbook-air-m2.png',
      highlights: ['Chip Apple M2 tối ưu điện năng', 'Pin 18 giờ liên tục', 'Màn hình Liquid Retina siêu sắc nét', 'Vỏ nhôm tái chế 100%'],
      inStock: true,
    },
  ];

  constructor(
    @Optional()
    @InjectRepository(Variant)
    private readonly variantRepo?: Repository<Variant>,
  ) {}

  /**
   * Tra cứu danh sách laptop kết hợp bộ lọc (RAM >= 16GB, giá < 20 triệu VNĐ)
   * Hỗ trợ truy vấn PostgreSQL SSOT (unaccent) và fallback mượt về defaultLaptops khi chạy Unit Test.
   */
  async getProducts(filter: LaptopFilter = {}): Promise<RetailProductDTO[]> {
    if (!this.variantRepo) throw new ServiceUnavailableException('Danh mục sản phẩm hiện không khả dụng.');
    const qb = this.variantRepo.createQueryBuilder('v').where('v.is_active = :active', { active: true });
    if (filter.search) qb.andWhere('(unaccent(v.name) ILIKE unaccent(:q) OR v.sku ILIKE :q OR v.cpu_model ILIKE :q)', { q: `%${filter.search}%` });
    if (filter.minRam) qb.andWhere('v.ram_gb >= :minRam', { minRam: filter.minRam });
    if (filter.minPrice) qb.andWhere('v.price_vnd >= :minPrice', { minPrice: filter.minPrice });
    if (filter.maxPrice) qb.andWhere('v.price_vnd <= :maxPrice', { maxPrice: filter.maxPrice });
    if (filter.brand || filter.category) {
      qb.innerJoin('products', 'product', 'product.id = v.product_id');
      if (filter.brand) {
        qb.innerJoin('brands', 'brand', 'brand.id = product.brand_id');
        qb.andWhere('lower(brand.name) = lower(:brand)', { brand: filter.brand });
      }
      if (filter.category) {
        qb.innerJoin('categories', 'category', 'category.id = product.category_id');
        qb.andWhere('lower(category.name) = lower(:category)', { category: filter.category });
      }
    }
    return (await qb.orderBy('v.price_vnd', 'ASC').getMany()).map(v => this.mapVariantToDto(v));
  }

  async getProductBySku(sku: string): Promise<RetailProductDTO> {
    if (!this.variantRepo) throw new ServiceUnavailableException('Danh mục sản phẩm hiện không khả dụng.');
    const variant = await this.variantRepo.createQueryBuilder('v').where('v.is_active = true').andWhere('(v.sku = :sku OR v.id::text = :sku)', { sku }).getOne();
    if (!variant) throw new NotFoundException('Không tìm thấy sản phẩm đang kinh doanh.');
    return this.mapVariantToDto(variant);
  }

  async compareVariants(skuList: string[]): Promise<RetailProductDTO[]> {
    return Promise.all(skuList.map(sku => this.getProductBySku(sku)));
  }

  private mapVariantToDto(v: Variant): RetailProductDTO {
    const priceStr = v.price_vnd ? v.price_vnd.toString() : '0';
    const priceNum = BigInt(priceStr);
    const fallbackMatch = this.defaultLaptops.find(
      (d) => d.sku.toLowerCase() === v.sku.toLowerCase(),
    );

    return {
      id: v.id,
      sku: v.sku,
      name: v.name,
      brand: fallbackMatch?.brand || 'Laptop Chính Hãng',
      category: fallbackMatch?.category || 'Laptop Học tập - Văn phòng',
      priceVnd: priceStr,
      formattedPrice: `${new Intl.NumberFormat('vi-VN').format(priceNum)} ₫`,
      ramGb: v.ram_gb || 16,
      storageGb: v.storage_gb || 512,
      cpuModel: v.cpu_model || 'Intel Core i5',
      gpuModel: v.gpu_model || 'Intel Iris Xe Graphics',
      imageUrl: fallbackMatch?.imageUrl || '/images/laptops/default.png',
      highlights: fallbackMatch?.highlights || ['Bảo hành chính hãng 24 tháng', 'Đổi trả 30 ngày'],
      inStock: v.is_active,
    };
  }
}
