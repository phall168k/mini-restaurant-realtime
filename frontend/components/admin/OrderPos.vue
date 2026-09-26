<script setup lang="ts">
import FoodThumbnail from '~/components/admin/FoodThumbnail.vue'
import {
  Plus,
  Minus,
  Search,
  Delete,
  ShoppingCart,
  Close,
  Dish,
} from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import type {
  IItem,
  IItemListResponse,
  IItemCategoryOption,
} from '~/types/item'
import type { IOrder, IOrderForm, IOrderTableOption } from '~/types/order'

import { RestaurantTableStatuseEnum } from '~/constants/restaurant-table-status.enum'
import { ORDER_STATUSES, ORDER_ITEM_STATUSES } from '~/constants/order-status'

const props = defineProps<{ saving: boolean; order?: IOrder }>()
const emit = defineEmits<{ submit: [form: IOrderForm]; close: [] }>()
const { t, locale } = useI18n()
const formRef = ref<FormInstance>()
const form = reactive<IOrderForm>({
  orderNumber:
    props.order?.orderNumber ??
    `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
  tableId: props.order?.tableId ?? null,
  status: props.order?.status ?? 'PENDING',
  discount: '0.00',
  note: props.order?.note ?? '',
  items:
    props.order?.items.map((line) => ({
      itemId: line.itemId,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      discount: line.discount,
      status: line.status,
      note: line.note ?? '',
    })) ?? [],
})
const catalog = ref<IItem[]>([])
const tables = ref<IOrderTableOption[]>([])
const loading = ref(false)
const error = ref('')
const search = ref('')
const categoryId = ref<number | null>(null)
const expandedLine = ref<number | null>(null)
const validating = ref(false)
const busy = computed(() => props.saving || validating.value)
let request = 0
const categories = ref<IItemCategoryOption[]>([])
const filteredItems = computed(() =>
  catalog.value.filter(
    (item) =>
      (!categoryId.value || item.categoryId === categoryId.value) &&
      `${item.code} ${item.nameEn} ${item.nameKh}`
        .toLowerCase()
        .includes(search.value.trim().toLowerCase()),
  ),
)
const count = computed(() =>
  form.items.reduce((sum, line) => sum + (line.quantity ?? 0), 0),
)
function name(item: { nameEn: string; nameKh: string }) {
  return locale.value === 'km' ? item.nameKh : item.nameEn
}
function itemFor(id: number | null) {
  return (
    props.order?.items.find((line) => line.itemId === id)?.item ??
    catalog.value.find((item) => item.id === id)
  )
}
function thumbnailFor(id: number | null) {
  return (
    catalog.value.find((item) => item.id === id)?.thumbnail ??
    props.order?.items.find((line) => line.itemId === id)?.item?.thumbnail ??
    null
  )
}
function cents(value: string) {
  if (!/^\d{1,12}(\.\d{1,2})?$/.test(value)) return 0n
  const [whole = '0', decimal = ''] = value.split('.')
  return BigInt(whole) * 100n + BigInt(decimal.padEnd(2, '0'))
}
function money(value: bigint) {
  return `${value < 0n ? '-' : ''}${((value < 0n ? -value : value) / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${((value < 0n ? -value : value) % 100n).toString().padStart(2, '0')}`
}
const subtotal = computed(() =>
  form.items.reduce(
    (sum, line) => sum + cents(line.unitPrice) * BigInt(line.quantity ?? 0),
    0n,
  ),
)
const lineDiscount = computed(() =>
  form.items.reduce(
    (sum, line) => sum + cents(line.discount) * BigInt(line.quantity ?? 0),
    0n,
  ),
)
watch(
  lineDiscount,
  (value) => {
    form.discount = `${value / 100n}.${(value % 100n).toString().padStart(2, '0')}`
  },
  { immediate: true, flush: 'sync' },
)
const total = computed(() => subtotal.value - lineDiscount.value)
const moneyRule = (digits: number) => ({
  validator: (
    _rule: unknown,
    value: string,
    callback: (error?: Error) => void,
  ) =>
    callback(
      new RegExp(`^\\d{1,${digits}}(\\.\\d{1,2})?$`).test(value)
        ? undefined
        : new Error(t('order.money_error', { digits })),
    ),
  trigger: 'blur',
})
function isTableDisabled(table: IOrderTableOption) {
  return !props.order && table.status === RestaurantTableStatuseEnum.OCCUPIED
}
const rules = computed<FormRules>(() => ({
  orderNumber: [
    {
      required: true,
      whitespace: true,
      max: 250,
      message: t('order.number_required'),
      trigger: 'blur',
    },
  ],
  tableId: [
    {
      required: true,
      type: 'number',
      min: 1,
      message: t('order.selection_required'),
      trigger: 'change',
    },
    {
      validator: (
        _rule: unknown,
        value: number,
        callback: (error?: Error) => void,
      ) => {
        const table = tables.value.find((table) => table.id === value)
        callback(
          table && isTableDisabled(table)
            ? new Error(t('order.pos.table_occupied'))
            : undefined,
        )
      },
      trigger: 'change',
    },
  ],
  discount: [moneyRule(10)],
}))
async function loadCatalog() {
  const current = ++request
  loading.value = true
  error.value = ''
  try {
    const tableRequest = useApi<
      IOrderTableOption[] | { payload: IOrderTableOption[] }
    >('admin/master-data/restaurant-tables/select-options')
    const itemRequest = async () => {
      const items: IItem[] = []
      for (let page = 1; ; page++) {
        const response = await useApi<IItemListResponse>(
          'admin/master-data/items',
          {
            params: {
              page,
              limit: 100,
              status: true,
              orderBy: 'id',
              orderDirection: 'ASC',
            },
          },
        )
        if (current !== request) return items
        items.push(...response.payload.content)
        if (!response.payload.hasNext || !response.payload.content.length)
          return items
      }
    }
    const [tableResponse, items, categoryResponse] = await Promise.all([
      tableRequest,
      itemRequest(),
      useApi<{ payload: IItemCategoryOption[]; timestamp: number }>(
        'admin/master-data/categories/select-options',
      ),
    ])
    if (current !== request) return
    tables.value = Array.isArray(tableResponse)
      ? tableResponse
      : tableResponse.payload
    if (
      props.order &&
      !tables.value.some((table) => table.id === props.order!.tableId)
    ) {
      tables.value.push(
        props.order.table ?? {
          id: props.order.tableId,
          code: `#${props.order.tableId}`,
          name: t('order.unavailable'),
          capacity: 0,
          status: 'inactive' as IOrderTableOption['status'],
        },
      )
    }
    catalog.value = items
    categories.value = categoryResponse.payload
    if (
      categoryId.value !== null &&
      !categories.value.some((category) => category.id === categoryId.value)
    )
      categoryId.value = null
  } catch {
    if (current === request) error.value = t('order.options_error')
  } finally {
    if (current === request) loading.value = false
  }
}
function addItem(item: IItem) {
  if (busy.value || loading.value || error.value) return
  const line = form.items.find((line) => line.itemId === item.id)
  if (line) {
    if ((line.quantity ?? 0) < 2147483647)
      line.quantity = (line.quantity ?? 0) + 1
  } else
    form.items.push({
      itemId: item.id,
      quantity: 1,
      unitPrice: item.unitPrice,
      discount: item.discount ?? '0.00',
      status: 'PENDING',
      note: '',
    })
}
function changeQuantity(index: number, delta: number) {
  if (busy.value) return
  const line = form.items[index]
  if (!line) return
  const quantity = (line.quantity ?? 1) + delta
  if (quantity > 0 && quantity <= 2147483647) line.quantity = quantity
}
async function submit() {
  if (busy.value || loading.value || error.value || !form.items.length) return
  validating.value = true
  try {
    if (!(await formRef.value?.validate().catch(() => false))) {
      const invalidLine = form.items.find(
        (line) =>
          !/^\d{1,12}(\.\d{1,2})?$/.test(line.unitPrice) ||
          !/^\d{1,10}(\.\d{1,2})?$/.test(line.discount),
      )
      if (invalidLine) expandedLine.value = form.items.indexOf(invalidLine)
      return
    }
    emit('submit', {
      ...form,
      orderNumber: form.orderNumber.trim(),
      items: form.items.map((line) => ({ ...line })),
    })
  } finally {
    validating.value = false
  }
}
onMounted(loadCatalog)
onBeforeUnmount(() => {
  request++
})
</script>

<template>
  <el-form
    ref="formRef"
    :model="form"
    :rules="rules"
    :disabled="busy"
    label-position="top"
    class="pos"
    @submit.prevent="submit"
  >
    <header class="pos-header">
      <div class="flex items-center gap-3">
        <span class="pos-brand"
          ><el-icon :size="24"><Dish /></el-icon
        ></span>
        <div>
          <h1 class="text-xl font-bold text-slate-900">
            {{ order ? t('order.edit') : t('order.pos.title') }}
          </h1>
          <p class="text-xs text-slate-500">{{ t('order.pos.subtitle') }}</p>
        </div>
      </div>
      <el-button
        :icon="Close"
        circle
        :disabled="busy"
        :aria-label="t('order.cancel')"
        @click="emit('close')"
      />
    </header>
    <div class="pos-layout">
      <section class="pos-menu" :aria-label="t('order.pos.menu')">
        <div class="mb-6 flex items-end justify-between">
          <div>
            <p class="pos-eyebrow">{{ t('order.pos.menu') }}</p>
            <h2 class="mt-1 text-2xl font-bold text-slate-900">
              {{ t('order.pos.choose') }}
            </h2>
          </div>
          <span class="text-sm text-slate-500"
            >{{ filteredItems.length }} {{ t('order.items') }}</span
          >
        </div>
        <el-input
          v-model="search"
          :prefix-icon="Search"
          :placeholder="t('order.pos.search')"
          :aria-label="t('order.pos.search')"
          size="large"
          clearable
        />
        <div class="my-5 flex flex-wrap gap-2">
          <button
            type="button"
            class="category-chip"
            :class="{ selected: categoryId === null }"
            :aria-pressed="categoryId === null"
            @click="categoryId = null"
          >
            {{ t('order.pos.all') }}</button
          ><button
            v-for="category in categories"
            :key="category.id"
            type="button"
            class="category-chip"
            :class="{ selected: categoryId === category.id }"
            :aria-pressed="categoryId === category.id"
            @click="categoryId = category.id"
          >
            {{ name(category) }}
          </button>
        </div>
        <el-alert
          v-if="error"
          :title="error"
          type="error"
          :closable="false"
          class="mb-4"
          ><el-button link @click="loadCatalog">{{
            t('order.retry')
          }}</el-button></el-alert
        >
        <div v-if="loading" class="grid grid-cols-2 gap-4 xl:grid-cols-3">
          <el-skeleton
            v-for="n in 6"
            :key="n"
            animated
            :rows="4"
            class="rounded-2xl bg-white p-5"
          />
        </div>
        <div
          v-else-if="!filteredItems.length"
          class="py-20 text-center text-slate-500"
        >
          {{ t('order.pos.no_items') }}
        </div>
        <div
          v-else
          class="grid grid-cols-2 gap-3 xl:grid-cols-3 2xl:grid-cols-4"
        >
          <button
            v-for="item in filteredItems"
            :key="item.id"
            type="button"
            class="product-card"
            :disabled="busy || !!error"
            :aria-label="`${t('order.add_item')}: ${name(item)}`"
            @click="addItem(item)"
          >
            <div class="product-art">
              <FoodThumbnail :attachment="item.thumbnail" :alt="name(item)" />
              <span
                v-if="form.items.some((line) => line.itemId === item.id)"
                class="product-count"
                >{{
                  form.items.find((line) => line.itemId === item.id)?.quantity
                }}</span
              >
            </div>
            <div class="p-4">
              <span class="text-xs text-slate-400">{{ item.code }}</span>
              <h3 class="mt-1 font-semibold text-slate-900">
                {{ name(item) }}
              </h3>
              <p class="mt-1 truncate text-xs text-slate-500">
                {{ item.category ? name(item.category) : t('order.item') }}
              </p>
              <p
                v-if="cents(item.discount ?? '0.00') > 0n"
                class="mt-2 text-xs font-medium text-amber-700"
              >
                {{ t('order.pos.unit_discount') }}: −{{
                  money(cents(item.discount))
                }}
              </p>
              <div class="mt-4 flex items-center justify-between">
                <strong class="text-teal-700">{{
                  money(cents(item.unitPrice))
                }}</strong
                ><span class="add-icon"
                  ><el-icon><Plus /></el-icon
                ></span>
              </div>
            </div>
          </button>
        </div>
      </section>
      <aside class="pos-cart" :aria-label="t('order.pos.cart')">
        <div class="border-b border-slate-100 p-5">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-lg font-bold text-slate-900">
              {{ t('order.pos.cart') }}
            </h2>
            <span
              class="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700"
              >{{ count }} {{ t('order.items') }}</span
            >
          </div>
          <el-form-item :label="t('order.table')" prop="tableId"
            ><el-select
              v-model="form.tableId"
              filterable
              size="large"
              :loading="loading"
              :placeholder="t('order.pos.select_table')"
              ><el-option
                v-for="table in tables"
                :key="table.id"
                :value="table.id"
                :disabled="isTableDisabled(table)"
                :label="`${table.code} — ${table.name}`"
                ><span>{{ table.name }}</span
                ><span class="float-right ml-3 text-xs text-slate-400">{{
                  t(`restaurant_table.statuses.${table.status}`)
                }}</span></el-option
              ></el-select
            ></el-form-item
          >
          <el-form-item
            :label="t('order.number')"
            prop="orderNumber"
            class="!mb-0"
            ><el-input v-model="form.orderNumber" maxlength="250"
          /></el-form-item>
        </div>
        <el-form-item v-if="!order" class="mx-5 mt-4">
          <el-switch
            v-model="form.status"
            active-value="PENDING"
            inactive-value="DRAFT"
            :active-text="t('order.submit_kitchen')"
            :aria-label="t('order.submit_kitchen')"
          />
        </el-form-item>
        <el-form-item
          v-else-if="order.status !== 'DRAFT'"
          :label="t('order.status')"
          class="mx-5 mt-4"
        >
          <el-select v-model="form.status"
            ><el-option
              v-for="status in ORDER_STATUSES"
              :key="status"
              :value="status"
              :label="t(`order.statuses.${status}`)"
          /></el-select>
        </el-form-item>
        <div class="cart-lines">
          <div
            v-if="!form.items.length"
            class="flex flex-col items-center px-6 py-16 text-center"
          >
            <span class="mb-4 rounded-full bg-slate-50 p-5 text-slate-300"
              ><el-icon :size="36"><ShoppingCart /></el-icon
            ></span>
            <h3 class="font-semibold text-slate-700">
              {{ t('order.pos.empty') }}
            </h3>
            <p class="mt-2 max-w-60 text-sm leading-6 text-slate-400">
              {{ t('order.pos.empty_hint') }}
            </p>
          </div>
          <article
            v-for="(line, index) in form.items"
            :key="index"
            class="border-b border-slate-100 p-5"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="flex min-w-0 items-start gap-3">
                <div
                  class="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-teal-50 text-teal-600"
                >
                  <FoodThumbnail
                    :attachment="thumbnailFor(line.itemId)"
                    :alt="
                      itemFor(line.itemId)
                        ? name(itemFor(line.itemId)!)
                        : t('order.item')
                    "
                  />
                </div>
                <div class="min-w-0">
                  <h3 class="font-semibold text-slate-800">
                    {{
                      itemFor(line.itemId)
                        ? name(itemFor(line.itemId)!)
                        : line.itemId
                    }}
                  </h3>
                  <p class="mt-1 text-xs text-slate-400">
                    {{ money(cents(line.unitPrice)) }} × {{ line.quantity }}
                  </p>
                  <p
                    v-if="cents(line.discount) > 0n"
                    class="mt-1 text-xs text-amber-700"
                  >
                    {{ t('order.pos.unit_discount') }}: −{{
                      money(cents(line.discount))
                    }}
                  </p>
                </div>
              </div>
              <el-button
                :icon="Delete"
                text
                type="danger"
                :aria-label="t('order.remove')"
                @click="form.items.splice(index, 1)"
              />
            </div>
            <div class="mt-3 flex items-center justify-between">
              <div class="quantity-control">
                <el-button
                  :icon="Minus"
                  :disabled="line.quantity === 1"
                  :aria-label="t('order.pos.decrease')"
                  @click="changeQuantity(index, -1)"
                /><span class="min-w-8 text-center text-sm font-semibold">{{
                  line.quantity
                }}</span
                ><el-button
                  :icon="Plus"
                  :disabled="line.quantity === 2147483647"
                  :aria-label="t('order.pos.increase')"
                  @click="changeQuantity(index, 1)"
                />
              </div>
              <strong class="text-sm text-slate-900">{{
                money(
                  (cents(line.unitPrice) - cents(line.discount)) *
                    BigInt(line.quantity ?? 0),
                )
              }}</strong>
            </div>
            <el-button
              link
              class="mt-3"
              @click="expandedLine = expandedLine === index ? null : index"
              >{{ t('order.pos.customize') }}</el-button
            >
            <div
              v-show="expandedLine === index"
              class="mt-3 grid grid-cols-2 gap-x-3 rounded-xl bg-slate-50 p-3"
            >
              <el-form-item
                :label="t('order.unit_price')"
                :prop="`items.${index}.unitPrice`"
                :rules="[moneyRule(12)]"
                ><el-input v-model="line.unitPrice" inputmode="decimal"
              /></el-form-item>
              <el-form-item
                :label="t('order.pos.unit_discount')"
                :prop="`items.${index}.discount`"
                :rules="[moneyRule(10)]"
                ><el-input v-model="line.discount" inputmode="decimal"
              /></el-form-item>
              <el-form-item
                v-if="order"
                :label="t('order.status')"
                class="col-span-2"
              >
                <el-select v-model="line.status"
                  ><el-option
                    v-for="status in ORDER_ITEM_STATUSES"
                    :key="status"
                    :value="status"
                    :label="t(`order.statuses.${status}`)"
                /></el-select>
              </el-form-item>
              <el-form-item :label="t('order.note')" class="col-span-2 !mb-0"
                ><el-input
                  v-model="line.note"
                  :placeholder="t('order.pos.line_note')"
              /></el-form-item>
            </div>
          </article>
        </div>
        <footer class="cart-footer">
          <div class="mb-4 space-y-2 text-sm">
            <div class="flex justify-between text-slate-500">
              <span>{{ t('order.pos.subtotal') }}</span
              ><span>{{ money(subtotal) }}</span>
            </div>
            <div
              v-if="lineDiscount"
              class="flex justify-between text-slate-500"
            >
              <span>{{ t('order.pos.line_discounts') }}</span
              ><span>−{{ money(lineDiscount) }}</span>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <el-form-item :label="t('order.pos.order_discount')" prop="discount"
              ><el-input :model-value="form.discount" readonly /></el-form-item
            ><el-form-item :label="t('order.note')"
              ><el-input v-model="form.note"
            /></el-form-item>
          </div>
          <div
            class="mb-5 flex items-center justify-between border-t border-dashed border-slate-200 pt-4"
          >
            <span class="font-semibold text-slate-700">{{
              t('order.pos.total')
            }}</span
            ><strong
              class="text-2xl font-bold text-teal-700"
              aria-live="polite"
              >{{ money(total) }}</strong
            >
          </div>
          <el-button
            native-type="submit"
            type="primary"
            size="large"
            class="!h-12 !w-full !rounded-xl !font-semibold"
            :loading="busy"
            :disabled="!form.items.length || loading || !!error"
            >{{
              order
                ? t('order.save')
                : form.status === 'DRAFT'
                  ? t('order.pos.place')
                  : t('order.submit_kitchen')
            }}
            <span class="ml-2">→</span></el-button
          >
        </footer>
      </aside>
    </div>
  </el-form>
</template>

<style scoped>
  .pos {
    background: #f5f7fa;
    min-height: 100dvh;
    --el-color-primary: #0f766e;
    --el-color-primary-light-3: #36978e;
    --el-color-primary-light-9: #f0fdfa;
  }
  .pos-header {
    height: 84px;
    padding: 16px 28px;
    background: white;
    border-bottom: 1px solid #e8edf2;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .pos-brand {
    display: grid;
    place-items: center;
    width: 46px;
    height: 46px;
    color: white;
    background: #0f766e;
    border-radius: 14px;
  }
  .pos-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 420px;
  }
  .pos-menu {
    padding: 28px;
    height: calc(100dvh - 84px);
    overflow: auto;
  }
  .pos-eyebrow {
    color: #0f766e;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }
  .category-chip {
    border: 1px solid #e2e8f0;
    border-radius: 999px;
    padding: 10px 18px;
    background: white;
    color: #64748b;
    font-size: 13px;
    transition: background 0.15s;
  }
  .category-chip.selected {
    background: #0f766e;
    border-color: #0f766e;
    color: white;
  }
  .product-card {
    text-align: left;
    background: white;
    border: 1px solid #e8edf2;
    border-radius: 18px;
    overflow: hidden;
    transition:
      transform 0.15s,
      box-shadow 0.15s;
  }
  .product-card:hover:not(:disabled) {
    transform: translateY(-3px);
    box-shadow: 0 10px 28px #0f172a0c;
    border-color: #99c9c4;
  }
  .product-card:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .product-art {
    height: 200px;
    margin: 8px 8px 0;
    border-radius: 12px;
    background: linear-gradient(145deg, #edf6f2, #e1efea);
    display: grid;
    place-items: center;
    color: #7caa99;
    position: relative;
    overflow: hidden;
  }
  .product-card:nth-child(3n + 2) .product-art {
    background: linear-gradient(145deg, #faf2e7, #f3e7d4);
    color: #b99a6f;
  }
  .product-card:nth-child(3n + 3) .product-art {
    background: linear-gradient(145deg, #eef0fa, #e4e8f4);
    color: #929fc7;
  }
  .product-count {
    position: absolute;
    right: 8px;
    top: 8px;
    border-radius: 999px;
    background: #0f766e;
    color: white;
    min-width: 25px;
    padding: 3px 6px;
    text-align: center;
    font-size: 12px;
  }
  .add-icon {
    border-radius: 9px;
    background: #f0fdfa;
    padding: 7px;
    display: grid;
    color: #0f766e;
  }
  .pos-cart {
    background: white;
    height: calc(100dvh - 84px);
    display: flex;
    flex-direction: column;
    border-left: 1px solid #e8edf2;
  }
  .cart-lines {
    flex: 1;
    min-height: 150px;
    overflow: auto;
  }
  .cart-footer {
    padding: 20px;
    border-top: 1px solid #eef2f6;
    box-shadow: 0 -6px 24px #0f172a04;
  }
  .quantity-control {
    display: flex;
    align-items: center;
    gap: 4px;
    border: 1px solid #e2e8f0;
    border-radius: 9px;
    padding: 3px;
  }
  .quantity-control :deep(.el-button) {
    border: 0;
    padding: 6px;
    height: 28px;
    margin: 0;
    background: #f8fafc;
  }
  button:focus-visible {
    outline: 3px solid #5eead4;
    outline-offset: 3px;
  }
  @media (max-width: 1000px) {
    .pos-layout {
      grid-template-columns: minmax(0, 1fr) 360px;
    }
    .pos-menu {
      padding: 20px;
    }
  }
  @media (max-width: 720px) {
    .pos-layout {
      grid-template-columns: 1fr;
    }
    .pos-menu {
      height: auto;
      max-height: 60dvh;
      padding: 18px;
    }
    .pos-cart {
      height: auto;
      border-left: 0;
    }
    .cart-lines {
      max-height: 50dvh;
    }
    .pos-header {
      padding: 16px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .product-card,
    .category-chip {
      transition: none;
    }
  }
</style>
