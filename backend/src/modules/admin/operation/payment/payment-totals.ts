import { BadRequestException } from '@nestjs/common';
import { OrderEntity } from '../order/entities/order.entity';
import { OrderItemStatus } from '../../../../libs/enums/order-item-status.enum';

// Integer cents avoid rounding errors from floating-point arithmetic.
function cents(value: string): bigint {
  if (typeof value !== 'string' || !/^\d{1,12}(\.\d{1,2})?$/.test(value))
    throw new BadRequestException('Invalid payment amount');
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
}
function amount(value: bigint): string {
  if (value < 0n || value > 99999999999999n)
    throw new BadRequestException('Payment amount is out of range');
  return `${value / 100n}.${String(value % 100n).padStart(2, '0')}`;
}
export function calculatePaymentTotals(
  order: OrderEntity,
  receivedAmount: string,
) {
  const lines = order.items.filter(
    (line) => line.status !== OrderItemStatus.CANCELED,
  );
  if (!lines.length)
    throw new BadRequestException('Order has no payable items');
  let subTotal = 0n;
  let discount = cents(order.discount);
  for (const line of lines) {
    if (!Number.isInteger(line.quantity) || line.quantity < 1)
      throw new BadRequestException('Invalid item quantity');
    const price = cents(line.unitPrice),
      unitDiscount = cents(line.discount);
    if (unitDiscount > price)
      throw new BadRequestException('Item discount exceeds its price');
    subTotal += price * BigInt(line.quantity);
    discount += unitDiscount * BigInt(line.quantity);
  }
  if (discount > subTotal)
    throw new BadRequestException('Discount exceeds subtotal');
  const total = subTotal - discount;
  const received = cents(receivedAmount);
  if (received < total)
    throw new BadRequestException('Received amount is less than the total');
  return {
    subTotal: amount(subTotal),
    discount: amount(discount),
    total: amount(total),
    receivedAmount: amount(received),
    changeAmount: amount(received - total),
  };
}
