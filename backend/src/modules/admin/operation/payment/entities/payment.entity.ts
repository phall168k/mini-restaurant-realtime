import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseEntity } from '../../../../../database/entities/base.entity';
import { OrderEntity } from '../../order/entities/order.entity';
import { UserEntity } from '../../../system/user/entities/user.entity';
import { AttachmentDto } from '../../../../../libs/dtos/attachment.dto';
import { PaymentMethodEnum } from '../../../../../libs/enums/payment-method.enum';
import { PaymentStatus } from '../../../../../libs/enums/payment-status.enum';

@Entity({ schema: 'admin', name: 'payments' })
@Index('IDX_payments_paid_by_user_id', ['paidByUserId'])
@Check(
  'CHK_payments_amounts',
  'sub_total >= 0 AND discount >= 0 AND discount <= sub_total AND total = sub_total - discount AND received_amount >= total AND change_amount = received_amount - total',
)
export class PaymentEntity extends BaseEntity {
  @PrimaryGeneratedColumn() id: number;
  @Column({ name: 'payment_no', type: 'varchar', length: 64, unique: true })
  paymentNo: string;
  @Column({ name: 'order_id', type: 'integer', unique: true }) orderId: number;
  @OneToOne(() => OrderEntity, {
    nullable: false,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'order_id' })
  order: OrderEntity;
  @Column({
    name: 'payment_method',
    type: 'enum',
    enum: PaymentMethodEnum,
    enumName: 'payment_method_enum',
  })
  paymentMethod: PaymentMethodEnum;
  @Column({
    name: 'payment_status',
    type: 'enum',
    enum: PaymentStatus,
    enumName: 'payment_status_enum',
    default: PaymentStatus.COMPLETED,
  })
  paymentStatus: PaymentStatus;
  @Column({ name: 'sub_total', type: 'decimal', precision: 14, scale: 2 })
  subTotal: string;
  @Column({ type: 'decimal', precision: 14, scale: 2 }) discount: string;
  @Column({ type: 'decimal', precision: 14, scale: 2 }) total: string;
  @Column({ name: 'received_amount', type: 'decimal', precision: 14, scale: 2 })
  receivedAmount: string;
  @Column({ name: 'change_amount', type: 'decimal', precision: 14, scale: 2 })
  changeAmount: string;
  @Column({
    name: 'reference_no',
    type: 'varchar',
    length: 250,
    nullable: true,
  })
  referenceNo: string | null;
  @Column({ name: 'paid_by_user_id', type: 'integer' }) paidByUserId: number;
  @ManyToOne(() => UserEntity, {
    nullable: false,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'paid_by_user_id' })
  paidByUser: UserEntity;
  // Store the attachment list as one JSON array, not a PostgreSQL jsonb[] array.
  @Column({ type: 'jsonb', nullable: true }) attachment:
    AttachmentDto[] | null;
}
