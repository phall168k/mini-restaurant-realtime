import type { RoleEnum } from '~/constants/role.enum'
import type { OrderStatus } from '~/constants/order-status'

export interface IDashboard {
  role: RoleEnum
  roles: RoleEnum[]
  date: string
  timeZone: string
  generatedAt: string
  metrics: { key: string; value: string | number }[]
  tableStatuses: { status: string; count: number }[]
  queueCount: number
  queue: { id: number; orderNumber: string; status: OrderStatus; createdAt: string; tableName: string | null }[]
  recentPayments: { id: number; paymentNo: string; total: string; paymentMethod: string; createdAt: string }[]
}
