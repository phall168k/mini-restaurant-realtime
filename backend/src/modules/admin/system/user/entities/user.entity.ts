import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseEntity } from '../../../../../database/entities/base.entity';
import { RoleEntity } from '../../role/entities/role.entity';

@Entity({ schema: 'admin', name: 'users' })
export class UserEntity extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'varchar',
    length: 250,
    unique: true,
  })
  username: string;

  @Column({
    type: 'varchar',
    length: 255,
    select: false,
  })
  password: string;

  @Column({
    type: 'boolean',
    default: false,
  })
  status: boolean;

  @Column({
    name: 'is_active',
    type: 'boolean',
    default: true,
  })
  isActive: boolean;

  @Column({
    name: 'is_super_user',
    type: 'boolean',
    nullable: true,
    default: null,
  })
  isSuperUser: boolean | null;

  @Column({
    type: 'varchar',
    length: 2048,
    nullable: true,
  })
  profile: string | null;

  @ManyToMany(() => RoleEntity, (role) => role.users, {
    lazy: true,
    cascade: false,
    onDelete: 'NO ACTION',
    onUpdate: 'CASCADE',
  })
  @JoinTable({
    name: 'users_roles',
    schema: 'admin',
    joinColumn: {
      name: 'user_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'role_id',
      referencedColumnName: 'id',
    },
  })
  roles: Promise<RoleEntity[]>;

  constructor(partial?: Partial<UserEntity>) {
    super();
    Object.assign(this, partial);
  }
}
