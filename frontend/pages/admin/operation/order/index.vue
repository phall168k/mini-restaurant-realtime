<script setup lang="ts">
import OrderPos from '~/components/admin/OrderPos.vue'
import FoodThumbnail from '~/components/admin/FoodThumbnail.vue'
import { ElMessageBox } from 'element-plus'
import { Plus, Search, Refresh, EditPen, Delete } from '@element-plus/icons-vue'
import en from 'element-plus/es/locale/lang/en'
import km from 'element-plus/es/locale/lang/km'
import type { IUser } from '~/types/user'
import { RoleEnum } from '~/constants/role.enum'
import { ORDER_STATUSES } from '~/constants/order-status'
import type { IOrderItemOption } from '~/types/order'
import type { IOrder, IOrderForm, IOrderListResponse } from '~/types/order'

definePageMeta({
  title: 'Orders',
  titleKey: 'order.title',
  hidePageHeader: true,
})

const { t, locale } = useI18n()
const elementLocale = computed(() => (locale.value === 'km' ? km : en))

const user = useCookie<IUser | null>('users')
const canManageOrders = computed(
  () =>
    user.value?.isSuperUser === true ||
    user.value?.roles?.some(
      (role) => role.status && role.name === RoleEnum.RECEPTIONIST,
    ) === true,
)
const submittingId = ref<number | null>(null)
const endpoint = 'admin/operation/orders'
const orders = ref<IOrder[]>([])
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const search = ref('')
const appliedSearch = ref('')
const loading = ref(false)
const saving = ref(false)
const deletingId = ref<number | null>(null)
const listError = ref('')
const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const statusFilter = ref('')
const selectedOrder = ref<IOrder>()
function itemLabel(item: IOrderItemOption) {
  return `${item.code} — ${locale.value === 'km' ? item.nameKh : item.nameEn}`
}
function statusType(status: string): 'info' | 'warning' | 'success' | 'danger' {
  if (status === 'CANCELED') return 'danger'
  if (['READY', 'SERVED', 'PAID'].includes(status)) return 'success'
  if (['PENDING', 'PREPARING'].includes(status)) return 'warning'
  return 'info'
}
function closeForm() {
  if (!saving.value) dialogVisible.value = false
}
let requestId = 0

function errorMessage(error: unknown, fallback: string): string {
  const message = (error as { data?: { message?: unknown } })?.data?.message
  if (typeof message === 'string') return message
  if (
    Array.isArray(message) &&
    message.every((item) => typeof item === 'string')
  )
    return message.join(' ')
  return fallback
}

async function loadOrders() {
  const currentRequest = ++requestId
  loading.value = true
  listError.value = ''
  try {
    const response = await useApi<IOrderListResponse>(endpoint, {
      params: {
        page: page.value,
        limit: pageSize.value,
        search: appliedSearch.value || undefined,
        status: statusFilter.value || undefined,
        orderBy: 'id',
        orderDirection: 'DESC',
      },
    })
    if (currentRequest !== requestId) return
    const lastPage = Math.max(
      1,
      Math.ceil(response.payload.totalRecords / pageSize.value),
    )
    if (page.value > lastPage) {
      page.value = lastPage
      return await loadOrders()
    }
    orders.value = response.payload.content
    total.value = response.payload.totalRecords
  } catch (error) {
    if (currentRequest !== requestId) return
    orders.value = []
    total.value = 0
    listError.value = errorMessage(error, t('order.load_error'))
  } finally {
    if (currentRequest === requestId) loading.value = false
  }
}

function searchOrders() {
  appliedSearch.value = search.value.trim()
  page.value = 1
  loadOrders()
}

function changePage(value: number) {
  page.value = value
  loadOrders()
}

function changePageSize(value: number) {
  pageSize.value = value
  page.value = 1
  loadOrders()
}

function openForm(order?: IOrder) {
  if (
    !canManageOrders.value ||
    submittingId.value !== null ||
    saving.value ||
    deletingId.value !== null ||
    dialogVisible.value
  )
    return
  editingId.value = order?.id ?? null
  selectedOrder.value = order
  dialogVisible.value = true
}

async function savePosOrder(data: IOrderForm) {
  if (saving.value) return
  saving.value = true
  const isEditing = editingId.value !== null
  try {
    await useApi(isEditing ? `${endpoint}/${editingId.value}` : endpoint, {
      method: isEditing ? 'put' : 'post',
      body: data,
    })
    dialogVisible.value = false
    useMessage(t(isEditing ? 'order.updated' : 'order.created'))
    await loadOrders()
  } catch (error) {
    useMessage(errorMessage(error, t('order.save_error')), 'error')
  } finally {
    saving.value = false
  }
}

async function submitToKitchen(order: IOrder) {
  if (
    !canManageOrders.value ||
    order.status !== 'DRAFT' ||
    submittingId.value !== null ||
    saving.value ||
    deletingId.value !== null
  )
    return
  submittingId.value = order.id
  try {
    await ElMessageBox.confirm(
      t('order.submit_confirm', { name: order.orderNumber }),
      t('order.submit_kitchen'),
      {
        confirmButtonText: t('order.submit_kitchen'),
        cancelButtonText: t('order.cancel'),
        type: 'warning',
      },
    )
    const response = await useApi<{ payload: IOrder }>(
      `${endpoint}/${order.id}/submit`,
      { method: 'post' },
    )
    const index = orders.value.findIndex((item) => item.id === order.id)
    if (index !== -1) orders.value[index] = response.payload
    useMessage(t('order.submitted'))
    await loadOrders()
  } catch (error) {
    if (error === 'cancel' || error === 'close') return
    useMessage(errorMessage(error, t('order.submit_error')), 'error')
    await loadOrders()
  } finally {
    submittingId.value = null
  }
}

async function deleteOrder(order: IOrder) {
  if (
    !canManageOrders.value ||
    submittingId.value !== null ||
    saving.value ||
    deletingId.value !== null
  )
    return
  deletingId.value = order.id
  try {
    await ElMessageBox.confirm(
      t('order.delete_confirm', { name: order.orderNumber }),
      t('order.delete_title'),
      {
        confirmButtonText: t('order.delete'),
        cancelButtonText: t('order.cancel'),
        type: 'warning',
      },
    )
    await useApi(`${endpoint}/${order.id}`, { method: 'delete' })
    useMessage(t('order.deleted'))
    await loadOrders()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      useMessage(errorMessage(error, t('order.delete_error')), 'error')
    }
  } finally {
    deletingId.value = null
  }
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString(locale.value === 'km' ? 'km-KH' : 'en-US')
}

onMounted(loadOrders)
onBeforeRouteLeave(() => !saving.value)
onBeforeUnmount(() => {
  requestId++
})
</script>

<template>
  <el-config-provider :locale="elementLocale">
    <section
      class="order-workspace"
      :aria-label="t('order.title')"
    >
        <header
            class="mb-6 flex flex-wrap items-center justify-between gap-4"
        >
            <div>
                <h1 class="text-2xl font-semibold tracking-tight text-slate-900">
                    {{ t('order.title') }}
                </h1>
                <p class="mt-1 text-sm text-slate-500">{{ t('order.subtitle') }}</p>
            </div>
            <el-button
                type="primary"
                :icon="Plus"
                size="large"
                class="order-create-button"
                :disabled="saving || deletingId !== null || submittingId !== null"
                v-if="canManageOrders"
                @click="openForm()"
                >{{ t('order.create') }}</el-button
            >
        </header>
        <div class="order-list-surface">
        <div class="order-toolbar">
            <div class="flex min-w-0 flex-1 items-center gap-3">
                <h2 class="text-sm font-semibold text-slate-800">{{ t('order.title') }}</h2>
                <span class="order-count">{{ total }}</span>
            </div>
            <form class="flex w-full flex-wrap items-center gap-2 md:w-auto" role="search" @submit.prevent="searchOrders">
                <el-input v-model="search" :prefix-icon="Search" :placeholder="t('order.search_placeholder')" :aria-label="t('order.search_placeholder')" clearable size="large" class="!w-full sm:!w-80" @clear="searchOrders" />
                <el-button native-type="submit" size="large">{{ t('order.search') }}</el-button>
                <el-button :icon="Refresh" size="large" :aria-label="t('order.retry')" :loading="loading" @click="loadOrders" />
            </form>
        </div>
        <div class="order-status-filters" role="group" :aria-label="t('order.status')">
            <button type="button" :class="['order-filter', { 'is-active': !statusFilter }]" :aria-pressed="!statusFilter" @click="statusFilter = ''; searchOrders()">{{ t('order.all_statuses') }}</button>
            <button v-for="status in ORDER_STATUSES" :key="status" type="button" :class="['order-filter', { 'is-active': statusFilter === status }]" :aria-pressed="statusFilter === status" @click="statusFilter = status; searchOrders()">
                <span :class="['order-status-dot', `is-${status.toLowerCase()}`]" aria-hidden="true" />{{ t(`order.statuses.${status}`) }}
            </button>
        </div>
        <el-alert
            v-if="listError"
            :title="listError"
            type="error"
            show-icon
            :closable="false"
            class="mb-4"
            ><el-button link @click="loadOrders">{{
            t('order.retry')
            }}</el-button></el-alert
        >
        <el-table
            v-loading="loading"
            :data="orders"
            row-key="id"
            max-height="70vh"
            :empty-text="listError ? t('order.load_error') : t('order.empty')"
            class="order-list-table"
        >
            <el-table-column :label="t('order.number')" min-width="200">
                <template #default="{ row }">
                    <div class="text-sm font-semibold tracking-tight text-slate-900">{{ row.orderNumber }}</div>
                    <el-tag type="success" size="large" class="mt-3">{{ row.table?.name || `#${row.tableId}` }}</el-tag>
                    <div class="mt-2 text-xs text-slate-500">{{ formatDate(row.createdAt) }}</div>
                    <div class="mt-1 text-xs text-slate-500">{{ t('order.created_by') }}: {{ row.createdByUser?.username || '—' }}</div>
                </template>
            </el-table-column>
            <el-table-column :label="t('order.items')" min-width="360">
                <template #default="{ row }">
                    <div v-if="!row.items?.length" class="py-3 text-slate-400">—</div>
                    <div v-for="line in row.items" :key="line.id" class="flex items-start gap-3 border-b border-slate-100 py-3 last:border-0">
                        <div class="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-100 text-slate-400">
                            <FoodThumbnail :attachment="line.item?.thumbnail" :alt="line.item ? itemLabel(line.item) : `#${line.itemId}`" />
                        </div>
                        <div class="min-w-0 flex-1">
                            <div class="text-sm font-medium text-slate-900">{{ line.item ? (locale === 'km' ? line.item.nameKh : line.item.nameEn) : `#${line.itemId}` }}</div>
                            <div class="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                                <span>{{ t('order.unit_price') }}: {{ line.unitPrice }}</span>
                                <span v-if="Number(line.discount) > 0">{{ t('order.discount') }}: {{ line.discount }}</span>
                            </div>
                            <p v-if="line.note" class="mt-2 whitespace-pre-wrap break-words text-xs text-slate-600">{{ t('order.note') }}: {{ line.note }}</p>
                        </div>
                        <div class="flex shrink-0 flex-col items-end gap-2">
                            <span class="rounded-lg bg-slate-100 px-2 py-0.5 text-sm font-semibold tabular-nums text-slate-700" :aria-label="`${t('order.quantity')}: ${line.quantity}`">× {{ line.quantity }}</span>
                            <el-tag size="small" round effect="light" :type="statusType(line.status)">{{ t(`order.statuses.${line.status}`) }}</el-tag>
                        </div>
                    </div>
                </template>
            </el-table-column>
            <el-table-column :label="t('order.status')" width="140">
                <template #default="{ row }"><el-tag round effect="light" :type="statusType(row.status)">{{ t(`order.statuses.${row.status}`) }}</el-tag></template>
            </el-table-column>
            <el-table-column :label="t('order.note')" min-width="180">
                <template #default="{ row }">
                    <p class="whitespace-pre-wrap break-words text-slate-600">{{ row.note || '—' }}</p>
                    <p v-if="Number(row.discount) > 0" class="mt-3 text-xs text-slate-500">{{ t('order.discount') }}: {{ row.discount }}</p>
                </template>
            </el-table-column>
            <el-table-column v-if="canManageOrders" :label="t('order.actions')" width="190" fixed="right">
                <template #default="{ row }">
                    <div class="flex flex-col gap-2 py-2">
                        <el-button v-if="row.status === 'DRAFT'" type="primary" class="!ml-0 !w-full" :loading="submittingId === row.id" :disabled="saving || deletingId !== null || submittingId !== null" @click="submitToKitchen(row)">
                            {{ t('order.submit_kitchen') }}
                        </el-button>
                        <div class="flex items-center justify-end gap-2">
                            <el-button :icon="EditPen" :aria-label="`${t('order.edit')}: ${row.orderNumber}`" class="!ml-0" :disabled="saving || deletingId !== null || submittingId !== null" @click="openForm(row)">{{ t('order.edit') }}</el-button>
                            <el-button :icon="Delete" :aria-label="`${t('order.delete')}: ${row.orderNumber}`" plain type="danger" class="!ml-0" :loading="deletingId === row.id" :disabled="saving || deletingId !== null || submittingId !== null" @click="deleteOrder(row)" />
                        </div>
                    </div>
                </template>
            </el-table-column>
        </el-table>
        <div class="overflow-x-auto border-t border-slate-100 px-5 py-4">
            <el-pagination
                :current-page="page"
                :page-size="pageSize"
                :page-sizes="[10, 20]"
                :total="total"
                :disabled="loading"
                layout="total, sizes, prev, pager, next"
                @current-change="changePage"
                @size-change="changePageSize"
            />
        </div>
        </div>
        <el-dialog
            v-model="dialogVisible"
            fullscreen
            :show-close="false"
            :close-on-press-escape="!saving"
            :before-close="closeForm"
            :title="editingId !== null ? t('order.edit') : t('order.pos.title')"
            class="order-pos-dialog"
            destroy-on-close
        >
            <OrderPos
                v-if="dialogVisible"
                :saving="saving"
                :order="selectedOrder"
                @submit="savePosOrder"
                @close="closeForm"
            />
        </el-dialog>
    </section>
</el-config-provider>
</template>

<style>
    .order-list-table .el-table__cell {
        vertical-align: top;
    }
    .order-pos-dialog.el-dialog {
        padding: 0;
    }
    .order-pos-dialog > .el-dialog__header {
        display: none;
    }
    .order-pos-dialog > .el-dialog__body {
        padding: 0;
    }
</style>

<style scoped>
.order-workspace { padding: 8px; }
.order-list-surface { overflow: hidden; border: 1px solid #e2e8f0; border-radius: 18px; background: #fff; box-shadow: 0 4px 24px -16px rgb(15 23 42 / 18%); }
.order-toolbar { display: flex; align-items: center; flex-wrap: wrap; gap: 16px; padding: 20px; }
.order-count { border-radius: 8px; background: #f1f5f9; padding: 3px 9px; font-size: 12px; font-weight: 600; color: #475569; font-variant-numeric: tabular-nums; }
.order-create-button { border-radius: 10px; box-shadow: 0 3px 8px rgb(59 130 246 / 14%); }
.order-status-filters { display: flex; gap: 6px; overflow-x: auto; padding: 0 20px 18px; }
.order-filter { display: inline-flex; align-items: center; gap: 7px; white-space: nowrap; border-radius: 9px; padding: 8px 12px; font-size: 13px; font-weight: 500; color: #64748b; transition: background .15s, color .15s; }
.order-filter:hover { background: #f1f5f9; color: #0f172a; }
.order-filter.is-active { background: #0f172a; color: #fff; }
.order-filter:focus-visible { outline: 2px solid #3b82f6; outline-offset: 2px; }
.order-status-dot { width: 6px; height: 6px; border-radius: 50%; background: #94a3b8; }
.order-status-dot.is-pending { background: #f59e0b; }
.order-status-dot.is-preparing { background: #3b82f6; }
.order-status-dot.is-ready, .order-status-dot.is-served, .order-status-dot.is-paid { background: #22c55e; }
.order-status-dot.is-canceled { background: #f87171; }
.order-table-badge { display: inline-block; border: 1px solid #e2e8f0; border-radius: 7px; padding: 3px 8px; font-size: 12px; font-weight: 500; color: #475569; background: #f8fafc; }
.order-list-table { --el-table-header-bg-color: #f8fafc; --el-table-row-hover-bg-color: #fafcff; --el-table-border-color: #edf1f5; }
.order-list-table :deep(th.el-table__cell) { padding: 12px 0; color: #64748b; font-size: 12px; font-weight: 600; }
.order-list-table :deep(td.el-table__cell) { padding: 18px 0; }
.order-list-table :deep(.cell) { padding-left: 18px; padding-right: 18px; }
.order-list-table :deep(.el-tag) { border-color: transparent; font-weight: 500; }
.order-toolbar :deep(.el-input__wrapper), .order-toolbar :deep(.el-button) { border-radius: 9px; }
@media (max-width: 640px) { .order-workspace { padding: 0; } .order-toolbar { padding: 16px; } .order-status-filters { padding-left: 16px; padding-right: 16px; } }
</style>
