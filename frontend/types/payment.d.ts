import type { IOrder, IOrderListResponse } from './order'
import type { IAttachment } from './attachment'
import type { PaymentMethodEnum } from '~/constants/payment-method.enum'
import type { PaymentStatus } from '~/constants/payment-status.enum'

export interface IPaymentForm {
  orderId: number
  paymentMethod: PaymentMethodEnum
  receivedAmount: string
  referenceNo: string
  attachment: IAttachment[]
}
export interface IPayment extends Omit<IPaymentForm, 'referenceNo' | 'attachment'> {
  referenceNo: string | null
  attachment: IAttachment[] | null
  id: number
  paymentNo: string
  order: IOrder | null
  paymentStatus: PaymentStatus
  subTotal: string
  discount: string
  total: string
  changeAmount: string
  paidByUserId: number
  paidByUser: { id: number; username: string } | null
  createdAt: string
  updatedAt: string
}
export interface IPaymentListResponse {
  payload: Omit<IOrderListResponse['payload'], 'content'> & { content: IPayment[] }
}
