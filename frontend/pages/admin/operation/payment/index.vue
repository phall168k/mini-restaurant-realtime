<script setup lang="ts">
import { Refresh, Search } from '@element-plus/icons-vue'
import en from 'element-plus/es/locale/lang/en'
import km from 'element-plus/es/locale/lang/km'
import SingleFileUpload from '~/components/admin/SingleFileUpload.vue'
import { PaymentMethodEnum } from '~/constants/payment-method.enum'
import { RoleEnum } from '~/constants/role.enum'
import { RealtimeEvent } from '~/constants/realtime-events'
import type { IOrder, IOrderListResponse } from '~/types/order'
import type { IPayment, IPaymentListResponse } from '~/types/payment'
import type { IAttachment } from '~/types/attachment'
import type { IUser } from '~/types/user'

definePageMeta({ title: 'Payment', titleKey: 'payment.title', hidePageHeader: true })
const { t, locale } = useI18n()
const elementLocale = computed(() => locale.value === 'km' ? km : en)
const user = useCookie<IUser | null>('users')
const canPay = computed(() => user.value?.isSuperUser === true || user.value?.roles?.some(r => r.status && r.name === RoleEnum.CASHIER) === true)
const tab = ref('ready')
const orders = ref<IOrder[]>([])
const payments = ref<IPayment[]>([])
const search = ref('')
const appliedSearch = ref('')
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const loading = ref(false)
const listError = ref('')
let request = 0
let detailRequest = 0
const drawer = ref(false)
const detailLoading = ref(false)
const detailError = ref('')
const selected = ref<IOrder | null>(null)
const saving = ref(false)
const uploadBusy = ref(false)
const uploader = ref<InstanceType<typeof SingleFileUpload>>()
const attachment = ref<IAttachment | null>(null)
const method = ref(PaymentMethodEnum.CASH)
const received = ref('')
const reference = ref('')
const busy = computed(() => saving.value || uploadBusy.value)
const methods = Object.values(PaymentMethodEnum)
function errorMessage(error: unknown, fallback: string) {
  const message = (error as { data?: { message?: unknown } })?.data?.message
  return typeof message === 'string' ? message : Array.isArray(message) ? message.join(' ') : fallback
}
function cents(value: string) {
  if (!/^\d{1,12}(\.\d{1,2})?$/.test(value)) throw new Error('Invalid amount')
  const [whole, fraction = ''] = value.split('.')
  return BigInt(whole!) * 100n + BigInt(fraction.padEnd(2, '0'))
}
function amount(value: bigint) { return `${value / 100n}.${String(value % 100n).padStart(2, '0')}` }
const totals = computed(() => {
  try {
    if (!selected.value) return null
    const lines = selected.value.items.filter(line => line.status !== 'CANCELED')
    if (!lines.length) return null
    let subtotal = 0n
    let discount = cents(selected.value.discount)
    for (const line of lines) {
      const price = cents(line.unitPrice), reduction = cents(line.discount)
      if (!Number.isInteger(line.quantity) || line.quantity < 1 || reduction > price) return null
      subtotal += price * BigInt(line.quantity)
      discount += reduction * BigInt(line.quantity)
    }
    if (discount > subtotal || subtotal > 99999999999999n) return null
    return { subtotal, discount, total: subtotal - discount }
  } catch { return null }
})
const amountError = computed(() => {
  if (!totals.value) return t('payment.invalid_totals')
  try {
    const value = cents(received.value)
    if (value < totals.value.total) return t('payment.insufficient')
    if (method.value !== PaymentMethodEnum.CASH && value !== totals.value.total) return t('payment.exact_amount')
    return ''
  } catch { return t('payment.invalid_amount') }
})
const change = computed(() => {
  if (amountError.value || !totals.value) return '0.00'
  return amount(cents(received.value) - totals.value.total)
})
watch(method, () => { if (totals.value) received.value = amount(totals.value.total) })
function formatDate(value: string) { return new Date(value).toLocaleString(locale.value === 'km' ? 'km-KH' : 'en-US') }
async function loadList() {
  const current = ++request
  const ready = tab.value === 'ready'
  loading.value = true
  listError.value = ''
  try {
    const response = await useApi<IOrderListResponse | IPaymentListResponse>(`admin/operation/${ready ? 'orders' : 'payments'}`, {
      params: { page: page.value, limit: pageSize.value, search: appliedSearch.value || undefined, status: ready ? 'READY,SERVED' : undefined, orderBy: 'createdAt', orderDirection: ready ? 'ASC' : 'DESC' },
    })
    if (current !== request) return
    const lastPage = Math.max(1, response.payload.totalPages)
    if (page.value > lastPage) { page.value = lastPage; return await loadList() }
    if (ready) orders.value = response.payload.content as IOrder[]
    else payments.value = response.payload.content as IPayment[]
    total.value = response.payload.totalRecords
  } catch (error) {
    if (current !== request) return
    orders.value = []; payments.value = []; total.value = 0
    listError.value = errorMessage(error, t('payment.load_error'))
  } finally { if (current === request) loading.value = false }
}
function resetList() { page.value = 1; void loadList() }
function searchList() { appliedSearch.value = search.value.trim(); resetList() }
async function openPayment(order: IOrder) {
  if (!canPay.value || drawer.value || busy.value) return
  drawer.value = true; selected.value = null; detailError.value = ''; detailLoading.value = true
  attachment.value = null; reference.value = ''; method.value = PaymentMethodEnum.CASH; received.value = ''
  const current = ++detailRequest
  try {
    const response = await useApi<{ payload: IOrder }>(`admin/operation/orders/${order.id}`)
    if (current !== detailRequest) return
    if (!['READY', 'SERVED'].includes(response.payload.status)) throw new Error('stale')
    selected.value = response.payload
    if (totals.value) received.value = amount(totals.value.total)
  } catch (error) { if (current === detailRequest) detailError.value = errorMessage(error, t('payment.detail_error')) }
  finally { if (current === detailRequest) detailLoading.value = false }
}
async function closeDrawer(done?: () => void) {
  if (busy.value) return
  if (uploader.value && !await uploader.value.discard()) return
  detailRequest++; drawer.value = false; done?.()
}
async function savePayment() {
  if (!canPay.value || busy.value || !selected.value || amountError.value) return
  saving.value = true
  try {
    await useApi('admin/operation/payments', { method: 'post', body: {
      orderId: selected.value.id, paymentMethod: method.value, receivedAmount: amount(cents(received.value)), referenceNo: reference.value.trim(), attachment: attachment.value ? [attachment.value] : [],
    } })
  } catch (error) {
    useMessage(errorMessage(error, t('payment.save_error')), 'error')
    saving.value = false
    return
  }
  // Once persisted, do not expose another submit even if attachment cleanup fails.
  await uploader.value?.commit()
  drawer.value = false; selected.value = null; saving.value = false
  useMessage(t('payment.saved'))
  await loadList()
}
const { $socket } = useNuxtApp()
const events = [RealtimeEvent.ORDER_READY, RealtimeEvent.ORDER_STATUS_CHANGED, RealtimeEvent.ORDER_ITEM_STATUS_CHANGED, RealtimeEvent.ORDER_CANCELED]
function refresh() { void loadList() }
onMounted(() => { refresh(); events.forEach(event => $socket.on(event, refresh)) })
onBeforeRouteLeave(async () => {
  if (busy.value) return false
  if (drawer.value && uploader.value) return await uploader.value.discard()
})
onBeforeUnmount(() => { request++; detailRequest++; events.forEach(event => $socket.off(event, refresh)) })
</script>

<template>
  <el-config-provider :locale="elementLocale">
    <section class="p-1 sm:p-2" :aria-label="t('payment.title')">
      <header class="mb-6">
        <h1 class="text-2xl font-semibold text-slate-900">{{ t('payment.title') }}</h1>
        <p class="mt-1 text-sm text-slate-500">{{ t('payment.subtitle') }}</p>
      </header>
      <el-tabs v-model="tab" @tab-change="resetList">
        <el-tab-pane :label="t('payment.ready')" name="ready" />
        <el-tab-pane :label="t('payment.history')" name="history" />
      </el-tabs>
      <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <form class="flex flex-wrap items-center gap-3 p-4" @submit.prevent="searchList">
          <span class="mr-auto text-sm text-slate-500">{{ t('payment.records', { count: total }) }}</span>
          <el-input v-model="search" :prefix-icon="Search" :placeholder="t('payment.search')" :aria-label="t('payment.search')" clearable class="!w-64" @clear="searchList" />
          <el-button native-type="submit" :icon="Search">{{ t('payment.search_button') }}</el-button>
          <el-button :icon="Refresh" :loading="loading" :aria-label="t('payment.refresh')" @click="loadList" />
        </form>
        <el-alert v-if="listError" :title="listError" type="error" :closable="false" show-icon />
        <el-table v-if="tab === 'ready'" v-loading="loading" :data="orders" :empty-text="t('payment.empty_ready')">
          <el-table-column prop="orderNumber" :label="t('payment.order')" min-width="170" />
          <el-table-column :label="t('payment.table')" min-width="140"><template #default="{ row }">{{ row.table?.name || row.table?.code || '—' }}</template></el-table-column>
          <el-table-column :label="t('payment.status')" width="130"><template #default="{ row }"><el-tag type="success">{{ t(`order.statuses.${row.status}`) }}</el-tag></template></el-table-column>
          <el-table-column :label="t('payment.created')" min-width="200"><template #default="{ row }">{{ formatDate(row.createdAt) }}</template></el-table-column>
          <el-table-column :label="t('payment.action')" width="140" fixed="right"><template #default="{ row }"><el-button type="primary" :disabled="!canPay || busy" @click="openPayment(row)">{{ t('payment.pay_now') }}</el-button></template></el-table-column>
        </el-table>
        <el-table v-else v-loading="loading" :data="payments" :empty-text="t('payment.empty_history')">
          <el-table-column prop="paymentNo" :label="t('payment.number')" min-width="240" show-overflow-tooltip />
          <el-table-column :label="t('payment.order')" min-width="160"><template #default="{ row }">{{ row.order?.orderNumber || row.orderId }}</template></el-table-column>
          <el-table-column :label="t('payment.method')" width="130"><template #default="{ row }">{{ t(`payment.methods.${row.paymentMethod}`) }}</template></el-table-column>
          <el-table-column :label="t('payment.status')" width="140"><template #default="{ row }"><el-tag :type="row.paymentStatus === 'COMPLETED' ? 'success' : 'warning'">{{ t(`payment.statuses.${row.paymentStatus}`) }}</el-tag></template></el-table-column>
          <el-table-column v-for="field in ['total', 'receivedAmount', 'changeAmount']" :key="field" :prop="field" :label="t(`payment.${field}`)" width="140" align="right" />
          <el-table-column prop="referenceNo" :label="t('payment.reference')" min-width="150" />
          <el-table-column :label="t('payment.cashier')" min-width="140"><template #default="{ row }">{{ row.paidByUser?.username || '—' }}</template></el-table-column>
          <el-table-column :label="t('payment.created')" min-width="200"><template #default="{ row }">{{ formatDate(row.createdAt) }}</template></el-table-column>
        </el-table>
        <div class="overflow-x-auto p-4"><el-pagination v-model:current-page="page" v-model:page-size="pageSize" :total="total" :page-sizes="[10, 20, 50]" layout="total, sizes, prev, pager, next" @size-change="resetList" @current-change="loadList" /></div>
      </div>
      <el-drawer v-model="drawer" direction="rtl" size="min(620px, 100vw)" :title="t('payment.pay_now')" :before-close="closeDrawer" :show-close="!busy" :close-on-click-modal="!busy" :close-on-press-escape="!busy" destroy-on-close>
        <div v-loading="detailLoading" class="min-h-32">
          <el-alert v-if="detailError" :title="detailError" type="error" :closable="false" />
          <template v-if="selected">
            <div class="mb-5 rounded-xl bg-slate-50 p-4">
              <h2 class="text-lg font-semibold">{{ selected.orderNumber }}</h2>
              <p class="mt-1 text-sm text-slate-500">{{ selected.table?.name || selected.table?.code || '—' }} · {{ t(`order.statuses.${selected.status}`) }}</p>
              <p v-if="selected.note" class="mt-2 text-sm">{{ selected.note }}</p>
            </div>
            <el-table :data="selected.items" class="mb-5">
              <el-table-column :label="t('payment.item')" min-width="160"><template #default="{ row }"><span :class="{ 'line-through text-slate-400': row.status === 'CANCELED' }">{{ (locale === 'km' ? row.item?.nameKh : row.item?.nameEn) || row.item?.code || row.itemId }}</span><small v-if="row.status === 'CANCELED'" class="block">{{ t('order.statuses.CANCELED') }}</small></template></el-table-column>
              <el-table-column prop="quantity" :label="t('payment.quantity')" width="85" align="right" />
              <el-table-column prop="unitPrice" :label="t('payment.price')" width="100" align="right" />
              <el-table-column prop="discount" :label="t('payment.discount')" width="100" align="right" />
            </el-table>
            <dl v-if="totals" class="mb-6 space-y-3 rounded-xl border border-slate-200 p-4">
              <div class="flex justify-between"><dt>{{ t('payment.subtotal') }}</dt><dd>{{ amount(totals.subtotal) }}</dd></div>
              <div class="flex justify-between"><dt>{{ t('payment.discount') }}</dt><dd>{{ amount(totals.discount) }}</dd></div>
              <div class="flex justify-between border-t pt-3 text-lg font-semibold"><dt>{{ t('payment.total') }}</dt><dd>{{ amount(totals.total) }}</dd></div>
            </dl>
            <el-form label-position="top" :disabled="saving" @submit.prevent="savePayment">
              <el-form-item :label="t('payment.method')"><el-select v-model="method"><el-option v-for="value in methods" :key="value" :value="value" :label="t(`payment.methods.${value}`)" /></el-select></el-form-item>
              <el-form-item :label="t('payment.receivedAmount')" :error="amountError"><el-input v-model="received" inputmode="decimal" maxlength="15" /></el-form-item>
              <div class="mb-5 flex justify-between rounded-lg bg-emerald-50 p-3 text-emerald-800"><span>{{ t('payment.changeAmount') }}</span><strong>{{ change }}</strong></div>
              <el-form-item :label="t('payment.reference')"><el-input v-model="reference" maxlength="250" /></el-form-item>
              <el-form-item :label="t('payment.attachment')"><SingleFileUpload ref="uploader" v-model="attachment" deferred :disabled="saving" @busy="uploadBusy = $event" /></el-form-item>
            </el-form>
          </template>
        </div>
        <template #footer>
          <div class="flex justify-end gap-3 border-t pt-4">
            <el-button :disabled="busy" @click="closeDrawer()">{{ t('payment.cancel') }}</el-button>
            <el-button type="primary" :loading="saving" :disabled="!canPay || !selected || detailLoading || !!amountError || uploadBusy" @click="savePayment">{{ t('payment.save') }}</el-button>
          </div>
        </template>
      </el-drawer>
    </section>
  </el-config-provider>
</template>
