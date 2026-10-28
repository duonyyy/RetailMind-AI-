import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('idempotency_keys')
export class IdempotencyKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  key: string;

  @Column({ name: 'target_id', type: 'varchar', length: 255, nullable: true })
  targetId: string;

  @Column({ type: 'varchar', length: 32, default: 'completed' })
  status: string;

  @Column({ name: 'response_payload', type: 'jsonb', nullable: true })
  responsePayload: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt?: Date;
}
