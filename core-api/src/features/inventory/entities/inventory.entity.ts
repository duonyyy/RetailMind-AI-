import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('inventory')
export class Inventory {
  @PrimaryColumn({ type: 'uuid' })
  store_id: string;

  @PrimaryColumn({ type: 'uuid' })
  variant_id: string;

  @Column({ type: 'int', default: 0 })
  on_hand_qty: number;

  @Column({ type: 'int', default: 0 })
  reserved_qty: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
