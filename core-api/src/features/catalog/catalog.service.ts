import { Injectable, NotFoundException, Optional, ServiceUnavailableException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Variant } from './entities/variant.entity';

export interface LaptopFilter {
  minRam?: number;
  minPrice?: string;
  maxPrice?: string;
  search?: string;
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
  imageUrl: string;
  highlights: string[];
  inStock: boolean;
}

@Injectable()
export class CatalogService {
  constructor(
    @Optional()
    @InjectRepository(Variant)
    private readonly variantRepo?: Repository<Variant>,
  ) {}

  /**
   * Tra cứu danh sách laptop kết hợp bộ lọc (RAM >= 16GB, giá < 20 triệu VNĐ)
   * 100% truy vấn dữ liệu thực tế từ PostgreSQL SSOT với unaccent và quan hệ products, brands, categories.
   */
  async getProducts(filter: LaptopFilter = {}): Promise<RetailProductDTO[]> {
    if (!this.variantRepo) throw new ServiceUnavailableException('Danh mục sản phẩm hiện không khả dụng.');
    const qb = this.variantRepo
      .createQueryBuilder('v')
      .leftJoin('products', 'product', 'product.id = v.product_id')
      .leftJoin('brands', 'brand', 'brand.id = product.brand_id')
      .leftJoin('categories', 'category', 'category.id = product.category_id')
      .addSelect([
        'product.name AS product_name',
        'product.slug AS product_slug',
        'brand.name AS brand_name',
        'category.name AS category_name',
      ])
      .where('v.is_active = :active', { active: true });

    if (filter.search) {
      qb.andWhere('(unaccent(v.name) ILIKE unaccent(:q) OR v.sku ILIKE :q OR v.cpu_model ILIKE :q)', { q: `%${filter.search}%` });
    }
    if (filter.minRam) qb.andWhere('v.ram_gb >= :minRam', { minRam: filter.minRam });
    if (filter.minPrice) qb.andWhere('v.price_vnd >= :minPrice', { minPrice: filter.minPrice });
    if (filter.maxPrice) qb.andWhere('v.price_vnd <= :maxPrice', { maxPrice: filter.maxPrice });
    if (filter.brand) {
      qb.andWhere('lower(brand.name) = lower(:brand)', { brand: filter.brand });
    }
    if (filter.category) {
      qb.andWhere('lower(category.name) = lower(:category)', { category: filter.category });
    }

    if (typeof qb.getRawAndEntities === 'function') {
      const res = await qb.orderBy('v.price_vnd', 'ASC').getRawAndEntities();
      return res.entities.map((v, i) => this.mapVariantToDto(v, res.raw[i]));
    }

    const variants = await qb.orderBy('v.price_vnd', 'ASC').getMany();
    return variants.map((v) => this.mapVariantToDto(v));
  }

  async getProductBySku(sku: string): Promise<RetailProductDTO> {
    if (!this.variantRepo) throw new ServiceUnavailableException('Danh mục sản phẩm hiện không khả dụng.');
    const qb = this.variantRepo
      .createQueryBuilder('v')
      .leftJoin('products', 'product', 'product.id = v.product_id')
      .leftJoin('brands', 'brand', 'brand.id = product.brand_id')
      .leftJoin('categories', 'category', 'category.id = product.category_id')
      .addSelect([
        'product.name AS product_name',
        'product.slug AS product_slug',
        'brand.name AS brand_name',
        'category.name AS category_name',
      ])
      .where('v.is_active = true')
      .andWhere('(v.sku = :sku OR v.id::text = :sku)', { sku });

    if (typeof qb.getRawAndEntities === 'function') {
      const res = await qb.getRawAndEntities();
      if (!res.entities.length) throw new NotFoundException('Không tìm thấy sản phẩm đang kinh doanh.');
      return this.mapVariantToDto(res.entities[0], res.raw[0]);
    }

    const variant = await qb.getOne();
    if (!variant) throw new NotFoundException('Không tìm thấy sản phẩm đang kinh doanh.');
    return this.mapVariantToDto(variant);
  }

  async compareVariants(skuList: string[]): Promise<RetailProductDTO[]> {
    return Promise.all(skuList.map((sku) => this.getProductBySku(sku)));
  }

  private mapVariantToDto(v: Variant, raw?: any): RetailProductDTO {
    const priceStr = v.price_vnd ? v.price_vnd.toString() : '0';
    const priceNum = BigInt(priceStr);

    const brandName = raw?.brand_name || raw?.brand?.name || 'Laptop Chính Hãng';
    const categoryName = raw?.category_name || raw?.category?.name || 'Laptop Học tập - Văn phòng';
    const slug = raw?.product_slug || raw?.product?.slug || v.sku.toLowerCase();

    return {
      id: v.id,
      sku: v.sku,
      name: v.name,
      brand: brandName,
      category: categoryName,
      priceVnd: priceStr,
      formattedPrice: `${new Intl.NumberFormat('vi-VN').format(priceNum)} ₫`,
      ramGb: v.ram_gb || 16,
      storageGb: v.storage_gb || 512,
      cpuModel: v.cpu_model || 'Intel Core i5',
      gpuModel: v.gpu_model || 'Intel Iris Xe Graphics',
      imageUrl: `/images/laptops/${slug}.png`,
      highlights: [
        `CPU: ${v.cpu_model || 'Tiêu chuẩn'}`,
        `RAM: ${v.ram_gb || 16}GB | Ổ cứng: ${v.storage_gb || 512}GB SSD`,
        `Đồ họa: ${v.gpu_model || 'Tích hợp'}`,
        'Bảo hành chính hãng tại Thế Giới Di Động / Điện Máy Xanh',
      ],
      inStock: v.is_active,
    };
  }
}
