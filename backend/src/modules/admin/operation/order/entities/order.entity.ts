import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseEntity } from '../../../../../database/entities/base.entity';
import { OrderStatus } from '../../../../../libs/enums/order-status.enum';
import { RestaurantTableEntity } from '../../../master-data/restaurant-table/entities/restaurant-table.entity';
import { UserEntity } from '../../../system/user/entities/user.entity';
import { OrderItemEntity } from './order-item.entity';

@Entity({ schema: 'admin', name: 'orders' })
@Check('CHK_orders_discount', 'discount >= 0')
@Index('IDX_orders_table_id', ['tableId'])
export class OrderEntity extends BaseEntity {
  @PrimaryGeneratedColumn() id: number;
  @Column({ name: 'order_number', type: 'varchar', length: 250, unique: true })
  orderNumber: string;
  @Column({ name: 'table_id', type: 'integer' }) tableId: number;
  @ManyToOne(() => RestaurantTableEntity, {
    nullable: false,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'table_id' })
  table: RestaurantTableEntity;
  @Column({
    type: 'enum',
    enum: OrderStatus,
    enumName: 'order_status_enum',
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  discount: string;
  @Column({ type: 'text', nullable: true }) note: string | null;
  @Column({ name: 'created_by_user_id', type: 'integer' })
  createdByUserId: number;
  @ManyToOne(() => UserEntity, {
    nullable: false,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'created_by_user_id' })
  createdByUser: UserEntity;
  @OneToMany(() => OrderItemEntity, (item) => item.order)
  items: OrderItemEntity[];
}
