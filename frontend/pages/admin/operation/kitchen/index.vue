<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import FoodThumbnail from '~/components/admin/FoodThumbnail.vue'
import { Refresh, Search } from '@element-plus/icons-vue'
import en from 'element-plus/es/locale/lang/en'
import km from 'element-plus/es/locale/lang/km'
import type { OrderStatus, OrderItemStatus } from '~/constants/order-status'
import type { IOrder, IOrderLine, IOrderListResponse } from '~/types/order'
import type { IItem } from '~/types/item'
import { RealtimeEvent } from '~/constants/realtime-events'

// The orders endpoint may return item details without line pricing or notes.
type KitchenLine = Omit<
  IOrderLine,
  'unitPrice' | 'discount' | 'note' | 'item'
> & {
  unitPrice?: string
  discount?: string
  note?: string | null
  item: (IOrderLine['item'] & Partial<IItem>) | null
}
type KitchenOrder = Omit<IOrder, 'items'> & { items: KitchenLine[] }
type OrderListResponse = Omit<IOrderListResponse, 'payload'> & {
  payload: Omit<IOrderListResponse['payload'], 'content'> & {
    content: KitchenOrder[]
  }
}

// Page metadata and localization for labels, dates, and Element Plus controls.
definePageMeta({
  title: 'Kitchen',
  titleKey: 'kitchen.title',
  hidePageHeader: true,
})
const { t, locale } = useI18n()
const elementLocale = computed(() => (locale.value === 'km' ? km : en))
const endpoint = 'admin/operation/orders'

// Active and historical orders keep independent status selections.
const tab = ref<'active' | 'history'>('active')
const activeStatuses = ['PENDING', 'PREPARING', 'READY'] as const
const historyStatuses = ['SERVED', 'PAID', 'CANCELED'] as const
const activeStatus = ref<OrderStatus>('PENDING')
const historyStatus = ref<OrderStatus>('SERVED')
const statuses = computed(() =>
  tab.value === 'active' ? activeStatuses : historyStatuses,
)
const statusFilter = computed(() =>
  tab.value === 'active' ? activeStatus.value : historyStatus.value,
)

// List state: search text is applied only when the user submits or clears it.
const orders = ref<KitchenOrder[]>([])
const search = ref('')
const appliedSearch = ref('')
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const loading = ref(false)
const listError = ref('')
let listRequest = 0

// Detail drawer state and request tracking prevent stale responses from replacing a newer order.
const drawerVisible = ref(false)
const drawerLoading = ref(false)
const drawerError = ref('')
const drawerOrder = ref<KitchenOrder | null>(null)
const drawerOrderId = ref<number | null>(null)
let detailRequest = 0

// Preparation progress excludes canceled items and counts served items as ready.
const progressItems = computed(
  () =>
    drawerOrder.value?.items.filter((line) => line.status !== 'CANCELED') ?? [],
)
const readyCount = computed(
  () =>
    progressItems.value.filter((line) =>
      ['READY', 'SERVED'].includes(line.status),
    ).length,
)
const progress = computed(() =>
  progressItems.value.length
    ? Math.round((readyCount.value / progressItems.value.length) * 100)
    : 0,
)

// Item and bulk actions share a busy guard to prevent duplicate requests.
const updatingItem = ref<number | null>(null)
const makingAllReady = ref(false)
const actionsBusy = computed(
  () => updatingItem.value !== null || makingAllReady.value,
)
const readyCandidates = computed(
  () =>
    drawerOrder.value?.items.filter((line) =>
      ['PENDING', 'PREPARING'].includes(line.status),
    ) ?? [],
)
const canManageOrder = computed(
  () =>
    !!drawerOrder.value &&
    ['PENDING', 'PREPARING', 'READY'].includes(drawerOrder.value.status),
)

// Normalize API errors for user-facing notifications.
function errorMessage(error: unknown, fallback: string) {
  const message = (error as { data?: { message?: unknown } })?.data?.message
  return typeof message === 'string'
    ? message
    : Array.isArray(message)
      ? message.join(' ')
      : fallback
}
// Display helpers for localized item names, status badges, and timestamps.
function itemName(line: KitchenLine) {
  return line.item
    ? locale.value === 'km'
      ? line.item.nameKh
      : line.item.nameEn
    : `#${line.itemId}`
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

// Load filtered orders, ignore superseded requests, and recover when the last page disappears.
async function loadOrders() {
  const current = ++listRequest
  loading.value = true
  listError.value = ''
  try {
    const response = await useApi<OrderListResponse>(endpoint, {
      params: {
        page: page.value,
        limit: pageSize.value,
        status: statusFilter.value,
        search: appliedSearch.value || undefined,
        orderBy: 'createdAt',
        orderDirection: tab.value === 'active' ? 'ASC' : 'DESC',
      },
    })
    if (current !== listRequest) return
    const lastPage = Math.max(1, response.payload.totalPages)
    if (page.value > lastPage) {
      page.value = lastPage
      return await loadOrders()
    }
    orders.value = response.payload.content
    total.value = response.payload.totalRecords
  } catch (error) {
    if (current !== listRequest) return
    orders.value = []
    total.value = 0
    listError.value = errorMessage(error, t('order.load_error'))
  } finally {
    if (current === listRequest) loading.value = false
  }
}
// Search, status selection, tabs, and pagination reload the order list.
function applySearch() {
  appliedSearch.value = search.value.trim()
  page.value = 1
  void loadOrders()
}
function selectStatus(status: OrderStatus) {
  if (tab.value === 'active') activeStatus.value = status
  else historyStatus.value = status
  page.value = 1
  void loadOrders()
}
function changeTab() {
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
// Open order details and allow retrying failed requests from the drawer.
async function openDetails(id: number) {
  const current = ++detailRequest
  drawerOrderId.value = id
  drawerVisible.value = true
  drawerLoading.value = true
  drawerError.value = ''
  drawerOrder.value = null
  try {
    const response = await useApi<{ payload: KitchenOrder }>(
      `${endpoint}/${id}`,
    )
    if (current === detailRequest) drawerOrder.value = response.payload
  } catch (error) {
    if (current === detailRequest)
      drawerError.value = errorMessage(error, t('kitchen.details_error'))
  } finally {
    if (current === detailRequest) drawerLoading.value = false
  }
}

// Refresh the list after a mutation and reload details only if the same order is still open.
async function refreshAfterChange(orderId: number) {
  await loadOrders()
  if (drawerVisible.value && drawerOrderId.value === orderId)
    await openDetails(orderId)
}

// Use the same request shape for individual and bulk item updates.
function updateItemStatus(id: number, status: OrderItemStatus) {
  return useApi(`${endpoint}/${id}/change-item-status`, {
    method: 'post',
    body: { status },
  })
}

// Start or mark an item ready; cancellation requires confirmation before saving.
async function handleItemStatusChange(id: number, status: OrderItemStatus) {
  if (actionsBusy.value || !canManageOrder.value || !drawerOrder.value) return
  const orderId = drawerOrder.value.id
  updatingItem.value = id
  try {
    if (status === 'CANCELED') {
      try {
        await ElMessageBox.confirm(
          t('kitchen.cancel_confirm'),
          t('kitchen.cancel_item'),
          {
            type: 'warning',
            confirmButtonText: t('kitchen.cancel_item'),
            cancelButtonText: t('kitchen.keep_item'),
          },
        )
      } catch {
        return
      }
    }
    await updateItemStatus(id, status)
    ElMessage.success(t('kitchen.item_updated'))
    await refreshAfterChange(orderId)
  } catch (error) {
    ElMessage.error(errorMessage(error, t('kitchen.item_update_error')))
    await refreshAfterChange(orderId)
  } finally {
    updatingItem.value = null
  }
}

// Mark pending/preparing items ready and report partial failures without hiding successful updates.
async function makeAllReady() {
  if (
    actionsBusy.value ||
    !canManageOrder.value ||
    !drawerOrder.value ||
    !readyCandidates.value.length
  )
    return
  const orderId = drawerOrder.value.id
  const ids = readyCandidates.value.map((line) => line.id)
  makingAllReady.value = true
  try {
    const results = await Promise.allSettled(
      ids.map((id) => updateItemStatus(id, 'READY')),
    )
    const failed = results.filter(
      (result) => result.status === 'rejected',
    ).length
    if (failed)
      ElMessage.error(t('kitchen.bulk_partial_error', { count: failed }))
    else ElMessage.success(t('kitchen.all_ready_success'))
    await refreshAfterChange(orderId)
  } finally {
    makingAllReady.value = false
  }
}

//========================
// Realtime Features
//========================
const { $socket } = useNuxtApp();

// Handle set new item for ordering
const handleNewOrder = (item: IOrder) => {
  orders.value.push(item);
}

// Load the list initially and invalidate pending requests when leaving the page.
onMounted(() => {
  void loadOrders();
  $socket.on(RealtimeEvent.KITCHEN_ORDER_NEW, handleNewOrder);
});

onBeforeUnmount(() => {
  listRequest++
  detailRequest++
  $socket.off(
    RealtimeEvent.KITCHEN_ORDER_NEW,
    handleNewOrder,
  );
})
</script>

<template>
  <el-config-provider :locale="elementLocale">
    <section class="p-1 sm:p-2" :aria-label="t('kitchen.title')">
      <!-- Page title and description. -->
      <header class="mb-6">
        <h1 class="text-2xl font-semibold tracking-tight text-slate-900">
          {{ t('kitchen.title') }}
        </h1>
        <p class="mt-1 text-sm text-slate-500">
          {{ t('kitchen.orders_subtitle') }}
        </p>
      </header>
      <!-- Switch between active orders and history. -->
      <el-tabs v-model="tab" @tab-change="changeTab">
        <el-tab-pane :label="t('kitchen.active_orders')" name="active" />
        <el-tab-pane :label="t('kitchen.histories')" name="history" />
      </el-tabs>
      <div class="kitchen-surface">
        <div class="flex flex-wrap items-center justify-between gap-4 p-5">
          <div class="flex items-center gap-3">
            <h2 class="text-sm font-semibold text-slate-800">
              {{
                t(
                  tab === 'active'
                    ? 'kitchen.active_orders'
                    : 'kitchen.histories',
                )
              }}
            </h2>
            <span
              class="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600"
              >{{ total }}</span
            >
          </div>
          <!-- Search orders or manually refresh the list. -->
          <form
            class="flex w-full flex-wrap gap-2 md:w-auto"
            role="search"
            @submit.prevent="applySearch"
          >
            <el-input
              v-model="search"
              :prefix-icon="Search"
              :placeholder="t('order.search_placeholder')"
              :aria-label="t('order.search_placeholder')"
              clearable
              size="large"
              class="!w-full sm:!w-80"
              @clear="applySearch"
            />
            <el-button native-type="submit" size="large">{{
              t('order.search')
            }}</el-button>
            <el-button
              :icon="Refresh"
              :loading="loading"
              size="large"
              :aria-label="t('kitchen.retry')"
              @click="loadOrders"
            />
          </form>
        </div>
        <!-- Filter the selected tab by order status. -->
        <div
          class="kitchen-status-filters"
          role="group"
          :aria-label="t('order.status')"
        >
          <button
            v-for="status in statuses"
            :key="status"
            type="button"
            :class="[
              'kitchen-filter',
              { 'is-active': statusFilter === status },
            ]"
            :aria-pressed="statusFilter === status"
            @click="selectStatus(status)"
          >
            <span
              :class="['status-dot', `is-${status.toLowerCase()}`]"
              aria-hidden="true"
            />{{ t(`order.statuses.${status}`) }}
          </button>
        </div>
        <!-- List loading errors and retry action. -->
        <el-alert
          v-if="listError"
          :title="listError"
          type="error"
          show-icon
          :closable="false"
          class="mb-3"
          ><el-button link @click="loadOrders">{{
            t('kitchen.retry')
          }}</el-button></el-alert
        >
        <!-- Order summary, table, items, notes, and details action. -->
        <el-table
          v-loading="loading"
          :data="orders"
          row-key="id"
          max-height="68vh"
          :empty-text="listError ? t('order.load_error') : t('order.empty')"
          class="kitchen-table"
        >
          <el-table-column :label="t('kitchen.order')" min-width="200"
            ><template #default="{ row }"
              ><div class="font-semibold text-slate-900">
                {{ row.orderNumber }}
              </div>
              <div class="mt-3 text-xs text-slate-500">
                {{ formatDate(row.createdAt) }}
              </div>
              <div class="mt-1 text-xs text-slate-500">
                {{ t('order.created_by') }}:
                {{ row.createdByUser?.username || '—' }}
              </div></template
            ></el-table-column
          >
          <el-table-column :label="t('kitchen.table')" min-width="140"
            ><template #default="{ row }"
              ><div class="font-medium">
                {{ row.table?.name || `#${row.tableId}` }}
              </div>
              <div class="mt-1 text-xs text-slate-500">
                {{ row.table?.code }}
              </div></template
            ></el-table-column
          >
          <el-table-column :label="t('order.items')" min-width="360"
            ><template #default="{ row }">
              <div v-if="!row.items?.length" class="text-slate-400">—</div>
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
                    :alt="itemName(line)"
                  />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="font-medium text-slate-900">
                    {{ itemName(line) }}
                  </div>
                  <div class="mt-1 text-xs text-slate-500">
                    {{ line.item?.code }}
                  </div>
                  <p
                    v-if="line.note"
                    class="mt-1 whitespace-pre-wrap text-xs text-slate-600"
                  >
                    {{ line.note }}
                  </p>
                </div>
                <div class="flex flex-col items-end gap-2">
                  <span
                    class="rounded-md bg-slate-100 px-2 py-0.5 font-semibold"
                    :aria-label="`${t('order.quantity')}: ${line.quantity}`"
                    >× {{ line.quantity }}</span
                  ><el-tag size="small" round :type="statusType(line.status)">{{
                    t(`order.statuses.${line.status}`)
                  }}</el-tag>
                </div>
              </div>
            </template></el-table-column
          >
          <el-table-column :label="t('order.status')" width="140"
            ><template #default="{ row }"
              ><el-tag round :type="statusType(row.status)">{{
                t(`order.statuses.${row.status}`)
              }}</el-tag></template
            ></el-table-column
          >
          <el-table-column :label="t('order.note')" min-width="180"
            ><template #default="{ row }"
              ><p class="whitespace-pre-wrap break-words text-slate-600">
                {{ row.note || '—' }}
              </p></template
            ></el-table-column
          >
          <el-table-column
            :label="t('kitchen.actions')"
            width="165"
            fixed="right"
          >
            <template #default="{ row }">
              <el-button
                :aria-label="`${t('kitchen.details')}: ${row.orderNumber}`"
                @click="openDetails(row.id)"
              >
                <Icon name="bi:card-list" />
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        <!-- Pagination for the current search and status filter. -->
        <div class="overflow-x-auto border-t border-slate-100 p-4">
          <el-pagination
            :current-page="page"
            :page-size="pageSize"
            :page-sizes="[10, 20, 50]"
            :total="total"
            :disabled="loading"
            layout="total, sizes, prev, pager, next"
            @current-change="changePage"
            @size-change="changePageSize"
          />
        </div>
      </div>
      <!-- Order details with loading, error, and retry states. -->
      <el-drawer
        v-model="drawerVisible"
        direction="rtl"
        size="min(440px, 100vw)"
        :title="t('kitchen.details')"
      >
        <div v-loading="drawerLoading" class="min-h-48">
          <el-alert
            v-if="drawerError"
            :title="drawerError"
            type="error"
            :closable="false"
            ><el-button
              v-if="drawerOrderId !== null"
              link
              @click="openDetails(drawerOrderId)"
              >{{ t('kitchen.retry') }}</el-button
            ></el-alert
          >
          <template v-if="drawerOrder">
            <div class="mb-5 border-b border-slate-100 pb-5">
              <div class="flex justify-between gap-3">
                <h2 class="text-xl font-bold">{{ drawerOrder.orderNumber }}</h2>
                <el-tag :type="statusType(drawerOrder.status)">{{
                  t(`order.statuses.${drawerOrder.status}`)
                }}</el-tag>
              </div>
              <p class="mt-3 text-xs text-slate-500">
                {{ drawerOrder.table?.name || '—' }} ·
                {{ formatDate(drawerOrder.createdAt) }}
              </p>
              <h3 class="mt-5 text-sm font-semibold">{{ t('order.note') }}</h3>
              <p class="mt-2 whitespace-pre-wrap text-sm text-slate-500">
                {{ drawerOrder.note || t('kitchen.no_note') }}
              </p>
            </div>
            <h3 class="mb-3 font-semibold">
              {{ t('order.items') }} ({{ drawerOrder.items.length }})
            </h3>
            <!-- Item details and preparation actions. -->
            <article
              v-for="line in drawerOrder.items"
              :key="line.id"
              class="mb-3 rounded-xl border border-slate-200 p-3"
            >
              <div class="flex gap-3">
                <div
                  class="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-100 text-slate-400"
                >
                  <FoodThumbnail
                    :attachment="line.item?.thumbnail"
                    :alt="itemName(line)"
                  />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex justify-between gap-2">
                    <h4 class="text-sm font-semibold">{{ itemName(line) }}</h4>
                    <span class="shrink-0 font-semibold"
                      >× {{ line.quantity }}</span
                    >
                  </div>
                  <el-tag
                    class="mt-2"
                    size="small"
                    :type="statusType(line.status)"
                    >{{ t(`order.statuses.${line.status}`) }}</el-tag
                  >
                </div>
              </div>
              <p
                v-if="line.note"
                class="mt-3 whitespace-pre-wrap text-xs text-slate-500"
              >
                {{ t('order.note') }}: {{ line.note }}
              </p>
              <!-- Start, ready, and cancel actions are available only for eligible items. -->
              <div
                v-if="
                  canManageOrder &&
                  !['SERVED', 'CANCELED'].includes(line.status)
                "
                class="kitchen-item-actions"
                :aria-busy="actionsBusy"
              >
                <el-button
                  v-if="line.status === 'PENDING'"
                  class="kitchen-primary-action"
                  type="primary"
                  size="large"
                  :loading="updatingItem === line.id"
                  :disabled="actionsBusy"
                  @click="handleItemStatusChange(line.id, 'PREPARING')"
                >
                  <Icon name="lucide:play" size="16" /><span>{{
                    t('kitchen.start')
                  }}</span>
                </el-button>
                <el-button
                  v-if="['PENDING', 'PREPARING'].includes(line.status)"
                  class="kitchen-primary-action"
                  type="success"
                  size="large"
                  :plain="line.status === 'PENDING'"
                  :loading="updatingItem === line.id"
                  :disabled="actionsBusy"
                  @click="handleItemStatusChange(line.id, 'READY')"
                >
                  <Icon name="lucide:check" size="16" /><span>{{
                    t('kitchen.mark_ready')
                  }}</span>
                </el-button>
                <el-button
                  class="kitchen-cancel-action"
                  type="danger"
                  text
                  :disabled="actionsBusy"
                  @click="handleItemStatusChange(line.id, 'CANCELED')"
                >
                  <Icon name="lucide:x" size="14" /><span>{{
                    t('kitchen.cancel_item')
                  }}</span>
                </el-button>
              </div>
            </article>
            <!-- Preparation progress across non-canceled items. -->
            <div class="mt-6 rounded-xl bg-slate-50 p-4">
              <div class="mb-3 flex justify-between gap-2 text-sm">
                <h3 class="font-semibold">{{ t('kitchen.progress') }}</h3>
                <span
                  >{{ readyCount }} / {{ progressItems.length }}
                  {{ t('kitchen.ready') }} ({{ progress }}%)</span
                >
              </div>
              <el-progress
                :percentage="progress"
                :show-text="false"
                :stroke-width="12"
                :color="progress === 100 ? '#22c55e' : '#f5b800'"
              />
            </div>
          </template>
        </div>
        <!-- Bulk ready action with the remaining eligible item count. -->
        <template #footer>
          <div
            v-if="drawerOrder && canManageOrder"
            class="kitchen-bulk-actions"
          >
            <p class="mb-3 text-left text-xs text-slate-500" role="status">
              {{
                t(
                  readyCandidates.length
                    ? 'kitchen.ready_remaining'
                    : 'kitchen.no_pending_items',
                  { count: readyCandidates.length },
                )
              }}
            </p>
            <el-button
              type="success"
              class="!m-0 w-full !rounded-xl"
              size="large"
              :loading="makingAllReady"
              :disabled="
                actionsBusy || drawerLoading || !readyCandidates.length
              "
              @click="makeAllReady"
            >
              <Icon
                v-if="!makingAllReady"
                name="lucide:check-check"
                size="18"
                class="mr-2"
              />{{ t('kitchen.make_all_ready') }}
              <span
                v-if="readyCandidates.length"
                class="ml-2 rounded-md bg-white/20 px-2 text-xs"
                >{{ readyCandidates.length }}</span
              >
            </el-button>
          </div>
        </template>
      </el-drawer>
    </section>
  </el-config-provider>
</template>

<style scoped>
/* Individual and bulk preparation actions. */
.kitchen-item-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #f1f5f9;
}
.kitchen-item-actions :deep(.el-button) {
  margin: 0;
  border-radius: 10px;
}
.kitchen-primary-action {
  flex: 1 1 130px;
}
.kitchen-item-actions :deep(.el-button > span) {
  gap: 6px;
}
.kitchen-cancel-action {
  flex-basis: 100%;
}
.kitchen-bulk-actions {
  border-top: 1px solid #e2e8f0;
  padding-top: 16px;
}

/* Order list surface and status filters. */
.kitchen-surface {
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 4px 24px -16px rgb(15 23 42 / 18%);
}
.kitchen-status-filters {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding: 0 20px 18px;
}
.kitchen-filter {
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
.kitchen-filter:hover {
  background: #f1f5f9;
  color: #0f172a;
}
.kitchen-filter.is-active {
  background: #0f172a;
  color: #fff;
}
.kitchen-filter:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}
/* Status indicators shared by the filter buttons. */
.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #94a3b8;
}
.status-dot.is-pending {
  background: #f59e0b;
}
.status-dot.is-preparing {
  background: #3b82f6;
}
.status-dot.is-ready,
.status-dot.is-served,
.status-dot.is-paid {
  background: #22c55e;
}
.status-dot.is-canceled {
  background: #f87171;
}
/* Element Plus table presentation. */
.kitchen-table {
  --el-table-header-bg-color: #f8fafc;
  --el-table-border-color: #edf1f5;
  --el-table-row-hover-bg-color: #fafcff;
}
.kitchen-table :deep(th.el-table__cell) {
  padding: 12px 0;
  color: #64748b;
  font-size: 12px;
}
.kitchen-table :deep(td.el-table__cell) {
  padding: 18px 0;
  vertical-align: top;
}
.kitchen-table :deep(.cell) {
  padding-left: 18px;
  padding-right: 18px;
}
.kitchen-table :deep(.el-tag) {
  border-color: transparent;
}
</style>
