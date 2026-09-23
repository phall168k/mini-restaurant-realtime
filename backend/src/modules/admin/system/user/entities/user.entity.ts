import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../../../../../database/entities/base.entity';

@Entity({ schema: 'admin', name: 'users' })
export class UserEntity extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ 
    type: 'varchar', 
    length: 250, 
    unique: true 
  })
  username: string;

  @Column({ 
    type: 'varchar', 
    length: 255, 
    select: false 
  })
  password: string;

  @Column({ 
    type: 'boolean', 
    default: false 
  })
  status: boolean;

  @Column({ 
    name: 'is_active', 
    type: 'boolean', 
    default: true 
  })
  isActive: boolean;

  @Column({ 
    type: 'varchar', 
    nullable: true 
  })
  profile: string | null;

  constructor(partial?: Partial<UserEntity>) {
    super();
    Object.assign(this, partial);
  }
}
