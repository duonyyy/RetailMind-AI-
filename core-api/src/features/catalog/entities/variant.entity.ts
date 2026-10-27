import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ValueTransformer,
} from 'typeorm';
import Decimal from 'decimal.js';

export const decimalTransformer: ValueTransformer = {
  to: (value: Decimal | string): string => {
    return value ? value.toString() : '0';
  },
  from: (value: string): Decimal => {
    return value ? new Decimal(value) : new Decimal(0);
  },
};

@Entity('variants')
export class Variant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index('ix_variants_product_id')
  product_id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  sku: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({
    type: 'numeric',
    precision: 18,
    scale: 0,
    transformer: decimalTransformer,
  })
  price_vnd: Decimal;

  @Column({ type: 'int', nullable: true })
  ram_gb: number;

  @Column({ type: 'int', nullable: true })
  storage_gb: number;

  @Column({ type: 'varchar', length: 120, nullable: true })
  cpu_model: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  gpu_model: string;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
