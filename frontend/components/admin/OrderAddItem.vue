<script setup lang="ts">
import type { IItem, IItemListResponse } from '~/types/item'

const props = defineProps<{ saving: boolean }>()
const emit = defineEmits<{
  submit: [
    item: {
      itemId: number
      quantity: number
      unitPrice: string
      discount: string
      note: string
    },
  ]
  close: []
}>()
const { t, locale } = useI18n()
const items = ref<IItem[]>([])
const loading = ref(false)
const catalogError = ref('')
const validationError = ref('')
const form = reactive({
  itemId: undefined as number | undefined,
  quantity: 1 as number | undefined,
  unitPrice: '',
  discount: '0.00',
  note: '',
})
let request = 0

// Load every active catalog page so the searchable selector includes all menu items.
async function loadItems() {
  const current = ++request
  loading.value = true
  catalogError.value = ''
  try {
    const catalog: IItem[] = []
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
      if (current !== request) return
      catalog.push(...response.payload.content)
      if (!response.payload.hasNext || !response.payload.content.length) break
    }
    items.value = catalog
  } catch {
    if (current === request) catalogError.value = t('order.options_error')
  } finally {
    if (current === request) loading.value = false
  }
}

// Selecting a menu item initializes its price and discount; the user can adjust both.
function selectItem(id: number) {
  const item = items.value.find((item) => item.id === id)
  form.unitPrice = item?.unitPrice ?? ''
  form.discount = item?.discount ?? '0.00'
  validationError.value = ''
}

// Match the API's quantity and decimal constraints before submitting a separate order line.
function submit() {
  if (props.saving || loading.value || catalogError.value) return
  validationError.value = ''
  if (!form.itemId || !items.value.some((item) => item.id === form.itemId)) {
    validationError.value = t('order.selection_required')
  } else if (
    !Number.isInteger(form.quantity) ||
    !form.quantity ||
    form.quantity < 1 ||
    form.quantity > 2147483647
  ) {
    validationError.value = t('order.quantity_error')
  } else if (!/^\d{1,12}(\.\d{1,2})?$/.test(form.unitPrice)) {
    validationError.value = t('order.money_error', { digits: 12 })
  } else if (!/^\d{1,10}(\.\d{1,2})?$/.test(form.discount)) {
    validationError.value = t('order.money_error', { digits: 10 })
  }
  if (validationError.value) return
  emit('submit', { ...form, itemId: form.itemId!, quantity: form.quantity! })
}

onMounted(() => {
  void loadItems()
})
onBeforeUnmount(() => {
  request++
})
</script>

<template>
  <!-- Catalog errors can be retried without closing the dialog. -->
  <el-alert
    v-if="catalogError"
    :title="catalogError"
    type="error"
    :closable="false"
    class="mb-4"
  >
    <el-button link @click="loadItems">{{ t('order.retry') }}</el-button>
  </el-alert>
  <el-form
    label-position="top"
    :disabled="saving || loading || !!catalogError"
    @submit.prevent="submit"
  >
    <el-form-item :label="t('order.item')" required>
      <el-select
        v-model="form.itemId"
        filterable
        :loading="loading"
        :placeholder="t('order.pos.search')"
        class="w-full"
        @change="selectItem"
      >
        <el-option
          v-for="item in items"
          :key="item.id"
          :value="item.id"
          :label="`${item.code} — ${locale === 'km' ? item.nameKh : item.nameEn}`"
        />
      </el-select>
    </el-form-item>
    <el-form-item :label="t('order.quantity')" required>
      <el-input-number
        v-model="form.quantity"
        :min="1"
        :max="2147483647"
        :precision="0"
      />
    </el-form-item>
    <div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
      <el-form-item :label="t('order.unit_price')" required
        ><el-input v-model="form.unitPrice" inputmode="decimal"
      /></el-form-item>
      <el-form-item :label="t('order.pos.unit_discount')"
        ><el-input v-model="form.discount" inputmode="decimal"
      /></el-form-item>
    </div>
    <el-form-item :label="t('order.note')"
      ><el-input v-model="form.note" type="textarea" :rows="3"
    /></el-form-item>
    <el-alert
      v-if="validationError"
      :title="validationError"
      type="error"
      :closable="false"
      class="mb-4"
    />
    <div class="flex justify-end gap-2">
      <el-button :disabled="saving" @click="emit('close')">{{
        t('order.cancel')
      }}</el-button>
      <el-button
        native-type="submit"
        type="primary"
        :loading="saving"
        :disabled="!form.itemId || !items.length"
        >{{ t('order.add_item') }}</el-button
      >
    </div>
  </el-form>
</template>
