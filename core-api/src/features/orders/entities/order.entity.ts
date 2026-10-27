import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import Decimal from 'decimal.js';
import { decimalTransformer } from '../../catalog/entities/variant.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 32, unique: true })
  order_no: string;

  @Column({ type: 'uuid' })
  @Index('ix_orders_customer_id')
  customer_id: string;

  @Column({ type: 'uuid' })
  store_id: string;

  @Column({ type: 'varchar', length: 16, default: 'placed' })
  status: 'placed' | 'cancelled';

  @Column({
    type: 'numeric',
    precision: 18,
    scale: 0,
    transformer: decimalTransformer,
  })
  total_vnd: Decimal;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  confirmed_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  cancelled_at: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
