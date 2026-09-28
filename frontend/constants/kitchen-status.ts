export const KITCHEN_STATUSES = ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELED'] as const
export type KitchenStatus = (typeof KITCHEN_STATUSES)[number]
