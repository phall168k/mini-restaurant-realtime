import type { ButtonProps, FormRules } from 'element-plus'

export type TableRow = { id: number | string; [key: string]: unknown }
export type TableForm = Record<string, unknown>

export interface TableHeader {
  key: string
  title: string
  width?: number | string
  minWidth?: number | string
  sort?: boolean
}

export interface TableAction {
  title: string
  icon?: string
  color?: ButtonProps['type']
  onClick: () => void
}

export interface TablePageHeader {
  pageTitle?: string
  actions?: TableAction[]
  rightActions?: TableAction[]
}

export interface TableOptions {
  defaultCreateValue?: TableForm | (() => TableForm)
  mapEditValue?: (row: TableRow) => TableForm
  mapSubmitValue?: (form: TableForm) => unknown
  updateMethod?: 'put' | 'patch'
  dialogOptions?: { fullscreen?: boolean; width?: string | number }
  rules?: FormRules
  pageSizes?: number[]
}

export interface TablePage {
  content: TableRow[]
  totalRecords: number
}
