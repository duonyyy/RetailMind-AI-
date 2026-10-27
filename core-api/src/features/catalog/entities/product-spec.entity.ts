import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Variant } from './variant.entity';

@Entity('product_specs')
export class ProductSpec {
  @PrimaryColumn({ type: 'uuid' })
  variant_id: string;

  @PrimaryColumn({ type: 'varchar', length: 64 })
  spec_key: string;

  @Column({ type: 'text' })
  spec_value: string;

  @Column({ type: 'varchar', length: 32, default: 'string' })
  data_type: 'string' | 'number' | 'boolean' | 'json';

  @ManyToOne(() => Variant, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'variant_id' })
  variant?: Variant;
}

