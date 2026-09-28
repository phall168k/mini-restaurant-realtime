<script setup lang="ts">
import FoodThumbnail from '~/components/admin/FoodThumbnail.vue'
import { ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Check, VideoPlay, Search } from '@element-plus/icons-vue'
import en from 'element-plus/es/locale/lang/en'
import km from 'element-plus/es/locale/lang/km'
import type { KitchenStatus } from '~/constants/kitchen-status'
import { KITCHEN_STATUSES } from '~/constants/kitchen-status'
import type { IOrder, IOrderLine } from '~/types/order'

import { RoleEnum } from '~/constants/role.enum'
import type { IUser } from '~/types/user'
import type { IKitchen, IKitchenForm, IKitchenListResponse, IKitchenOrderItem } from '~/types/kitchen'

definePageMeta({ title: 'Kitchen', titleKey: 'kitchen.title', hidePageHeader: true })
const { t, locale } = useI18n()
const elementLocale = computed(() => locale.value === 'km' ? km : en)
const user = useCookie<IUser | null>('users')
const hasRole = (role: RoleEnum) => user.value?.isSuperUser === true || user.value?.roles?.some(r => r.status && r.name === role) === true
const canCreate = computed(() => hasRole(RoleEnum.COOKER))
const canEdit = computed(() => canCreate.value || hasRole(RoleEnum.ADMIN))
const activeTab = ref('active')
const endpoint = 'admin/operation/kitchens'
const records = ref<IKitchen[]>([])
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const search = ref('')
const appliedSearch = ref('')
const statusFilter = ref('')
const loading = ref(false)
const saving = ref(false)
const deletingId = ref<number | null>(null)
const busy = computed(() => saving.value || deletingId.value !== null)
const listError = ref('')
const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<FormInstance>()
const form = reactive<IKitchenForm>({ orderId: null, status: 'PENDING', description: '' })

const items = ref<IOrder[]>([])
const selectedItem = ref<IOrder | null>(null)
const itemsLoading = ref(false)
const itemsError = ref('')
const itemSearch = ref('')
const createError = ref('')
const drafts = reactive<Record<number, { status: KitchenStatus; description: string; saved: boolean }>>({})
const visibleItems = computed(() => items.value.filter(item => itemLabel(item).toLocaleLowerCase().includes(itemSearch.value.trim().toLocaleLowerCase())))
const drawerVisible = ref(false)
const drawerLoading = ref(false)
const drawerError = ref('')
const drawerOrder = ref<IOrder | null>(null)
const drawerOrderId = ref<number | null>(null)
let drawerRequest = 0
const progressItems = computed(() => (drawerOrder.value?.items ?? []).filter(line => line.status !== 'CANCELED'))
const readyCount = computed(() => progressItems.value.filter(line => ['READY', 'SERVED'].includes(line.status)).length)
const readyPercent = computed(() => progressItems.value.length ? Math.round(readyCount.value / progressItems.value.length * 100) : 0)
const makingReady = ref(false)
const canMakeReady = computed(() => !!drawerOrder.value &&
  ['PENDING', 'PREPARING', 'READY'].includes(drawerOrder.value.status) &&
  drawerOrder.value.items.some(line => ['PENDING', 'PREPARING'].includes(line.status)))
const itemAction = ref<{ id: number; action: 'start' | 'ready' } | null>(null)
function canUpdateItem(line: IOrderLine, action: 'start' | 'ready') {
  return !!drawerOrder.value && ['PENDING', 'PREPARING', 'READY'].includes(drawerOrder.value.status) &&
    (action === 'start' ? line.status === 'PENDING' : ['PENDING', 'PREPARING'].includes(line.status))
}
async function updateDrawerItem(line: IOrderLine, action: 'start' | 'ready') {
  if (busy.value || drawerLoading.value || !canCreate.value || !canUpdateItem(line, action) || !drawerOrder.value) return
  const orderId = drawerOrder.value.id
  saving.value = true
  itemAction.value = { id: line.id, action }
  drawerError.value = ''
  try {
    const response = await useApi<{ payload: IOrder }>(`${endpoint}/orders/${orderId}/items/${line.id}/${action}`, { method: 'patch' })
    drawerOrder.value = response.payload
    if (drafts[orderId]) drafts[orderId]!.status = response.payload.status === 'READY' ? 'READY' : 'PREPARING'
    await Promise.all([loadItems(), loadRecords()])
  } catch (error) {
    drawerError.value = errorMessage(error, t('kitchen.item_update_error'))
  } finally {
    itemAction.value = null
    saving.value = false
  }
}
async function makeAllReady() {
  if (busy.value || drawerLoading.value || !canCreate.value || !canMakeReady.value || !drawerOrder.value) return
  const id = drawerOrder.value.id
  saving.value = true
  makingReady.value = true
  drawerError.value = ''
  try {
    const response = await useApi<{ payload: IOrder }>(`${endpoint}/orders/${id}/ready`, { method: 'patch' })
    drawerOrder.value = response.payload
    if (drafts[id]) drafts[id]!.status = 'READY'
    useMessage(t('kitchen.all_ready_success'))
    await Promise.all([loadItems(), loadRecords()])
  } catch (error) {
    drawerError.value = errorMessage(error, t('kitchen.all_ready_error'))
  } finally {
    makingReady.value = false
    saving.value = false
  }
}
async function openOrderDetails(id: number) {
  const current = ++drawerRequest
  drawerOrderId.value = id
  drawerOrder.value = null
  drawerError.value = ''
  drawerVisible.value = true
  drawerLoading.value = true
  try {
    const response = await useApi<{ payload: IOrder }>(`admin/operation/orders/${id}`)
    if (current === drawerRequest) drawerOrder.value = response.payload
  } catch (error) {
    if (current === drawerRequest) drawerError.value = errorMessage(error, t('kitchen.details_error'))
  } finally { if (current === drawerRequest) drawerLoading.value = false }
}
function price(value: string | number) {
  const amount = Number(value)
  return Number.isFinite(amount) ? new Intl.NumberFormat(locale.value === 'km' ? 'km-KH' : 'en-US', { style: 'currency', currency: 'USD' }).format(amount) : '—'
}
const rowAction = ref<{ id: number; status: 'ACCEPTED' | 'CANCELED' } | null>(null)
async function saveItemAction(id: number, status: 'ACCEPTED' | 'CANCELED') {
  const draft = drafts[id]
  if (busy.value || itemsLoading.value || !canCreate.value || !draft || draft.saved) return
  saving.value = true
  rowAction.value = { id, status }
  createError.value = ''
  try {
    if (status === 'ACCEPTED') {
      const orderNumber = items.value.find(order => order.id === id)?.orderNumber || `#${id}`
      await ElMessageBox.confirm(
        t('kitchen.accept_confirm', { name: orderNumber }),
        t('kitchen.accept'),
        {
          confirmButtonText: t('kitchen.accept'),
          cancelButtonText: t('kitchen.cancel'),
          type: 'warning',
        },
      )
    }
    await useApi(endpoint, {
      method: 'post',
      body: { orderId: id, status, description: draft.description.trim() },
    })
    draft.status = status
    draft.saved = true
    useMessage(t(status === 'ACCEPTED' ? 'kitchen.order_accepted' : 'kitchen.order_canceled'))
    if (status === 'ACCEPTED') await openOrderDetails(id)
    await loadRecords()
  } catch (error) {
    if (error === 'cancel' || error === 'close') return
    createError.value = errorMessage(error, t('kitchen.save_error'))
  } finally {
    rowAction.value = null
    saving.value = false
  }
}
const itemOptions = computed(() => {
  const options = new Map(items.value.map(item => [item.id, item]))
  if (selectedItem.value) options.set(selectedItem.value.id, selectedItem.value)
  return [...options.values()]
})
const rules = computed<FormRules<IKitchenForm>>(() => ({
  orderId: [{ required: true, type: 'number', min: 1, message: t('kitchen.item_required'), trigger: 'change' }],
  status: [{ required: true, message: t('kitchen.status_required'), trigger: 'change' }],
}))
let requestId = 0
let itemRequestId = 0
function errorMessage(error: unknown, fallback: string) {
  const message = (error as { data?: { message?: unknown } })?.data?.message
  if (typeof message === 'string') return message
  if (Array.isArray(message) && message.every(item => typeof item === 'string')) return message.join(' ')
  return fallback
}
function itemName(item: IOrderLine | null) {
  if (!item) return '—'
  return item.item ? `${item.item.code} — ${locale.value === 'km' ? item.item.nameKh : item.item.nameEn}` : `#${item.itemId}`
}
function itemLabel(order: IOrder) {
  return `${order.orderNumber} · ${order.table?.name || '—'} · ${order.items.map(itemName).join(' ')}`
}
function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString(locale.value === 'km' ? 'km-KH' : 'en-US')
}
async function loadRecords() {
  const current = ++requestId
  loading.value = true
  listError.value = ''
  try {
    const response = await useApi<IKitchenListResponse>(endpoint, {
      params: { page: page.value, limit: pageSize.value, search: appliedSearch.value || undefined, status: statusFilter.value || undefined, orderBy: 'id', orderDirection: 'DESC' },
    })
    if (current !== requestId) return
    const lastPage = Math.max(1, Math.ceil(response.payload.totalRecords / pageSize.value))
    if (page.value > lastPage) { page.value = lastPage; return await loadRecords() }
    records.value = response.payload.content
    total.value = response.payload.totalRecords
  } catch (error) {
    if (current !== requestId) return
    records.value = []
    total.value = 0
    listError.value = errorMessage(error, t('kitchen.load_error'))
  } finally { if (current === requestId) loading.value = false }
}
function applyFilters() { appliedSearch.value = search.value.trim(); page.value = 1; loadRecords() }
function changePage(value: number) { page.value = value; loadRecords() }
function changePageSize(value: number) { pageSize.value = value; page.value = 1; loadRecords() }
async function loadItems() {
  const current = ++itemRequestId
  itemsLoading.value = true
  itemsError.value = ''
  items.value = []
  try {
    const response = await useApi<{ payload: IKitchenOrderItem[] }>('admin/operation/orders/items', { params: { status: 'PENDING' } })
    if (current === itemRequestId) {
      const grouped = new Map<number, IOrder>()
      for (const line of response.payload) {
        if (!line.order || ['DRAFT', 'CANCELED', 'PAID'].includes(line.order.status)) continue
        let order = grouped.get(line.orderId)
        if (!order) {
          order = { ...line.order, items: [] }
          grouped.set(line.orderId, order)
        }
        order.items.push({ id: line.id, orderId: line.orderId, itemId: line.itemId, item: line.item,
          quantity: line.quantity, status: line.status, unitPrice: line.item?.unitPrice ?? '0.00', discount: '0.00', note: null })
        drafts[line.orderId] ??= { status: 'PENDING', description: '', saved: false }
      }
      items.value = [...grouped.values()]
    }
  } catch (error) {
    if (current === itemRequestId) itemsError.value = errorMessage(error, t('kitchen.items_error'))
  } finally { if (current === itemRequestId) itemsLoading.value = false }
}
function selectItem(id: number) { selectedItem.value = itemOptions.value.find(item => item.id === id) ?? null }
async function openForm(record?: IKitchen) {
  if (busy.value || (record ? !canEdit.value : !canCreate.value)) return
  itemSearch.value = ''
  createError.value = ''
  editingId.value = record?.id ?? null
  selectedItem.value = record?.order ?? null
  Object.assign(form, { orderId: record?.orderId ?? null, status: record?.status ?? 'PENDING', description: record?.description ?? '' })
  dialogVisible.value = true
  // Admin-only editors can retain the item but cannot access the cooker item list.
  items.value = []
  itemsError.value = ''
  if (canCreate.value) void loadItems()
  await nextTick()
  formRef.value?.clearValidate()
}
async function saveRecord() {
  if (busy.value || !formRef.value || (editingId.value === null ? !canCreate.value : !canEdit.value)) return
  saving.value = true
  try {
    if (!await formRef.value.validate().catch(() => false)) return
    const editing = editingId.value !== null
    await useApi(editing ? `${endpoint}/${editingId.value}` : endpoint, {
      method: editing ? 'put' : 'post',
      body: { orderId: form.orderId, status: form.status, description: form.description.trim() },
    })
    dialogVisible.value = false
    useMessage(t(editing ? 'kitchen.updated' : 'kitchen.created'))
    await loadRecords()
  } catch (error) { useMessage(errorMessage(error, t('kitchen.save_error')), 'error') }
  finally { saving.value = false }
}
async function deleteRecord(record: IKitchen) {
  if (busy.value || !canCreate.value) return
  deletingId.value = record.id
  try {
    await ElMessageBox.confirm(t('kitchen.delete_confirm', { id: record.id }), t('kitchen.delete'), { confirmButtonText: t('kitchen.delete'), cancelButtonText: t('kitchen.cancel'), type: 'warning' })
    await useApi(`${endpoint}/${record.id}`, { method: 'delete' })
    useMessage(t('kitchen.deleted'))
    await loadRecords()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') useMessage(errorMessage(error, t('kitchen.delete_error')), 'error')
  } finally { deletingId.value = null }
}
onMounted(() => { void loadItems(); void loadRecords() })
onBeforeRouteLeave(() => !saving.value)
onBeforeUnmount(() => { requestId++; itemRequestId++; drawerRequest++ })
</script>

<template>
  <el-config-provider :locale="elementLocale">
    <section class="rounded-xl border border-slate-200 bg-white p-4 md:p-6" :aria-label="t('kitchen.title')">
      <header class="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div><h1 class="text-xl font-semibold text-slate-900">{{ t('kitchen.title') }}</h1><p class="mt-1 text-sm text-slate-500">{{ t('kitchen.subtitle') }}</p></div>
        
      </header>
      <el-tabs v-model="activeTab">
        <el-tab-pane :label="t('kitchen.active_orders')" name="active">
        <div>
          <p class="mb-4 text-slate-500">{{ t('kitchen.active_help') }}</p>
          <div class="mb-4 flex flex-wrap items-center gap-3">
            <el-input v-model="itemSearch" :disabled="saving" :prefix-icon="Search" :placeholder="t('kitchen.item_search')" :aria-label="t('kitchen.item_search')" clearable class="!w-full sm:!w-96" />
            <el-button :disabled="saving" :loading="itemsLoading" @click="loadItems">{{ t('kitchen.retry') }}</el-button>
          </div>
          <el-alert v-if="itemsError" :title="itemsError" type="error" :closable="false" show-icon class="mb-4" />
          <el-alert v-if="createError" :title="createError" type="error" :closable="false" show-icon class="mb-4" />
          <el-table v-loading="itemsLoading" :data="visibleItems" row-key="id" stripe :empty-text="t('kitchen.no_active_orders')" max-height="65vh">
            <el-table-column :label="t('kitchen.order')" min-width="170"><template #default="{ row }">{{ row.orderNumber }}</template></el-table-column>
            <el-table-column :label="t('kitchen.table')" min-width="140"><template #default="{ row }">{{ row.table?.name || '—' }}</template></el-table-column>
        <el-table-column :label="t('kitchen.item')" min-width="300">
          <template #default="{ row }">
            <div v-for="line in row.items" :key="line.id" class="flex items-center gap-3 py-2">
              <div class="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100 text-slate-400"><FoodThumbnail :attachment="line.item?.thumbnail" :alt="itemName(line)" /></div>
              <div class="flex-1">{{ itemName(line) }}</div>
              <span class="font-semibold" :aria-label="t('order.quantity')">× {{ line.quantity }}</span>
            </div>
          </template>
        </el-table-column>
            <el-table-column :label="t('kitchen.status')" min-width="180">
              <template #default="{ row }">
                <el-tag v-if="drafts[row.id]!.saved" :type="drafts[row.id]!.status === 'CANCELED' ? 'danger' : 'success'">{{ t(`kitchen.statuses.${drafts[row.id]!.status}`) }}</el-tag>
                <el-tag v-else type="info">{{ t('kitchen.statuses.PENDING') }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column :label="t('kitchen.description')" min-width="240"><template #default="{ row }"><el-input v-model="drafts[row.id]!.description" :disabled="saving || !canCreate || drafts[row.id]!.saved" type="textarea" :rows="2" :aria-label="t('kitchen.description')" /></template></el-table-column>
            <el-table-column v-if="canCreate" :label="t('kitchen.actions')" width="210" fixed="right">
              <template #default="{ row }">
                <el-button v-if="drafts[row.id]!.saved && drafts[row.id]!.status === 'ACCEPTED'" type="primary" plain :disabled="saving" @click="openOrderDetails(row.id)">{{ t('kitchen.details') }}</el-button>
                <el-button v-else type="success" :disabled="saving || itemsLoading || drafts[row.id]!.saved" :loading="rowAction?.id === row.id && rowAction?.status === 'ACCEPTED'" @click="saveItemAction(row.id, 'ACCEPTED')">{{ t('kitchen.accept') }}</el-button>
                <el-button type="danger" plain :disabled="saving || itemsLoading || drafts[row.id]!.saved" :loading="rowAction?.id === row.id && rowAction?.status === 'CANCELED'" @click="saveItemAction(row.id, 'CANCELED')">{{ t('kitchen.cancel') }}</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
        </el-tab-pane>
        <el-tab-pane :label="t('kitchen.histories')" name="histories">
      <form class="mb-5 flex flex-wrap gap-2" role="search" @submit.prevent="applyFilters">
        <el-input v-model="search" :prefix-icon="Search" :placeholder="t('kitchen.search_placeholder')" :aria-label="t('kitchen.search_placeholder')" clearable class="!w-full sm:!w-80" @clear="applyFilters" />
        <el-select v-model="statusFilter" clearable :placeholder="t('kitchen.all_statuses')" :aria-label="t('kitchen.status')" class="!w-48" @change="applyFilters">
          <el-option v-for="status in KITCHEN_STATUSES" :key="status" :value="status" :label="t(`kitchen.statuses.${status}`)" />
        </el-select>
        <el-button native-type="submit" :icon="Search">{{ t('kitchen.search') }}</el-button>
      </form>
      <el-alert v-if="listError" :title="listError" type="error" show-icon :closable="false" class="mb-4"><el-button link :loading="loading" @click="loadRecords">{{ t('kitchen.retry') }}</el-button></el-alert>
      <el-table v-loading="loading" :data="records" row-key="id" :empty-text="listError ? t('kitchen.load_error') : t('kitchen.empty')">
        <el-table-column prop="id" :label="t('kitchen.record')" width="90" />
        <el-table-column :label="t('kitchen.order')" min-width="170"><template #default="{ row }">{{ row.order?.orderNumber || '—' }}</template></el-table-column>
        <el-table-column :label="t('kitchen.table')" min-width="140"><template #default="{ row }">{{ row.order?.table?.name || '—' }}</template></el-table-column>
        <el-table-column :label="t('kitchen.item')" min-width="300">
          <template #default="{ row }">
            <div v-for="line in row.order?.items || []" :key="line.id" class="flex items-center gap-3 py-2">
              <div class="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100 text-slate-400"><FoodThumbnail :attachment="line.item?.thumbnail" :alt="itemName(line)" /></div>
              <div class="flex-1">{{ itemName(line) }}</div>
              <span class="font-semibold" :aria-label="t('order.quantity')">× {{ line.quantity }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column :label="t('kitchen.status')" min-width="140"><template #default="{ row }"><el-tag :type="row.status === 'CANCELED' ? 'danger' : ['READY', 'COMPLETED'].includes(row.status) ? 'success' : row.status === 'PENDING' ? 'info' : 'warning'">{{ t(`kitchen.statuses.${row.status}`) }}</el-tag></template></el-table-column>
        <el-table-column prop="description" :label="t('kitchen.description')" min-width="200" show-overflow-tooltip><template #default="{ row }">{{ row.description || '—' }}</template></el-table-column>
        <el-table-column :label="t('kitchen.performed_by')" min-width="150"><template #default="{ row }">{{ row.performedBy?.username || '—' }}</template></el-table-column>
        <el-table-column :label="t('kitchen.created_at')" min-width="190"><template #default="{ row }">{{ formatDate(row.createdAt) }}</template></el-table-column>
        <el-table-column v-if="canEdit" :label="t('kitchen.actions')" width="170" fixed="right"><template #default="{ row }">
          <el-button link type="primary" :disabled="busy" @click="openForm(row)">{{ t('kitchen.edit') }}</el-button>
          <el-button v-if="canCreate" link type="danger" :disabled="busy" :loading="deletingId === row.id" @click="deleteRecord(row)">{{ t('kitchen.delete') }}</el-button>
        </template></el-table-column>
      </el-table>
      <div class="mt-5 overflow-x-auto"><el-pagination :current-page="page" :page-size="pageSize" :page-sizes="[10, 20, 50]" :total="total" :disabled="loading" layout="total, sizes, prev, pager, next" @current-change="changePage" @size-change="changePageSize" /></div>

        </el-tab-pane>
      </el-tabs>
      <el-drawer v-model="drawerVisible" direction="rtl" size="min(440px, 100vw)" :title="t('kitchen.details')" class="kitchen-order-drawer" :close-on-click-modal="!saving" :close-on-press-escape="!saving" :show-close="!saving">
        <div v-loading="drawerLoading" class="min-h-48">
          <el-alert v-if="drawerError" :title="drawerError" type="error" :closable="false" show-icon>
            <el-button v-if="drawerOrderId" link :disabled="saving" @click="openOrderDetails(drawerOrderId)">{{ t('kitchen.retry') }}</el-button>
          </el-alert>
          <template v-if="drawerOrder">
            <div class="mb-5 border-b border-slate-100 pb-5">
              <div class="flex items-center justify-between gap-3">
                <h2 class="text-xl font-bold text-slate-900">{{ drawerOrder.orderNumber }}</h2>
                <el-tag :type="drawerOrder.status === 'READY' ? 'success' : 'warning'">{{ t(`order.statuses.${drawerOrder.status}`) }}</el-tag>
              </div>
              <div class="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                <span>{{ t('kitchen.table') }}: {{ drawerOrder.table?.name || '—' }}</span>
                <span>{{ formatDate(drawerOrder.createdAt) }}</span>
              </div>
              <h3 class="mt-5 text-sm font-semibold text-slate-900">{{ t('order.note') }}</h3>
              <p class="mt-2 whitespace-pre-wrap text-sm text-slate-500">{{ drawerOrder.note || t('kitchen.no_note') }}</p>
            </div>
            <h3 class="mb-3 font-semibold text-slate-900">{{ t('order.items') }} ({{ drawerOrder.items.length }})</h3>
            <div class="space-y-3">
              <article v-for="line in drawerOrder.items" :key="line.id" class="rounded-xl border border-slate-200 bg-white p-3">
                <div class="flex items-start gap-3">
                  <div class="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100 text-slate-400"><FoodThumbnail :attachment="line.item?.thumbnail" :alt="itemName(line)" /></div>
                  <div class="min-w-0 flex-1">
                    <div class="flex justify-between gap-2"><h4 class="text-sm font-semibold">{{ itemName(line) }}</h4><span class="shrink-0 text-sm font-semibold">× {{ line.quantity }}</span></div>
                    <div class="mt-1 flex justify-between gap-2 text-xs text-slate-500"><span>{{ price(line.unitPrice) }} {{ t('kitchen.each') }}</span><span class="font-semibold text-slate-700">{{ price(Number(line.unitPrice) * line.quantity) }}</span></div>
                    <el-tag class="mt-2" size="small" :type="['READY', 'SERVED'].includes(line.status) ? 'success' : line.status === 'CANCELED' ? 'danger' : 'warning'">{{ t(`order.statuses.${line.status}`) }}</el-tag>
                  </div>
                </div>
                <div v-if="canCreate" class="mt-3 grid grid-cols-2 gap-2">
                  <el-button class="!ml-0" :icon="VideoPlay" :disabled="saving || drawerLoading || !canUpdateItem(line, 'start')" :loading="itemAction?.id === line.id && itemAction?.action === 'start'" @click="updateDrawerItem(line, 'start')">{{ t('kitchen.start') }}</el-button>
                  <el-button class="!ml-0" type="success" plain :icon="Check" :disabled="saving || drawerLoading || !canUpdateItem(line, 'ready')" :loading="itemAction?.id === line.id && itemAction?.action === 'ready'" @click="updateDrawerItem(line, 'ready')">{{ t('kitchen.mark_ready') }}</el-button>
                </div>
                <p v-if="line.note" class="mt-3 whitespace-pre-wrap border-t border-slate-100 pt-2 text-xs text-slate-500">{{ t('order.note') }}: {{ line.note }}</p>
              </article>
            </div>
            <div class="mt-6 rounded-xl bg-slate-50 p-4">
              <div class="mb-3 flex justify-between gap-2 text-sm"><h3 class="font-semibold">{{ t('kitchen.progress') }}</h3><span>{{ readyCount }} / {{ progressItems.length }} {{ t('kitchen.ready') }} ({{ readyPercent }}%)</span></div>
              <el-progress :percentage="readyPercent" :show-text="false" :stroke-width="12" :color="readyPercent === 100 ? '#22c55e' : '#f5b800'" />
            </div>
          </template>
        </div>
        <template #footer>
          <el-button v-if="canCreate" type="success" size="large" class="!w-full" :icon="Check" :loading="makingReady" :disabled="saving || drawerLoading || !canMakeReady" @click="makeAllReady">{{ t('kitchen.make_all_ready') }}</el-button>
        </template>
      </el-drawer>
      <el-dialog 
        v-model="dialogVisible" 
        :title="t(editingId === null ? 'kitchen.create' : 'kitchen.edit')" 
        fullscreen
        :close-on-click-modal="!saving" 
        :close-on-press-escape="!saving" 
        :show-close="!saving" 
        destroy-on-close
      >
        <el-form ref="formRef" :model="form" :rules="rules" label-position="top" :disabled="saving" class="mx-auto max-w-3xl" @submit.prevent="saveRecord">
          <el-alert v-if="itemsError" :title="itemsError" type="error" :closable="false" class="mb-4" />
          <el-form-item :label="t('kitchen.order')" prop="orderId">
            <el-select v-model="form.orderId" filterable :loading="itemsLoading" :disabled="!canCreate" class="w-full" @change="selectItem">
              <el-option v-for="item in itemOptions" :key="item.id" :value="item.id" :label="itemLabel(item)" />
              <el-option v-if="form.orderId && !itemOptions.some(item => item.id === form.orderId)" :value="form.orderId" :label="`#${form.orderId}`" />
            </el-select>
          </el-form-item>
          <el-form-item :label="t('kitchen.status')" prop="status"><el-select v-model="form.status" class="w-full"><el-option v-for="status in KITCHEN_STATUSES" :key="status" :value="status" :label="t(`kitchen.statuses.${status}`)" /></el-select></el-form-item>
          <el-form-item :label="t('kitchen.description')" prop="description"><el-input v-model="form.description" type="textarea" :rows="3" /></el-form-item>
          <div class="flex justify-end gap-2"><el-button :disabled="saving" @click="dialogVisible = false">{{ t('kitchen.cancel') }}</el-button><el-button type="primary" native-type="submit" :loading="saving">{{ t('kitchen.save') }}</el-button></div>
        </el-form>
      </el-dialog>
    </section>
  </el-config-provider>
</template>
