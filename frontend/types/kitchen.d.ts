import type { KitchenStatus } from '~/constants/kitchen-status'
import type { OrderItemStatus } from '~/constants/order-status'
import type { IOrder, IOrderListResponse } from './order'
import type { IItem } from './item'

export interface IKitchenOrderItem {
  id: number
  orderId: number
  order: IOrder | null
  itemId: number
  quantity: number
  item: IItem | null
  status: OrderItemStatus
  createdAt: string
}
export interface IKitchen {
  id: number
  orderId: number
  order: IOrder | null
  performedById: number
  performedBy: { id: number; username: string } | null
  status: KitchenStatus
  description: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}
export interface IKitchenForm {
  orderId: number | null
  status: KitchenStatus
  description: string
}
export interface IKitchenListResponse {
  payload: Omit<IOrderListResponse['payload'], 'content'> & { content: IKitchen[] }
  timestamp: number
}
