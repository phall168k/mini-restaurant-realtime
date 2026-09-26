import type { Relation } from 'typeorm';
import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseEntity } from '../../../../../database/entities/base.entity';
import { OrderItemStatus } from '../../../../../libs/enums/order-item-status.enum';
import { ItemEntity } from '../../../master-data/item/entities/item.entity';
import { OrderEntity } from './order.entity';

@Entity({ schema: 'admin', name: 'order_items' })
@Check('CHK_order_items_quantity', 'quantity > 0')
@Check('CHK_order_items_unit_price', 'unit_price >= 0')
@Check('CHK_order_items_discount', 'discount >= 0')
@Index('IDX_order_items_order_id', ['orderId'])
@Index('IDX_order_items_item_id', ['itemId'])
export class OrderItemEntity extends BaseEntity {
  @PrimaryGeneratedColumn() id: number;
  @Column({ name: 'order_id', type: 'integer' }) orderId: number;
  @ManyToOne(() => OrderEntity, (order) => order.items, {
    nullable: false,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'order_id' })
  order: Relation<OrderEntity>;
  @Column({ name: 'item_id', type: 'integer' }) itemId: number;
  @ManyToOne(() => ItemEntity, {
    nullable: false,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'item_id' })
  item: ItemEntity;
  @Column({ type: 'integer' }) quantity: number;
  @Column({ name: 'unit_price', type: 'decimal', precision: 14, scale: 2 })
  unitPrice: string;
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  discount: string;
  @Column({
    type: 'enum',
    enum: OrderItemStatus,
    enumName: 'order_item_status_enum',
    default: OrderItemStatus.PENDING,
  })
  status: OrderItemStatus;
  @Column({ type: 'text', nullable: true }) note: string | null;
}
