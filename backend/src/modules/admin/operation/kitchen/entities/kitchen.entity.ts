import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseEntity } from '../../../../../database/entities/base.entity';
import { KitchenStatus } from '../../../../../libs/enums/kitchen-status.enum';
import { OrderItemEntity } from '../../order/entities/order-item.entity';
import { UserEntity } from '../../../system/user/entities/user.entity';

@Entity({
  schema: 'admin',
  name: 'kitchens',
})
@Index('IDX_kitchens_order_item_id', ['orderItemId'])
@Index('IDX_kitchens_performed_by_id', ['performedById'])
export class KitchenEntity extends BaseEntity {
  @PrimaryGeneratedColumn() id: number;
  @Column({
    name: 'order_item_id',
    type: 'integer',
  })
  orderItemId: number;

  @ManyToOne(() => OrderItemEntity, {
    nullable: false,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'order_item_id' })
  orderItem: OrderItemEntity;

  @Column({
    name: 'performed_by_id',
    type: 'integer',
  })
  performedById: number;

  @ManyToOne(() => UserEntity, {
    nullable: false,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'performed_by_id',
  })
  performedBy: UserEntity;

  @Column({
    type: 'enum',
    enum: KitchenStatus,
    enumName: 'kitchen_status_enum',
    default: KitchenStatus.PENDING,
  })
  status: KitchenStatus;

  @Column({
    type: 'text',
    nullable: true,
  })
  description: string | null;
}
