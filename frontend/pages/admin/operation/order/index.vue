<script setup lang="ts">
import OrderAddItem from '~/components/admin/OrderAddItem.vue'
import OrderPos from '~/components/admin/OrderPos.vue'
import FoodThumbnail from '~/components/admin/FoodThumbnail.vue'
import { ElMessageBox } from 'element-plus'
import { Plus, Search, Refresh } from '@element-plus/icons-vue'
import en from 'element-plus/es/locale/lang/en'
import km from 'element-plus/es/locale/lang/km'
import type { IUser } from '~/types/user'
import { RoleEnum } from '~/constants/role.enum'
import {
  ORDER_STATUSES,
  ORDER_ITEM_STATUSES,
  type OrderStatus,
} from '~/constants/order-status'
import type {
  IOrder,
  IOrderForm,
  IOrderListResponse,
  IOrderItemOption,
  IOrderItemStatusChange,
} from '~/types/order'
import { RealtimeEvent } from '~/constants/realtime-events'

// Page metadata and localization.
definePageMeta({
  title: 'Orders',
  titleKey: 'order.title',
  hidePageHeader: true,
})

const { t, locale } = useI18n()
const elementLocale = computed(() => (locale.value === 'km' ? km : en))

// Permissions: only Receptionists and superusers can manage orders.
const user = useCookie<IUser | null>('users')
const canManageOrders = computed(
  () =>
    user.value?.isSuperUser === true ||
    user.value?.roles?.some(
      (role) => role.status && role.name === RoleEnum.RECEPTIONIST,
    ) === true,
)
// Order list: keep the applied search separate from text still being entered.
const endpoint = 'admin/operation/orders'
const orders = ref<IOrder[]>([])
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const search = ref('')
const appliedSearch = ref('')
const statusFilter = ref<OrderStatus | ''>('')
const loading = ref(false)
const listError = ref('')
let requestId = 0

// Create/edit dialog and mutation state shared by all action buttons.
const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const selectedOrder = ref<IOrder>()
const saving = ref(false)
const submittingId = ref<number | null>(null)
const deletingId = ref<number | null>(null)
const servingId = ref<number | null>(null)
// Add-item dialog keeps its target separate from the create/edit POS form.
const addItemVisible = ref(false)
const addItemOrder = ref<IOrder | null>(null)
const addingItem = ref(false)
const mutationInProgress = computed(
  () =>
    saving.value ||
    addingItem.value ||
    submittingId.value !== null ||
    deletingId.value !== null ||
    servingId.value !== null,
)

// Presentation helpers for localized item labels, dates, and status badges.
function itemLabel(item: IOrderItemOption) {
  return `${item.code} — ${locale.value === 'km' ? item.nameKh : item.nameEn}`
}
function statusType(status: string): 'info' | 'warning' | 'success' | 'danger' {
  if (status === 'CANCELED') return 'danger'
  if (['READY', 'SERVED', 'PAID'].includes(status)) return 'success'
  if (['PENDING', 'PREPARING'].includes(status)) return 'warning'
  return 'info'
}
function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString(locale.value === 'km' ? 'km-KH' : 'en-US')
}

// Normalize API errors for the list and mutation notifications.

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

// Fetch the current page; ignore stale responses and recover after the last row is deleted.
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

// Search, status filters, and pagination share the same list request.
function selectStatus(status: OrderStatus | '') {
  statusFilter.value = status
  searchOrders()
}

function searchOrders() {
  appliedSearch.value = search.value.trim()
  page.value = 1
  void loadOrders()
}

function changePage(value: number) {
  page.value = value
  void loadOrders()
}

function changePageSize(value: number) {
  pageSize.value = value
  page.value = 1
  void loadOrders()
}

// Open the POS for creation or editing; do not interrupt an active mutation.
function closeForm() {
  if (!saving.value) dialogVisible.value = false
}

function openForm(order?: IOrder) {
  if (!canManageOrders.value || mutationInProgress.value || dialogVisible.value)
    return
  editingId.value = order?.id ?? null
  selectedOrder.value = order
  dialogVisible.value = true
}

// Save the POS form through the create or update endpoint, then refresh the list.
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

// Confirm draft submission before sending the order to the kitchen.
async function submitToKitchen(order: IOrder) {
  if (
    !canManageOrders.value ||
    order.status !== 'DRAFT' ||
    mutationInProgress.value
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

// Confirm serving a ready order, then refresh status-filtered results after saving.
async function serveOrder(order: IOrder) {
  if (
    !canManageOrders.value ||
    mutationInProgress.value ||
    order.status !== 'READY'
  )
    return
  servingId.value = order.id
  try {
    await ElMessageBox.confirm(
      t('order.serve_confirm', { name: order.orderNumber }),
      t('order.serve'),
      {
        confirmButtonText: t('order.serve'),
        cancelButtonText: t('order.cancel'),
        type: 'warning',
      },
    )
    const response = await useApi<{ payload: IOrder }>(
      `${endpoint}/${order.id}/serve`,
      { method: 'post' },
    )
    const index = orders.value.findIndex((item) => item.id === order.id)
    if (index !== -1) orders.value[index] = response.payload
    useMessage(t('order.served_success'))
    await loadOrders()
  } catch (error) {
    if (error === 'cancel' || error === 'close') return
    useMessage(errorMessage(error, t('order.serve_error')), 'error')
    await loadOrders()
  } finally {
    servingId.value = null
  }
}

// Confirm deletion and keep the row busy until the request completes.
async function deleteOrder(order: IOrder) {
  if (!canManageOrders.value || mutationInProgress.value) return
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

// Append an item through the dedicated endpoint; existing lines are never resubmitted.
function canAddItem(order: IOrder) {
  return ['DRAFT', 'PENDING', 'PREPARING', 'READY'].includes(order.status)
}

function openAddItem(order: IOrder) {
  if (
    !canManageOrders.value ||
    !canAddItem(order) ||
    mutationInProgress.value ||
    dialogVisible.value ||
    addItemVisible.value
  )
    return
  addItemOrder.value = order
  addItemVisible.value = true
}

async function saveAdditionalItem(item: {
  itemId: number
  quantity: number
  unitPrice: string
  discount: string
  note: string
}) {
  if (!canManageOrders.value || mutationInProgress.value || !addItemOrder.value)
    return
  addingItem.value = true
  try {
    await useApi<{ payload: IOrder }>(
      `${endpoint}/${addItemOrder.value.id}/items`,
      { method: 'post', body: item },
    )
    addItemVisible.value = false
    useMessage(t('order.item_added'))
    await loadOrders()
  } catch (error) {
    useMessage(errorMessage(error, t('order.item_add_error')), 'error')
  } finally {
    addingItem.value = false
  }
}

// =========================
// Realtime Features
// =========================
const { $socket } = useNuxtApp()

// Validate socket data before patching the order header and its changed line.
function handleOrderStatusChange(payload: IOrderItemStatusChange) {
  if (
    !payload ||
    !Number.isInteger(payload.id) ||
    payload.id <= 0 ||
    !ORDER_STATUSES.includes(payload.status) ||
    !payload.item ||
    !Number.isInteger(payload.item.orderItemId) ||
    payload.item.orderItemId <= 0 ||
    !ORDER_ITEM_STATUSES.includes(payload.item.status)
  )
    return

  const order = orders.value.find((order) => order.id === payload.id)
  const previousStatus = order?.status
  const missingLine =
    !!order && !order.items.some((line) => line.id === payload.item.orderItemId)

  function updateOrder(target: IOrder | null | undefined) {
    if (!target || target.id !== payload.id) return
    target.status = payload.status
    const line = target.items.find(
      (line) => line.id === payload.item.orderItemId,
    )
    if (line) line.status = payload.item.status
  }

  updateOrder(order)
  updateOrder(selectedOrder.value)
  updateOrder(addItemOrder.value)

  // Reload when membership in the filtered page may change or local lines are incomplete.
  // Restart an in-flight load as well, so its older snapshot cannot undo this update.
  if (
    loading.value ||
    missingLine ||
    (statusFilter.value &&
      ((order && previousStatus !== payload.status) ||
        (!order && payload.status === statusFilter.value)))
  )
    void loadOrders()
}

// Lifecycle: load the list and invalidate pending requests when leaving the page.
onMounted(() => {
  void loadOrders()
  $socket.on(RealtimeEvent.ORDER_ITEM_STATUS_CHANGED, handleOrderStatusChange)
})
onBeforeRouteLeave(
  () => !saving.value && !addingItem.value && servingId.value === null,
)
onBeforeUnmount(() => {
  requestId++
  $socket.off(RealtimeEvent.ORDER_ITEM_STATUS_CHANGED, handleOrderStatusChange)
})
</script>

<template>
  <el-config-provider :locale="elementLocale">
    <section class="order-workspace" :aria-label="t('order.title')">
      <!-- Page title and create action. -->
      <header class="mb-6 flex flex-wrap items-center justify-between gap-4">
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
          :disabled="mutationInProgress"
          v-if="canManageOrders"
          @click="openForm()"
        >
          {{ t('order.create') }}
        </el-button>
      </header>
      <div class="order-list-surface">
        <!-- Search the catalog of orders and refresh the current page. -->
        <div class="order-toolbar">
          <div class="flex min-w-0 flex-1 items-center gap-3">
            <h2 class="text-sm font-semibold text-slate-800">
              {{ t('order.title') }}
            </h2>
            <span class="order-count">{{ total }}</span>
          </div>
          <form
            class="flex w-full flex-wrap items-center gap-2 md:w-auto"
            role="search"
            @submit.prevent="searchOrders"
          >
            <el-input
              v-model="search"
              :prefix-icon="Search"
              :placeholder="t('order.search_placeholder')"
              :aria-label="t('order.search_placeholder')"
              clearable
              size="large"
              class="!w-full sm:!w-80"
              @clear="searchOrders"
            />
            <el-button native-type="submit" size="large">{{
              t('order.search')
            }}</el-button>
            <el-button
              :icon="Refresh"
              size="large"
              :aria-label="t('order.retry')"
              :loading="loading"
              @click="loadOrders"
            />
          </form>
        </div>
        <!-- Filter orders by their header status. -->
        <div
          class="order-status-filters"
          role="group"
          :aria-label="t('order.status')"
        >
          <button
            type="button"
            :class="['order-filter', { 'is-active': !statusFilter }]"
            :aria-pressed="!statusFilter"
            @click="selectStatus('')"
          >
            {{ t('order.all_statuses') }}
          </button>
          <button
            v-for="status in ORDER_STATUSES"
            :key="status"
            type="button"
            :class="['order-filter', { 'is-active': statusFilter === status }]"
            :aria-pressed="statusFilter === status"
            @click="selectStatus(status)"
          >
            <span
              :class="['order-status-dot', `is-${status.toLowerCase()}`]"
              aria-hidden="true"
            />{{ t(`order.statuses.${status}`) }}
          </button>
        </div>
        <!-- Show list failures with a retry action. -->
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
        <!-- Order details, line items, and permitted row actions. -->
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
              <div class="text-sm font-semibold tracking-tight text-slate-900">
                {{ row.orderNumber }}
              </div>
              <el-tag type="success" size="large" class="mt-3">{{
                row.table?.name || `#${row.tableId}`
              }}</el-tag>
              <div class="mt-2 text-xs text-slate-500">
                {{ formatDate(row.createdAt) }}
              </div>
              <div class="mt-1 text-xs text-slate-500">
                {{ t('order.created_by') }}:
                {{ row.createdByUser?.username || '—' }}
              </div>
            </template>
          </el-table-column>
          <el-table-column :label="t('order.items')" min-width="360">
            <template #default="{ row }">
              <div v-if="!row.items?.length" class="py-3 text-slate-400">—</div>
              <div
                v-for="line in row.items"
                :key="line.id"
                class="flex items-start gap-3 border-b border-slate-100 py-3 last:border-0"
              >
                <div
                  class="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-100 text-slate-400"
                >
                  <FoodThumbnail
                    :attachment="line.item?.thumbnail"
                    :alt="line.item ? itemLabel(line.item) : `#${line.itemId}`"
                  />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="text-sm font-medium text-slate-900">
                    {{
                      line.item
                        ? locale === 'km'
                          ? line.item.nameKh
                          : line.item.nameEn
                        : `#${line.itemId}`
                    }}
                  </div>
                  <div
                    class="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500"
                  >
                    <span
                      >{{ t('order.unit_price') }}: {{ line.unitPrice }}</span
                    >
                    <span v-if="Number(line.discount) > 0"
                      >{{ t('order.discount') }}: {{ line.discount }}</span
                    >
                  </div>
                  <p
                    v-if="line.note"
                    class="mt-2 whitespace-pre-wrap break-words text-xs text-slate-600"
                  >
                    {{ t('order.note') }}: {{ line.note }}
                  </p>
                </div>
                <div class="flex shrink-0 flex-col items-end gap-2">
                  <span
                    class="rounded-lg bg-slate-100 px-2 py-0.5 text-sm font-semibold tabular-nums text-slate-700"
                    :aria-label="`${t('order.quantity')}: ${line.quantity}`"
                    >× {{ line.quantity }}</span
                  >
                  <el-tag
                    size="small"
                    round
                    effect="light"
                    :type="statusType(line.status)"
                    >{{ t(`order.statuses.${line.status}`) }}</el-tag
                  >
                </div>
              </div>
            </template>
          </el-table-column>
          <el-table-column :label="t('order.status')" width="140">
            <template #default="{ row }"
              ><el-tag round effect="light" :type="statusType(row.status)">{{
                t(`order.statuses.${row.status}`)
              }}</el-tag></template
            >
          </el-table-column>
          <el-table-column :label="t('order.note')" min-width="180">
            <template #default="{ row }">
              <p class="whitespace-pre-wrap break-words text-slate-600">
                {{ row.note || '—' }}
              </p>
              <p
                v-if="Number(row.discount) > 0"
                class="mt-3 text-xs text-slate-500"
              >
                {{ t('order.discount') }}: {{ row.discount }}
              </p>
            </template>
          </el-table-column>
          <el-table-column
            v-if="canManageOrders"
            :label="t('order.actions')"
            width="300"
            fixed="right"
          >
            <template #default="{ row }">
              <div class="flex items-center gap-2">
                <el-button
                  v-if="row.status === 'DRAFT'"
                  :aria-label="`${t('order.submit_kitchen')}: ${row.orderNumber}`"
                  type="primary"
                  :loading="submittingId === row.id"
                  :disabled="mutationInProgress"
                  size="large"
                  round
                  plain
                  @click="submitToKitchen(row)"
                >
                  <Icon name="gg:push-chevron-right-o" />
                </el-button>
                <!-- Add more item to order -->
                <el-button
                  v-if="canAddItem(row)"
                  :disabled="mutationInProgress"
                  @click="openAddItem(row)"
                  :aria-label="`${t('order.add_item')}: ${row.orderNumber}`"
                  type="primary"
                  size="large"
                  round
                  plain
                >
                  <Icon name="ant-design:plus-circle-outlined" />
                </el-button>
                <!-- Finished button: only ready orders can be marked served. -->
                <el-button
                  v-if="row.status === 'READY'"
                  type="success"
                  :aria-label="`${t('order.serve')}: ${row.orderNumber}`"
                  :title="t('order.serve')"
                  :loading="servingId === row.id"
                  :disabled="mutationInProgress"
                  size="large"
                  round
                  plain
                  @click="serveOrder(row)"
                >
                  <Icon name="lucide:check-check" />
                </el-button>
                <!-- Edit order -->
                <el-button
                  type="success"
                  :aria-label="`${t('order.edit')}: ${row.orderNumber}`"
                  round
                  size="large"
                  :disabled="mutationInProgress"
                  plain
                  @click="openForm(row)"
                >
                  <Icon name="akar-icons:edit" />
                </el-button>
                <el-button
                  :aria-label="`${t('order.delete')}: ${row.orderNumber}`"
                  plain
                  type="danger"
                  size="large"
                  :loading="deletingId === row.id"
                  :disabled="mutationInProgress"
                  @click="deleteOrder(row)"
                  round
                >
                  <Icon name="fluent:delete-24-regular" />
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
        <!-- Pagination for the filtered order list. -->
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
      <!-- Fullscreen POS shared by create and edit features. -->
      <!-- Add one item to an existing order without opening the full POS editor. -->
      <el-dialog
        v-model="addItemVisible"
        :title="`${t('order.add_item')} — ${addItemOrder?.orderNumber ?? ''}`"
        width="min(520px, 94vw)"
        destroy-on-close
        :show-close="!addingItem"
        :close-on-click-modal="!addingItem"
        :close-on-press-escape="!addingItem"
      >
        <OrderAddItem
          v-if="addItemVisible"
          :saving="addingItem"
          @submit="saveAdditionalItem"
          @close="addItemVisible = false"
        />
      </el-dialog>
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
/* Element Plus dialog overrides must reach its teleported content. */
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
/* Order list layout, toolbar, filters, and responsive presentation. */
.order-workspace {
  padding: 8px;
}
.order-list-surface {
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 4px 24px -16px rgb(15 23 42 / 18%);
}
.order-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  padding: 20px;
}
.order-count {
  border-radius: 8px;
  background: #f1f5f9;
  padding: 3px 9px;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  font-variant-numeric: tabular-nums;
}
.order-create-button {
  border-radius: 10px;
  box-shadow: 0 3px 8px rgb(59 130 246 / 14%);
}
.order-status-filters {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding: 0 20px 18px;
}
.order-filter {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  white-space: nowrap;
  border-radius: 9px;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
  transition:
    background 0.15s,
    color 0.15s;
}
.order-filter:hover {
  background: #f1f5f9;
  color: #0f172a;
}
.order-filter.is-active {
  background: #0f172a;
  color: #fff;
}
.order-filter:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}
.order-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #94a3b8;
}
.order-status-dot.is-pending {
  background: #f59e0b;
}
.order-status-dot.is-preparing {
  background: #3b82f6;
}
.order-status-dot.is-ready,
.order-status-dot.is-served,
.order-status-dot.is-paid {
  background: #22c55e;
}
.order-status-dot.is-canceled {
  background: #f87171;
}
.order-list-table {
  --el-table-header-bg-color: #f8fafc;
  --el-table-row-hover-bg-color: #fafcff;
  --el-table-border-color: #edf1f5;
}
.order-list-table :deep(th.el-table__cell) {
  padding: 12px 0;
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
}
.order-list-table :deep(td.el-table__cell) {
  padding: 18px 0;
}
.order-list-table :deep(.cell) {
  padding-left: 18px;
  padding-right: 18px;
}
.order-list-table :deep(.el-tag) {
  border-color: transparent;
  font-weight: 500;
}
.order-toolbar :deep(.el-input__wrapper),
.order-toolbar :deep(.el-button) {
  border-radius: 9px;
}
@media (max-width: 640px) {
  .order-workspace {
    padding: 0;
  }
  .order-toolbar {
    padding: 16px;
  }
  .order-status-filters {
    padding-left: 16px;
    padding-right: 16px;
  }
}
</style>
