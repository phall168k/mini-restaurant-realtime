import type { IAttachment } from './attachment'
import type { IUser } from './user'
import type { OrderStatus, OrderItemStatus } from '~/constants/order-status'
import type { RestaurantTableStatuseEnum } from '~/constants/restaurant-table-status.enum'
export interface IOrderTableOption {
  id: number
  code: string
  name: string
  capacity: number
  status: RestaurantTableStatuseEnum
  sortOrder?: number
  sort_order?: number
}
export interface IOrderItemOption {
  discount?: string
  thumbnail?: IAttachment | null
  id: number
  categoryId: number
  code: string
  nameEn: string
  nameKh: string
}
export interface IOrderLineForm {
  itemId: number | null
  quantity: number | undefined
  unitPrice: string
  discount: string
  status: OrderItemStatus
  note: string
}
export interface IOrderLine extends Omit<
  IOrderLineForm,
  'itemId' | 'quantity' | 'note'
> {
  id: number
  orderId: number
  itemId: number
  quantity: number
  item: IOrderItemOption | null
  note: string | null
}
export interface IOrderForm {
  orderNumber: string
  tableId: number | null
  status: OrderStatus
  discount: string
  note: string
  items: IOrderLineForm[]
}
export interface IOrder extends Omit<IOrderForm, 'tableId' | 'items' | 'note'> {
  id: number
  tableId: number
  table: IOrderTableOption | null
  note: string | null
  items: IOrderLine[]
  createdByUserId: number
  createdByUser: IUser | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}
export interface IOrderListResponse {
  payload: {
    currentPage: number
    skippedRecords: number
    totalPages: number
    hasNext: boolean
    content: IOrder[]
    payloadSize: number
    totalRecords: number
  }
  timestamp: number
}
