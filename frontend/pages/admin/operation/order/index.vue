<script setup lang="ts">
import OrderPos from '~/components/admin/OrderPos.vue'
import { ElMessageBox } from 'element-plus'
import { Plus, Search } from '@element-plus/icons-vue'
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
      class="rounded-xl border border-slate-200 bg-white p-4 md:p-6"
      :aria-label="t('order.title')"
    >
        <header
            class="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5"
        >
            <div>
                <h1 class="text-xl font-semibold text-slate-900">
                    {{ t('order.title') }}
                </h1>
                <p class="mt-1 text-sm text-slate-500">{{ t('order.subtitle') }}</p>
            </div>
            <el-button
                type="primary"
                :icon="Plus"
                :disabled="saving || deletingId !== null || submittingId !== null"
                v-if="canManageOrders"
                @click="openForm()"
                >{{ t('order.create') }}</el-button
            >
        </header>
        <form
            class="mb-5 flex flex-wrap gap-2"
            role="search"
            @submit.prevent="searchOrders"
        >
            <el-input
                v-model="search"
                :prefix-icon="Search"
                :placeholder="t('order.search_placeholder')"
                :aria-label="t('order.search_placeholder')"
                clearable
                class="!w-full sm:!w-80"
                @clear="searchOrders"
            />
            <el-select
                v-model="statusFilter"
                clearable
                :placeholder="t('order.all_statuses')"
                :aria-label="t('order.status')"
                class="!w-48"
                @change="searchOrders"
            >
            <el-option
                v-for="status in ORDER_STATUSES"
                :key="status"
                :value="status"
                :label="t(`order.statuses.${status}`)"
            />
            </el-select>
            <el-button 
                native-type="submit" 
                :icon="Search"
            >
                {{ t('order.search') }}
            </el-button>
        </form>
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
            :empty-text="t('order.empty')"
        >
            <el-table-column type="expand">
                <template #default="{ row }">
                    <div class="p-4">
                        <p class="mb-3 text-sm">
                            {{ t('order.note') }}: {{ row.note || '—' }}
                        </p>
                        <el-table :data="row.items" row-key="id">
                            <el-table-column 
                                :label="t('order.item')" 
                                min-width="200"
                            >
                                <template #default="{ row: line }">
                                    {{ line.item ? itemLabel(line.item) : `#${line.itemId}` }}
                                </template>
                            </el-table-column>
                            <el-table-column
                                prop="quantity"
                                :label="t('order.quantity')"
                                width="110"
                            />
                            <el-table-column
                                prop="unitPrice"
                                :label="t('order.unit_price')"
                                width="130"
                            />
                            <el-table-column
                                prop="discount"
                                :label="t('order.discount')"
                                width="130"
                            />
                            <el-table-column 
                                :label="t('order.status')" 
                                width="150"
                            >
                                <template #default="{ row: line }">
                                    {{ t(`order.statuses.${line.status}`) }}
                                </template>
                            </el-table-column>
                            <el-table-column
                                prop="note"
                                :label="t('order.note')"
                                min-width="180"
                            />
                        </el-table>
                    </div>
                </template>
            </el-table-column>
            <el-table-column
                prop="orderNumber"
                :label="t('order.number')"
                min-width="170"
                show-overflow-tooltip
            />
            <el-table-column 
                :label="t('order.table')" 
                min-width="180"
            >
                <template #default="{ row }">
                    {{
                        row.table
                        ? `${row.table.code} — ${row.table.name}`
                        : `#${row.tableId}`
                    }}
                </template>
            </el-table-column>
            <el-table-column 
                :label="t('order.status')" 
                width="150"
            >
                <template #default="{ row }">
                    <el-tag>{{ t(`order.statuses.${row.status}`) }}</el-tag>
                </template>
            </el-table-column>
            <el-table-column
                prop="discount"
                :label="t('order.discount')"
                width="130"
            />
            <el-table-column 
                :label="t('order.items')" 
                width="100"
            >
                <template #default="{ row }">
                    {{ row.items.length }}
                </template>
            </el-table-column>
            <el-table-column 
                :label="t('order.created_by')" 
                min-width="150"
            >
                <template #default="{ row }">
                    {{ row.createdByUser?.username || '—' }}
                </template>
            </el-table-column>
            <el-table-column 
                :label="t('order.created_at')" 
                min-width="190"
            >
                <template #default="{ row }">
                    {{ formatDate(row.createdAt) }}
                </template>
            </el-table-column>
            <el-table-column
                v-if="canManageOrders"
                :label="t('order.actions')"
                width="310"
                fixed="right"
            >
                <template #default="{ row }">
                    <el-tag
                        v-if="row.status === 'DRAFT'"
                        type="primary"
                        size="large"
                        class="cursor-pointer mr-2"
                        :loading="submittingId === row.id"
                        :disabled="saving || deletingId !== null || submittingId !== null"
                        @click="submitToKitchen(row)"
                    >
                    <Icon name="twemoji:cook"/> {{ t('order.submit_kitchen') }}
                    </el-tag>
                    <el-tag
                        link
                        type="success"
                        size="large"
                        class="cursor-pointer mr-2"
                        :disabled="saving || deletingId !== null || submittingId !== null"
                        @click="openForm(row)"
                    >
                        <Icon name="akar-icons:edit"/>
                    </el-tag>
                    <el-tag
                        link
                        type="danger"
                        size="large"
                        class="cursor-pointer"
                        :loading="deletingId === row.id"
                        :disabled="saving || deletingId !== null || submittingId !== null"
                        @click="deleteOrder(row)"
                    >
                        <Icon name="mi:delete"/>
                    </el-tag>
                </template>
            </el-table-column>
        </el-table>
        <div class="mt-5 overflow-x-auto">
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
