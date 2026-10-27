import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Message } from './message.entity';

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index('ix_conversations_customer_id')
  customer_id: string;

  @Column({ type: 'varchar', length: 255, default: 'Cuộc trò chuyện tư vấn' })
  title: string;

  @Column({ type: 'varchar', length: 32, default: 'active' })
  status: 'active' | 'archived';

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @OneToMany(() => Message, (msg) => msg.conversation)
  messages?: Message[];
}

