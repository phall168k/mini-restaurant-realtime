export const RealtimeEvent = {
  SOCKET_CONNECTED: 'socket:connected',
  SOCKET_ERROR: 'socket:error',
  KITCHEN_ORDER_NEW: 'kitchen:order-new',
  KITCHEN_ORDER_UPDATED: 'kitchen:order-updated',
  ORDER_STATUS_CHANGED: 'order:status-changed',
  ORDER_ITEM_STATUS_CHANGED: 'order:item-status-changed',
  ORDER_READY: 'order:ready',
  ORDER_CANCELED: 'order:canceled',
  TABLE_STATUS_CHANGED: 'table:status-changed',
} as const;