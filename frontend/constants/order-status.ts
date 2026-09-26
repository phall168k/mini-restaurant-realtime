export const ORDER_STATUSES = [
  'DRAFT',
  'PENDING',
  'PREPARING',
  'READY',
  'SERVED',
  'PAID',
  'CANCELED',
] as const
export const ORDER_ITEM_STATUSES = [
  'PENDING',
  'PREPARING',
  'READY',
  'SERVED',
  'CANCELED',
] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]
export type OrderItemStatus = (typeof ORDER_ITEM_STATUSES)[number]
