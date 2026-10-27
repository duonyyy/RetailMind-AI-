import { Entity, PrimaryColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Variant } from '../../catalog/public-api';
import { User } from '../../auth/public-api';

@Entity('favorites')
export class Favorite {
  @PrimaryColumn({ type: 'uuid' })
  customer_id: string;

  @PrimaryColumn({ type: 'uuid' })
  variant_id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id' })
  customer?: User;

  @ManyToOne(() => Variant, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'variant_id' })
  variant?: Variant;
}

