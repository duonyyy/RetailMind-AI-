import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import Decimal from 'decimal.js';
import { decimalTransformer } from '../../catalog/public-api';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  order_id: string;

  @Column({ type: 'uuid' })
  variant_id: string;

  @Column({ type: 'varchar', length: 80 })
  sku_snapshot: string;

  @Column({ type: 'varchar', length: 240 })
  title_snapshot: string;

  @Column({
    type: 'numeric',
    precision: 18,
    scale: 0,
    transformer: decimalTransformer,
  })
  unit_price_vnd: Decimal;

  @Column({ type: 'int' })
  quantity: number;

  @Column({
    type: 'numeric',
    precision: 18,
    scale: 0,
    transformer: decimalTransformer,
  })
  line_total_vnd: Decimal;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
