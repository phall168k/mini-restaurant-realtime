import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleEnum } from '../../../libs/enums/role.enum';
import { OrderStatus } from '../../../libs/enums/order-status.enum';
import { PaymentStatus } from '../../../libs/enums/payment-status.enum';
import { OrderEntity } from '../operation/order/entities/order.entity';
import { OrderItemEntity } from '../operation/order/entities/order-item.entity';
import { PaymentEntity } from '../operation/payment/entities/payment.entity';
import { RestaurantTableEntity } from '../master-data/restaurant-table/entities/restaurant-table.entity';
import { UserResponseDto } from '../system/user/dto/user-response.dto';

export function dashboardRoles(user: UserResponseDto): RoleEnum[] {
  const roles = [RoleEnum.ADMIN, RoleEnum.RECEPTIONIST, RoleEnum.COOKER, RoleEnum.CASHIER];
  return roles.filter(role => user.isSuperUser === true || user.roles?.some(entry => entry.status === true && entry.name === role));
}

export function dashboardDay(now: Date) {
  const offset = 7 * 60 * 60 * 1000;
  const date = new Date(now.getTime() + offset).toISOString().slice(0, 10);
  const start = new Date(`${date}T00:00:00+07:00`);
  return { date, start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(OrderEntity) private readonly orders: Repository<OrderEntity>,
    @InjectRepository(OrderItemEntity) private readonly items: Repository<OrderItemEntity>,
    @InjectRepository(PaymentEntity) private readonly payments: Repository<PaymentEntity>,
    @InjectRepository(RestaurantTableEntity) private readonly tables: Repository<RestaurantTableEntity>,
  ) {}

  async summary(user: UserResponseDto, requestedRole?: RoleEnum) {
    const roles = dashboardRoles(user);
    const role = requestedRole ?? roles[0];
    if (!role || !roles.includes(role)) throw new ForbiddenException('Dashboard role is not assigned to this user');
    const now = new Date();
    const { date, start, end } = dashboardDay(now);
    const metrics: { key: string; value: number | string }[] = [];
    const active = [OrderStatus.DRAFT, OrderStatus.PENDING, OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.SERVED];
    const statuses = role === RoleEnum.COOKER ? [OrderStatus.PENDING, OrderStatus.PREPARING]
      : role === RoleEnum.CASHIER ? [OrderStatus.READY, OrderStatus.SERVED] : active;
    const queueQuery = this.orders.createQueryBuilder('o')
      .leftJoin('o.table', 'table')
      .select(['o.id AS "id"', 'o.orderNumber AS "orderNumber"', 'o.status AS "status"', 'o.createdAt AS "createdAt"', 'table.name AS "tableName"'])
      .where('o.status IN (:...statuses)', { statuses });
    const [queue, queueCount] = await Promise.all([
      queueQuery.clone().orderBy('o.createdAt', 'ASC').addOrderBy('o.id', 'ASC').limit(10).getRawMany(),
      queueQuery.clone().getCount(),
    ]);
    metrics.push({ key: role === RoleEnum.COOKER ? 'kitchen_orders' : role === RoleEnum.CASHIER ? 'awaiting_payment' : 'active_orders', value: queueCount });

    let tableStatuses: { status: string; count: number }[] = [];
    if (role === RoleEnum.ADMIN || role === RoleEnum.RECEPTIONIST) {
      const [todayOrders, grouped] = await Promise.all([
        this.orders.createQueryBuilder('o').where('o.createdAt >= :start AND o.createdAt < :end', { start, end }).getCount(),
        this.tables.createQueryBuilder('table').select('table.status', 'status').addSelect('COUNT(*)', 'count')
          .where('table.active = :active', { active: true }).groupBy('table.status').getRawMany(),
      ]);
      tableStatuses = grouped.map(row => ({ status: row.status, count: Number(row.count) }));
      metrics.push({ key: 'orders_today', value: todayOrders }, { key: 'available_tables', value: tableStatuses.find(row => row.status === 'available')?.count ?? 0 },
        { key: 'occupied_tables', value: tableStatuses.find(row => row.status === 'occupied')?.count ?? 0 });
    }
    if (role === RoleEnum.COOKER) {
      const grouped = await this.items.createQueryBuilder('line').innerJoin('line.order', 'o')
        .select('line.status', 'status').addSelect('SUM(line.quantity)', 'quantity')
        .where('o.status IN (:...statuses)', { statuses })
        .andWhere('line.status IN (:...lineStatuses)', { lineStatuses: ['PENDING', 'PREPARING', 'READY'] })
        .groupBy('line.status').getRawMany();
      for (const status of ['PENDING', 'PREPARING', 'READY']) {
        metrics.push({ key: `${status.toLowerCase()}_items`, value: Number(grouped.find(row => row.status === status)?.quantity ?? 0) });
      }
    }
    let recentPayments: { id: number; paymentNo: string; total: string; paymentMethod: string; createdAt: Date }[] = [];
    if (role === RoleEnum.ADMIN || role === RoleEnum.CASHIER) {
      const paid = this.payments.createQueryBuilder('p')
        .where('p.paymentStatus = :completed', { completed: PaymentStatus.COMPLETED })
        .andWhere('p.createdAt >= :start AND p.createdAt < :end', { start, end });
      if (role === RoleEnum.CASHIER) paid.andWhere('p.paidByUserId = :userId', { userId: user.id });
      const [totals, recent] = await Promise.all([
        paid.clone().select('COUNT(*)', 'count').addSelect('COALESCE(SUM(p.total), 0)::numeric(24,2)::text', 'total').getRawOne(),
        paid.clone().select(['p.id AS "id"', 'p.paymentNo AS "paymentNo"', 'p.total AS "total"', 'p.paymentMethod AS "paymentMethod"', 'p.createdAt AS "createdAt"'])
          .orderBy('p.createdAt', 'DESC').addOrderBy('p.id', 'DESC').limit(8).getRawMany(),
      ]);
      metrics.push({ key: role === RoleEnum.ADMIN ? 'sales_today' : 'my_sales_today', value: totals?.total ?? '0.00' },
        { key: role === RoleEnum.ADMIN ? 'payments_today' : 'my_payments_today', value: Number(totals?.count ?? 0) });
      recentPayments = recent;
    }
    return { role, roles, date, timeZone: 'Asia/Phnom_Penh', generatedAt: now.toISOString(), metrics, tableStatuses, queue, queueCount, recentPayments };
  }
}
