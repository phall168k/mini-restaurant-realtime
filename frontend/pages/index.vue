<script setup lang="ts">
import { Refresh, Right } from '@element-plus/icons-vue'
import { RoleEnum } from '~/constants/role.enum'
import { RealtimeEvent } from '~/constants/realtime-events'
import type { IDashboard } from '~/types/dashboard'

definePageMeta({ title: 'Dashboard', titleKey: 'navigation.dashboard', hidePageHeader: true })
const { t, locale } = useI18n()
const { $socket } = useNuxtApp()
const dashboard = ref<IDashboard | null>(null)
const selectedRole = ref<RoleEnum>()
const loading = ref(false)
const error = ref('')
let request = 0
let refreshTimer: ReturnType<typeof setTimeout> | undefined
let polling: ReturnType<typeof setInterval> | undefined
const roles = ref<RoleEnum[]>([])
const financial = computed(() => dashboard.value?.role === RoleEnum.ADMIN || dashboard.value?.role === RoleEnum.CASHIER)
const queueTitle = computed(() => selectedRole.value === RoleEnum.COOKER ? 'kitchen_queue' : selectedRole.value === RoleEnum.CASHIER ? 'payment_queue' : 'active_queue')
const destination = computed(() => ({
  [RoleEnum.ADMIN]: '/admin/master-data/restaurant-table',
  [RoleEnum.RECEPTIONIST]: '/admin/operation/order',
  [RoleEnum.COOKER]: '/admin/operation/kitchen',
  [RoleEnum.CASHIER]: '/admin/operation/payment',
})[selectedRole.value ?? RoleEnum.ADMIN])
const tableStatuses = ['available', 'occupied', 'reserved', 'cleaning', 'inactive']
const tableCount = (status: string) => dashboard.value?.tableStatuses.find(row => row.status === status)?.count ?? 0
const allTables = computed(() => dashboard.value?.tableStatuses.reduce((sum, row) => sum + row.count, 0) ?? 0)
const metricIcons: Record<string, string> = {
  active_orders: 'hugeicons:shopping-basket-01', orders_today: 'hugeicons:shopping-basket-01',
  available_tables: 'hugeicons:table-01', occupied_tables: 'hugeicons:table-01',
  kitchen_orders: 'hugeicons:chef-hat', pending_items: 'hugeicons:chef-hat', preparing_items: 'hugeicons:chef-hat', ready_items: 'hugeicons:chef-hat',
}
function dateTime(value: string) {
  return new Date(value).toLocaleString(locale.value === 'km' ? 'km-KH' : 'en-US', { timeZone: 'Asia/Phnom_Penh', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
async function loadDashboard() {
  const current = ++request
  loading.value = true
  error.value = ''
  try {
    const response = await useApi<{ payload: IDashboard }>('admin/dashboard', { params: { role: selectedRole.value } })
    if (current !== request) return
    dashboard.value = response.payload
    roles.value = response.payload.roles
    selectedRole.value = response.payload.role
  } catch {
    if (current === request) error.value = t('dashboard.load_error')
  } finally { if (current === request) loading.value = false }
}
function changeRole() {
  dashboard.value = null
  void loadDashboard()
}
function scheduleRefresh() {
  clearTimeout(refreshTimer)
  refreshTimer = setTimeout(() => { if (!loading.value) void loadDashboard() }, 400)
}
const events = Object.values(RealtimeEvent).filter(event => event !== RealtimeEvent.SOCKET_ERROR)
onMounted(() => {
  void loadDashboard()
  events.forEach(event => $socket.on(event, scheduleRefresh))
  // Poll as a fallback for disconnected sockets and roles without event subscriptions.
  polling = setInterval(() => { if (!document.hidden && !loading.value) void loadDashboard() }, 30_000)
})
onBeforeUnmount(() => {
  request++
  clearTimeout(refreshTimer)
  clearInterval(polling)
  events.forEach(event => $socket.off(event, scheduleRefresh))
})
</script>

<template>
  <section class="space-y-6" :aria-label="t('navigation.dashboard')">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p class="mb-2 text-xs font-semibold uppercase tracking-widest text-teal-700">{{ t('app.name') }}</p>
        <h1 class="text-2xl font-semibold text-slate-900">{{ t('navigation.dashboard') }}</h1>
        <p v-if="selectedRole" class="mt-2 max-w-2xl text-sm text-slate-500">{{ t(`dashboard.descriptions.${selectedRole}`) }}</p>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <el-select v-if="roles.length > 1" v-model="selectedRole" class="!w-44" :aria-label="t('dashboard.view')" @change="changeRole">
          <el-option v-for="role in roles" :key="role" :value="role" :label="t(`dashboard.roles.${role}`)" />
        </el-select>
        <el-tag v-else-if="selectedRole" type="success" size="large">{{ t(`dashboard.roles.${selectedRole}`) }}</el-tag>
        <el-button :icon="Refresh" :loading="loading" @click="loadDashboard">{{ t('payment.refresh') }}</el-button>
      </div>
    </header>

    <el-alert v-if="error" :title="error" type="error" show-icon :closable="false" />
    <el-skeleton v-if="loading && !dashboard" :rows="8" animated class="rounded-2xl border border-slate-200 bg-white p-6" />
    <template v-if="dashboard">
      <div class="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <span>{{ t('dashboard.business_day', { date: dashboard.date }) }}</span>
        <span>{{ t('dashboard.updated', { time: dateTime(dashboard.generatedAt) }) }}</span>
      </div>
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article v-for="metric in dashboard.metrics" :key="metric.key" class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div class="mb-4 flex items-center justify-between gap-3">
            <h2 class="text-sm font-medium text-slate-500">{{ t(`dashboard.metrics.${metric.key}`) }}</h2>
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><Icon :name="metricIcons[metric.key] || 'f7:money-dollar-circle'" size="22" /></span>
          </div>
          <p class="break-all text-3xl font-semibold tracking-tight text-slate-900">{{ metric.value }}</p>
        </article>
      </div>

      <div class="grid items-start gap-6 xl:grid-cols-3">
        <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white xl:col-span-2">
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
            <div><h2 class="font-semibold text-slate-900">{{ t(`dashboard.${queueTitle}`) }}</h2><p class="mt-1 text-xs text-slate-500">{{ t('dashboard.queue_hint', { shown: dashboard.queue.length, total: dashboard.queueCount }) }}</p></div>
            <el-tag type="info">{{ dashboard.queueCount }}</el-tag>
          </div>
          <el-table :data="dashboard.queue" :empty-text="t('dashboard.empty_queue')">
            <el-table-column prop="orderNumber" :label="t('payment.order')" min-width="150" />
            <el-table-column :label="t('payment.table')" min-width="115"><template #default="{ row }">{{ row.tableName || '—' }}</template></el-table-column>
            <el-table-column :label="t('payment.status')" min-width="125"><template #default="{ row }"><el-tag :type="row.status === 'READY' || row.status === 'SERVED' ? 'success' : 'warning'">{{ t(`order.statuses.${row.status}`) }}</el-tag></template></el-table-column>
            <el-table-column :label="t('payment.created')" min-width="160"><template #default="{ row }">{{ dateTime(row.createdAt) }}</template></el-table-column>
          </el-table>
        </section>
        <div class="space-y-6">
          <section class="rounded-2xl bg-teal-800 p-6 text-white">
            <h2 class="text-lg font-semibold">{{ t('dashboard.workspace') }}</h2>
            <p class="mb-5 mt-2 text-sm text-teal-100">{{ t(`dashboard.descriptions.${dashboard.role}`) }}</p>
            <NuxtLink :to="destination" class="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">{{ t(`dashboard.actions.${dashboard.role}`) }}<Right class="h-4 w-4" aria-hidden="true" /></NuxtLink>
          </section>
          <section v-if="dashboard.role === RoleEnum.ADMIN || dashboard.role === RoleEnum.RECEPTIONIST" class="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 class="mb-1 font-semibold text-slate-900">{{ t('dashboard.tables') }}</h2>
            <p class="mb-5 text-xs text-slate-500">{{ t('dashboard.tables_hint') }}</p>
            <div v-for="status in tableStatuses" :key="status" class="mb-4 last:mb-0">
              <div class="mb-2 flex justify-between text-sm"><span>{{ t(`restaurant_table.statuses.${status}`) }}</span><strong>{{ tableCount(status) }}</strong></div>
              <div class="h-2 overflow-hidden rounded-full bg-slate-100"><div class="h-full rounded-full bg-teal-600" :style="{ width: `${allTables ? tableCount(status) / allTables * 100 : 0}%` }" /></div>
            </div>
          </section>
        </div>
      </div>
      <section v-if="financial" class="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div class="border-b border-slate-100 p-5"><h2 class="font-semibold text-slate-900">{{ t(dashboard.role === RoleEnum.CASHIER ? 'dashboard.my_recent_payments' : 'dashboard.recent_payments') }}</h2><p class="mt-1 text-xs text-slate-500">{{ t('dashboard.payments_hint') }}</p></div>
        <el-table :data="dashboard.recentPayments" :empty-text="t('dashboard.empty_payments')">
          <el-table-column prop="paymentNo" :label="t('payment.number')" min-width="230" />
          <el-table-column :label="t('payment.method')" min-width="130"><template #default="{ row }">{{ t(`payment.methods.${row.paymentMethod}`) }}</template></el-table-column>
          <el-table-column prop="total" :label="t('payment.total')" min-width="140" align="right" />
          <el-table-column :label="t('payment.created')" min-width="190"><template #default="{ row }">{{ dateTime(row.createdAt) }}</template></el-table-column>
        </el-table>
      </section>
    </template>
  </section>
</template>
