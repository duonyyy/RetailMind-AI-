import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('audit_events')
export class AuditEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  @Index('ix_audit_events_actor_id')
  actor_id?: string;

  @Column({ type: 'varchar', length: 64 })
  action: string;

  @Column({ type: 'varchar', length: 64 })
  entity_type: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  entity_id?: string;

  @Column({ type: 'jsonb', nullable: true })
  payload?: Record<string, unknown>;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ip_address?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  @Index('ix_audit_events_created_at')
  created_at: Date;
}

