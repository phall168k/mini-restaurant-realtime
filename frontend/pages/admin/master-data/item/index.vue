<script setup lang="ts">
import SingleFileUpload from '~/components/admin/SingleFileUpload.vue'
import { ElMessageBox } from 'element-plus'
import { Plus, Search } from '@element-plus/icons-vue'
import en from 'element-plus/es/locale/lang/en'
import km from 'element-plus/es/locale/lang/km'
import type { FormInstance, FormRules } from 'element-plus'
import type { IItem, IItemForm, IItemListResponse, IItemCategoryOption } from '~/types/item'

definePageMeta({ title: 'Items', titleKey: 'item.title', hidePageHeader: true })

const { t, locale } = useI18n()
const elementLocale = computed(() => locale.value === 'km' ? km : en)

const endpoint = 'admin/master-data/items'
const items = ref<IItem[]>([])
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
const formRef = ref<FormInstance>()
const form = reactive<IItemForm>({ categoryId: null, code: '', nameEn: '', nameKh: '', description: '', unitPrice: '0.00', discount: '0.00', thumbnail: null, status: true })
const uploader = ref<InstanceType<typeof SingleFileUpload>>()
const attachmentBusy = ref(false)
const categoryOptions = ref<IItemCategoryOption[]>([])
const selectedCategory = ref<IItemCategoryOption | null>(null)
const categoriesLoading = ref(false)
const categoriesError = ref('')
const closing = ref(false)
const availableCategories = computed(() => {
  const options = [...categoryOptions.value]
  if (selectedCategory.value && !options.some(option => option.id === selectedCategory.value?.id)) options.push(selectedCategory.value)
  return options
})
const formBusy = computed(() => saving.value || attachmentBusy.value || closing.value)

const moneyRule = () => ({
  validator: (_rule: unknown, value: string, callback: (error?: Error) => void) => {
    if (!/^\d{1,12}(\.\d{1,2})?$/.test(value)) return callback(new Error(t('item.money_error')))
    callback()
  },
  trigger: 'blur',
})
const rules = computed<FormRules<IItemForm>>(() => ({
  code: [
    { required: true, whitespace: true, message: t('item.code_required'), trigger: 'blur' },
    { max: 250, message: t('item.max_length'), trigger: 'blur' },
  ],
  nameEn: [
    { required: true, whitespace: true, message: t('item.name_en_required'), trigger: 'blur' },
    { max: 250, message: t('item.max_length'), trigger: 'blur' },
  ],
  nameKh: [
    { required: true, whitespace: true, message: t('item.name_kh_required'), trigger: 'blur' },
    { max: 250, message: t('item.max_length'), trigger: 'blur' },
  ],
  categoryId: [{ required: true, type: 'number', message: t('item.category_required'), trigger: 'change' }],
  unitPrice: [moneyRule()],
  discount: [moneyRule()],
}))
let requestId = 0

async function loadCategoryOptions() {
  if (categoriesLoading.value) return
  categoriesLoading.value = true
  categoriesError.value = ''
  try {
    const response = await useApi<IItemCategoryOption[] | { payload: IItemCategoryOption[] }>('admin/master-data/categories/select-options')
    categoryOptions.value = Array.isArray(response) ? response : response.payload
  } catch (error) {
    categoriesError.value = errorMessage(error, t('item.categories_error'))
  } finally {
    categoriesLoading.value = false
  }
}

async function closeForm() {
  if (formBusy.value) return
  closing.value = true
  try {
    if (uploader.value && !await uploader.value.discard()) return
    dialogVisible.value = false
  } finally {
    closing.value = false
  }
}

function categoryLabel(category: IItemCategoryOption) {
  return `${category.code} — ${locale.value === 'km' ? category.nameKh : category.nameEn}`
}

function errorMessage(error: unknown, fallback: string): string {
  const message = (error as { data?: { message?: unknown } })?.data?.message
  if (typeof message === 'string') return message
  if (Array.isArray(message) && message.every(item => typeof item === 'string')) return message.join(' ')
  return fallback
}

async function loadItems() {
  const currentRequest = ++requestId
  loading.value = true
  listError.value = ''
  try {
    const response = await useApi<IItemListResponse>(endpoint, {
      params: { page: page.value, limit: pageSize.value, search: appliedSearch.value || undefined, orderBy: 'id', orderDirection: 'DESC' },
    })
    if (currentRequest !== requestId) return
    const lastPage = Math.max(1, Math.ceil(response.payload.totalRecords / pageSize.value))
    if (page.value > lastPage) {
      page.value = lastPage
      return await loadItems()
    }
    items.value = response.payload.content
    total.value = response.payload.totalRecords
  } catch (error) {
    if (currentRequest !== requestId) return
    items.value = []
    total.value = 0
    listError.value = errorMessage(error, t('item.load_error'))
  } finally {
    if (currentRequest === requestId) loading.value = false
  }
}

function searchItems() {
  appliedSearch.value = search.value.trim()
  page.value = 1
  loadItems()
}

function changePage(value: number) {
  page.value = value
  loadItems()
}

function changePageSize(value: number) {
  pageSize.value = value
  page.value = 1
  loadItems()
}

async function openForm(item?: IItem) {
  if (formBusy.value || dialogVisible.value || deletingId.value !== null) return
  editingId.value = item?.id ?? null
  Object.assign(form, {
    code: item?.code ?? '', nameEn: item?.nameEn ?? '', nameKh: item?.nameKh ?? '',
    description: item?.description ?? '', status: item?.status ?? true,
    categoryId: item?.categoryId ?? null, unitPrice: item?.unitPrice ?? '0.00', discount: item?.discount ?? '0.00',
    thumbnail: item?.thumbnail ? { ...item.thumbnail } : null,
  })
  selectedCategory.value = item?.category ?? null
  dialogVisible.value = true
  void loadCategoryOptions()
  await nextTick()
  formRef.value?.clearValidate()
}

async function saveItem() {
  if (formBusy.value || categoriesLoading.value || categoriesError.value || !formRef.value) return
  saving.value = true
  const isEditing = editingId.value !== null
  try {
    if (!await formRef.value.validate().catch(() => false)) return
    await useApi(isEditing ? `${endpoint}/${editingId.value}` : endpoint, {
      method: isEditing ? 'put' : 'post',
      body: {
        code: form.code.trim(), nameEn: form.nameEn.trim(), nameKh: form.nameKh.trim(),
        description: form.description.trim(), status: form.status,
        categoryId: form.categoryId, unitPrice: form.unitPrice, discount: form.discount, thumbnail: form.thumbnail,
      },
    })
    if (uploader.value && !await uploader.value.commit()) useMessage(t('upload.cleanup_error'), 'warning')
    dialogVisible.value = false
    useMessage(isEditing ? t('item.updated') : t('item.created'))
    await loadItems()
  } catch (error) {
    useMessage(errorMessage(error, t('item.save_error')), 'error')
  } finally {
    saving.value = false
  }
}

async function deleteItem(item: IItem) {
  if (saving.value || deletingId.value !== null) return
  deletingId.value = item.id
  try {
    await ElMessageBox.confirm(t('item.delete_confirm', { name: locale.value === 'km' ? item.nameKh : item.nameEn }), t('item.delete_title'), {
      confirmButtonText: t('item.delete'), cancelButtonText: t('item.cancel'), type: 'warning',
    })
    await useApi(`${endpoint}/${item.id}`, { method: 'delete' })
    useMessage(t('item.deleted'))
    await loadItems()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      useMessage(errorMessage(error, t('item.delete_error')), 'error')
    }
  } finally {
    deletingId.value = null
  }
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString(locale.value === 'km' ? 'km-KH' : 'en-US')
}

onBeforeRouteLeave(async () => {
  if (formBusy.value) return false
  if (dialogVisible.value) await closeForm()
  return !dialogVisible.value
})

onMounted(loadItems)
onBeforeUnmount(() => { requestId++ })
</script>

<template>
  <el-config-provider :locale="elementLocale">
    <section 
        class="rounded-xl border border-slate-200 bg-white p-4 md:p-6" 
        :aria-label="t('item.management')"
    >
        <header 
            class="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5"
        >
        <div>
            <h1 
                class="text-xl font-semibold tracking-tight text-slate-900"
            >
                {{ t('item.title') }}
            </h1>
            <p class="mt-1 text-sm text-slate-500">{{ t('item.subtitle') }}</p>
        </div>
        <form 
            class="mb-5 flex flex-wrap items-center gap-2" 
            role="search" 
            @submit.prevent="searchItems"
        >
            <el-input 
                v-model="search" 
                :prefix-icon="Search" 
                :placeholder="t('item.search_placeholder')" 
                :aria-label="t('item.search_label')" 
                clearable 
                class="!w-full sm:!w-80" 
                @clear="searchItems" 
            />
            <el-button 
                type="primary" 
                :icon="Plus" 
                class="!ml-0" 
                @click="openForm()"
            >
                {{ t('item.create') }}
            </el-button>
        </form>
    </header>
    <el-alert 
        v-if="listError" 
        :title="listError" 
        type="error" 
        show-icon 
        :closable="false" 
        class="mb-4"
    >
        <el-button
            link
            type="primary"
            :loading="loading"
            @click="loadItems"
        >
            {{ t('item.retry') }}
        </el-button>
    </el-alert>
    <el-table 
        v-loading="loading" 
        :data="items" 
        row-key="id" 
        :empty-text="listError ? t('item.load_error') : t('item.empty')" 
        class="w-full"
    >
        <el-table-column
            :label="t('item.thumbnail')"
            width="110"
        >
            <template #default="{ row }">
                <SingleFileUpload :model-value="row.thumbnail" preview-only/>
            </template>
        </el-table-column>
        <el-table-column
            :label="t('item.category')"
            min-width="200"
            show-overflow-tooltip
        >
            <template #default="{ row }">
                {{ row.category ? categoryLabel(row.category) : '—' }}
            </template>
        </el-table-column>
        <el-table-column
            prop="code"
            :label="t('item.code')"
            min-width="160"
            show-overflow-tooltip
        />
        <el-table-column
            prop="nameEn"
            :label="t('item.name_en')"
            min-width="160"
            show-overflow-tooltip
        />
        <el-table-column
            prop="nameKh"
            :label="t('item.name_kh')"
            min-width="160"
            show-overflow-tooltip
        />
        <el-table-column
            prop="unitPrice"
            :label="t('item.unit_price')"
            min-width="120"
            align="right"
        />
        <el-table-column
            prop="discount"
            :label="t('item.discount')"
            min-width="120"
            align="right"
        />
        <el-table-column 
            prop="description" 
            :label="t('item.description')" 
            min-width="220" 
            show-overflow-tooltip
        >
            <template #default="{ row }">
                {{ row.description || '—' }}
            </template>
        </el-table-column>
        <el-table-column 
            :label="t('item.status')" 
            width="110"
        >
            <template #default="{ row }">
                <el-tag 
                    :type="row.status ? 'success' : 'info'"
                >
                    {{ row.status ? t('item.active') : t('item.inactive') }}
                </el-tag>
            </template>
        </el-table-column>
        <el-table-column
            :label="t('item.created_by')"
            min-width="160"
            show-overflow-tooltip
        >
            <template #default="{ row }">
                {{ row.createdByUser?.username || '—' }}
            </template>
        </el-table-column>
        <el-table-column 
            :label="t('item.created_at')" 
            min-width="190"
        >
            <template #default="{ row }">
                {{ formatDate(row.createdAt) }}
            </template>
        </el-table-column>
        <el-table-column 
            :label="t('item.actions')" 
            width="150" 
            fixed="right"
        >
            <template #default="{ row }">
                <el-tag role="button" :tabindex="saving || deletingId !== null ? -1 : 0" :aria-disabled="saving || deletingId !== null" type="success" :disabled="saving || deletingId !== null" :aria-label="t('item.edit_label', { name: locale === 'km' ? row.nameKh : row.nameEn })" @click="openForm(row)" @keydown.enter.prevent="openForm(row)" @keydown.space.prevent="openForm(row)">
                    <Icon name="akar-icons:edit"/>
                </el-tag>
                &nbsp;
                <el-tag role="button" :tabindex="saving || deletingId !== null ? -1 : 0" :aria-disabled="saving || deletingId !== null" type="danger" :loading="deletingId === row.id" :disabled="saving || deletingId !== null" :aria-label="t('item.delete_label', { name: locale === 'km' ? row.nameKh : row.nameEn })" @click="deleteItem(row)" @keydown.enter.prevent="deleteItem(row)" @keydown.space.prevent="deleteItem(row)">
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
        :title="editingId !== null ? t('item.edit') : t('item.create')" 
        fullscreen
        :close-on-click-modal="!formBusy"
        :before-close="closeForm"
        :close-on-press-escape="!formBusy" 
        :show-close="!formBusy" 
        destroy-on-close
        draggable
    >
        <el-form 
            ref="formRef" 
            :model="form" 
            :rules="rules" 
            label-position="top" 
            :disabled="formBusy" 
            @submit.prevent="saveItem"
        >
            <el-alert
                v-if="categoriesError"
                :title="categoriesError"
                type="error"
                :closable="false"
                class="mb-4"
            >
                <el-button link type="primary" :loading="categoriesLoading" @click="loadCategoryOptions">{{ t('item.retry') }}</el-button>
            </el-alert>
            <el-row :gutter="10">
                <el-col :span="16">
                    <el-form-item
                        :label="t('item.category')"
                        prop="categoryId"
                    >
                        <el-select
                            v-model="form.categoryId"
                            filterable
                            :loading="categoriesLoading"
                            :disabled="categoriesLoading || !!categoriesError"
                            :placeholder="t('item.category_placeholder')"
                            class="w-full"
                        >
                            <el-option
                                v-for="category in availableCategories"
                                :key="category.id"
                                :label="categoryLabel(category)"
                                :value="category.id"
                            />
                        </el-select>
                    </el-form-item>
                    <el-form-item
                        :label="t('item.code')"
                        prop="code"
                    >
                        <el-input
                            v-model="form.code"
                            maxlength="250"
                            :placeholder="t('item.code_placeholder')"
                        />
                    </el-form-item>
                    <el-form-item
                        :label="t('item.name_en')"
                        prop="nameEn"
                    >
                        <el-input
                            v-model="form.nameEn"
                            maxlength="250"
                            :placeholder="t('item.name_en_placeholder')"
                        />
                    </el-form-item>
                    <el-form-item
                        :label="t('item.name_kh')"
                        prop="nameKh"
                    >
                        <el-input
                            v-model="form.nameKh"
                            maxlength="250"
                            :placeholder="t('item.name_kh_placeholder')"
                        />
                    </el-form-item>
                    <el-form-item
                        :label="t('item.unit_price')"
                        prop="unitPrice"
                    >
                        <el-input
                            v-model="form.unitPrice"
                            inputmode="decimal"
                            placeholder="0.00"
                        />
                    </el-form-item>
                    <el-form-item
                        :label="t('item.discount')"
                        prop="discount"
                    >
                        <el-input
                            v-model="form.discount"
                            inputmode="decimal"
                            placeholder="0.00"
                        />
                    </el-form-item>
                    <el-form-item 
                        :label="t('item.description')" 
                        prop="description"
                    >
                        <el-input 
                            v-model="form.description" 
                            type="textarea" 
                            :rows="3" 
                            show-word-limit 
                            :placeholder="t('item.description_placeholder')" 
                        />
                    </el-form-item>
                </el-col>
                <el-col :span="8">
                    <el-form-item
                        :label="t('item.thumbnail')"
                        prop="thumbnail"
                    >
                        <SingleFileUpload
                            ref="uploader"
                            v-model="form.thumbnail"
                            accept="image/*"
                            :disabled="saving || closing"
                            deferred
                            @busy="attachmentBusy = $event"
                        />
                    </el-form-item>
                </el-col>
            </el-row>
            
            <el-form-item 
                :label="t('item.status')" 
                prop="status"
            >
                <el-switch 
                    v-model="form.status" 
                    :active-text="t('item.active')" 
                    :inactive-text="t('item.inactive')" 
                />
            </el-form-item>
            <div 
                class="flex justify-end gap-2 pt-3"
            >
                <el-button 
                    :disabled="formBusy" 
                    @click="closeForm"
                >
                    {{ t('item.cancel') }}
                </el-button>
                <el-button 
                    native-type="submit" 
                    type="primary" 
                    :loading="saving"
                    :disabled="formBusy || categoriesLoading || !!categoriesError"
                >
                    {{ editingId !== null ? t('item.save') : t('item.create') }}
                </el-button>
            </div>
      </el-form>
    </el-dialog>
  </section>
  </el-config-provider>
</template>
