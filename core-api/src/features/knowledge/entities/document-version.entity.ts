import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Policy } from './policy.entity';

@Entity('document_versions')
@Index('uq_document_versions_policy_version', ['policy_id', 'version_no'], { unique: true })
export class DocumentVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  policy_id: string;

  @Column({ type: 'int' })
  version_no: number;

  @Column({ type: 'varchar', length: 255 })
  minio_object_key: string;

  @Column({ type: 'varchar', length: 64 })
  checksum_sha256: string;

  @Column({ type: 'varchar', length: 32, default: 'draft' })
  status: 'draft' | 'processing' | 'published' | 'archived';

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ManyToOne(() => Policy, (p) => p.versions, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'policy_id' })
  policy?: Policy;
}

