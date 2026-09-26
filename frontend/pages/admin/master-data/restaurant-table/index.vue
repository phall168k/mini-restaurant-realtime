<script setup lang="ts">
import { RestaurantTableStatuseEnum } from '~/constants/restaurant-table-status.enum'
import { ElMessageBox } from 'element-plus'
import { Plus, Search } from '@element-plus/icons-vue'
import en from 'element-plus/es/locale/lang/en'
import km from 'element-plus/es/locale/lang/km'
import type { FormInstance, FormRules } from 'element-plus'
import type { IRestaurantTable, IRestaurantTableForm, IRestaurantTableListResponse } from '~/types/restaurant-table'

definePageMeta({ title: 'Restaurant tables', titleKey: 'restaurant_table.title', hidePageHeader: true })

const { t, locale } = useI18n()
const elementLocale = computed(() => locale.value === 'km' ? km : en)

const endpoint = 'admin/master-data/restaurant-tables'
const tables = ref<IRestaurantTable[]>([])
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
const form = reactive<IRestaurantTableForm>({ code: '', name: '', capacity: 4, status: RestaurantTableStatuseEnum.AVAILABLE, note: '', sortOrder: 0, active: true })
const rules = computed<FormRules<IRestaurantTableForm>>(() => ({
  code: [
    { required: true, whitespace: true, message: t('restaurant_table.code_required'), trigger: 'blur' },
    { max: 250, message: t('restaurant_table.max_length'), trigger: 'blur' },
  ],
  name: [
    { required: true, whitespace: true, message: t('restaurant_table.name_required'), trigger: 'blur' },
    { max: 250, message: t('restaurant_table.max_length'), trigger: 'blur' },
  ],
  capacity: [{ required: true, type: 'integer', min: 1, max: 2147483647, message: t('restaurant_table.capacity_error'), trigger: ['blur', 'change'] }],
  sortOrder: [{ required: true, type: 'integer', min: 0, max: 2147483647, message: t('restaurant_table.sort_error'), trigger: ['blur', 'change'] }],
  status: [{ required: true, type: 'enum', enum: Object.values(RestaurantTableStatuseEnum), message: t('restaurant_table.status_required'), trigger: 'change' }],
}))
const statuses = Object.values(RestaurantTableStatuseEnum)
const statusColors: Record<RestaurantTableStatuseEnum, 'success' | 'danger' | 'warning' | 'primary' | 'info'> = {
  [RestaurantTableStatuseEnum.AVAILABLE]: 'success',
  [RestaurantTableStatuseEnum.OCCUPIED]: 'danger',
  [RestaurantTableStatuseEnum.RESERVED]: 'warning',
  [RestaurantTableStatuseEnum.CLEANING]: 'primary',
  [RestaurantTableStatuseEnum.INACTIVE]: 'info',
}
let requestId = 0

function errorMessage(error: unknown, fallback: string): string {
  const message = (error as { data?: { message?: unknown } })?.data?.message
  if (typeof message === 'string') return message
  if (Array.isArray(message) && message.every(item => typeof item === 'string')) return message.join(' ')
  return fallback
}

async function loadTables() {
  const currentRequest = ++requestId
  loading.value = true
  listError.value = ''
  try {
    const response = await useApi<IRestaurantTableListResponse>(endpoint, {
      params: { page: page.value, limit: pageSize.value, search: appliedSearch.value || undefined },
    })
    if (currentRequest !== requestId) return
    const lastPage = Math.max(1, Math.ceil(response.payload.totalRecords / pageSize.value))
    if (page.value > lastPage) {
      page.value = lastPage
      return await loadTables()
    }
    tables.value = response.payload.content
    total.value = response.payload.totalRecords
  } catch (error) {
    if (currentRequest !== requestId) return
    tables.value = []
    total.value = 0
    listError.value = errorMessage(error, t('restaurant_table.load_error'))
  } finally {
    if (currentRequest === requestId) loading.value = false
  }
}

function searchTables() {
  appliedSearch.value = search.value.trim()
  page.value = 1
  loadTables()
}

function changePage(value: number) {
  page.value = value
  loadTables()
}

function changePageSize(value: number) {
  pageSize.value = value
  page.value = 1
  loadTables()
}

async function openForm(table?: IRestaurantTable) {
  if (saving.value || deletingId.value !== null) return
  editingId.value = table?.id ?? null
  Object.assign(form, {
    code: table?.code ?? '', name: table?.name ?? '', capacity: table?.capacity ?? 4,
    status: table?.status ?? RestaurantTableStatuseEnum.AVAILABLE,
    note: table?.note ?? '', sortOrder: table?.sort_order ?? 0, active: table?.active ?? true,
  })
  dialogVisible.value = true
  await nextTick()
  formRef.value?.clearValidate()
}

async function saveTable() {
  if (saving.value || !formRef.value) return
  saving.value = true
  const isEditing = editingId.value !== null
  try {
    if (!await formRef.value.validate().catch(() => false)) return
    await useApi(isEditing ? `${endpoint}/${editingId.value}` : endpoint, {
      method: isEditing ? 'put' : 'post',
      body: {
        code: form.code.trim(), name: form.name.trim(), capacity: form.capacity,
        status: form.status, note: form.note.trim(), sortOrder: form.sortOrder, active: form.active,
      },
    })
    dialogVisible.value = false
    useMessage(isEditing ? t('restaurant_table.updated') : t('restaurant_table.created'))
    await loadTables()
  } catch (error) {
    useMessage(errorMessage(error, t('restaurant_table.save_error')), 'error')
  } finally {
    saving.value = false
  }
}

async function deleteTable(table: IRestaurantTable) {
  if (saving.value || deletingId.value !== null) return
  deletingId.value = table.id
  try {
    await ElMessageBox.confirm(t('restaurant_table.delete_confirm', { name: table.name }), t('restaurant_table.delete_title'), {
      confirmButtonText: t('restaurant_table.delete'), cancelButtonText: t('restaurant_table.cancel'), type: 'warning',
    })
    await useApi(`${endpoint}/${table.id}`, { method: 'delete' })
    useMessage(t('restaurant_table.deleted'))
    await loadTables()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      useMessage(errorMessage(error, t('restaurant_table.delete_error')), 'error')
    }
  } finally {
    deletingId.value = null
  }
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString(locale.value === 'km' ? 'km-KH' : 'en-US')
}

onMounted(loadTables)
onBeforeUnmount(() => { requestId++ })
</script>

<template>
  <el-config-provider :locale="elementLocale">
    <section 
        class="rounded-xl border border-slate-200 bg-white p-4 md:p-6" 
        :aria-label="t('restaurant_table.management')"
    >
        <header 
            class="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5"
        >
        <div>
            <h1 
                class="text-xl font-semibold tracking-tight text-slate-900"
            >
                {{ t('restaurant_table.title') }}
            </h1>
            <p class="mt-1 text-sm text-slate-500">{{ t('restaurant_table.subtitle') }}</p>
        </div>
        <form 
            class="mb-5 flex flex-wrap items-center gap-2" 
            role="search" 
            @submit.prevent="searchTables"
        >
            <el-input 
                v-model="search" 
                :prefix-icon="Search" 
                :placeholder="t('restaurant_table.search_placeholder')" 
                :aria-label="t('restaurant_table.search_label')" 
                clearable 
                class="!w-full sm:!w-80" 
                @clear="searchTables" 
            />
            <el-button 
                type="primary" 
                :icon="Plus" 
                class="!ml-0" 
                @click="openForm()"
            >
                {{ t('restaurant_table.create') }}
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
            @click="loadTables"
        >
            {{ t('restaurant_table.retry') }}
        </el-button>
    </el-alert>
    <el-table 
        v-loading="loading" 
        :data="tables" 
        row-key="id" 
        :empty-text="listError ? t('restaurant_table.load_error') : t('restaurant_table.empty')" 
        class="w-full"
    >
        <el-table-column
            prop="code"
            :label="t('restaurant_table.code')"
            min-width="160"
            show-overflow-tooltip
        />
        <el-table-column
            prop="name"
            :label="t('restaurant_table.name')"
            min-width="160"
            show-overflow-tooltip
        />
        <el-table-column
            prop="capacity"
            :label="t('restaurant_table.capacity')"
            min-width="110"
        />
        <el-table-column
            :label="t('restaurant_table.status')"
            min-width="140"
        >
            <template #default="{ row }">
                <el-tag :type="statusColors[row.status as RestaurantTableStatuseEnum] || 'info'">
                    {{ t(`restaurant_table.statuses.${row.status}`) }}
                </el-tag>
            </template>
        </el-table-column>
        <el-table-column
            prop="sort_order"
            :label="t('restaurant_table.sort_order')"
            min-width="110"
        />
        <el-table-column
            prop="note"
            :label="t('restaurant_table.note')"
            min-width="220"
            show-overflow-tooltip
        >
            <template #default="{ row }">
                {{ row.note || '—' }}
            </template>
        </el-table-column>
        <el-table-column
            :label="t('restaurant_table.active')"
            min-width="110"
        >
            <template #default="{ row }">
                <el-tag :type="row.active ? 'success' : 'info'">
                    {{ row.active ? t('restaurant_table.yes') : t('restaurant_table.no') }}
                </el-tag>
            </template>
        </el-table-column>
        <el-table-column
            :label="t('restaurant_table.created_by')"
            min-width="160"
            show-overflow-tooltip
        >
            <template #default="{ row }">
                {{ row.createdByUser?.username || '—' }}
            </template>
        </el-table-column>
        <el-table-column 
            :label="t('restaurant_table.created_at')" 
            min-width="190"
        >
            <template #default="{ row }">
                {{ formatDate(row.createdAt) }}
            </template>
        </el-table-column>
        <el-table-column 
            :label="t('restaurant_table.actions')" 
            width="150" 
            fixed="right"
        >
            <template #default="{ row }">
                <el-tag role="button" :tabindex="saving || deletingId !== null ? -1 : 0" :aria-disabled="saving || deletingId !== null" type="success" :disabled="saving || deletingId !== null" :aria-label="t('restaurant_table.edit_label', { name: row.name })" @click="openForm(row)" @keydown.enter.prevent="openForm(row)" @keydown.space.prevent="openForm(row)">
                    <Icon name="akar-icons:edit"/>
                </el-tag>
                &nbsp;
                <el-tag role="button" :tabindex="saving || deletingId !== null ? -1 : 0" :aria-disabled="saving || deletingId !== null" type="danger" :loading="deletingId === row.id" :disabled="saving || deletingId !== null" :aria-label="t('restaurant_table.delete_label', { name: row.name })" @click="deleteTable(row)" @keydown.enter.prevent="deleteTable(row)" @keydown.space.prevent="deleteTable(row)">
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
        :title="editingId !== null ? t('restaurant_table.edit') : t('restaurant_table.create')" 
        width="50%" 
        :close-on-click-modal="!saving"
        :close-on-press-escape="!saving" 
        :show-close="!saving" 
        destroy-on-close
        draggable
    >
        <el-form 
            ref="formRef" 
            :model="form" 
            :rules="rules" 
            label-position="top" 
            :disabled="saving" 
            @submit.prevent="saveTable"
        >
            <el-form-item
                :label="t('restaurant_table.code')"
                prop="code"
            >
                <el-input
                    v-model="form.code"
                    maxlength="250"
                    :placeholder="t('restaurant_table.code_placeholder')"
                />
            </el-form-item>
            <el-form-item
                :label="t('restaurant_table.name')"
                prop="name"
            >
                <el-input
                    v-model="form.name"
                    maxlength="250"
                    :placeholder="t('restaurant_table.name_placeholder')"
                />
            </el-form-item>
            <el-form-item
                :label="t('restaurant_table.capacity')"
                prop="capacity"
            >
                <el-input-number
                    v-model="form.capacity"
                    :min="1"
                    :max="2147483647"
                    :precision="0"
                    :step="1"
                    controls-position="right"
                    class="!w-full"
                />
            </el-form-item>
            <el-form-item
                :label="t('restaurant_table.status')"
                prop="status"
            >
                <el-select v-model="form.status" class="w-full">
                    <el-option
                        v-for="status in statuses"
                        :key="status"
                        :value="status"
                        :label="t(`restaurant_table.statuses.${status}`)"
                    />
                </el-select>
            </el-form-item>
            <el-form-item
                :label="t('restaurant_table.sort_order')"
                prop="sortOrder"
            >
                <el-input-number
                    v-model="form.sortOrder"
                    :min="0"
                    :max="2147483647"
                    :precision="0"
                    :step="1"
                    controls-position="right"
                    class="!w-full"
                />
            </el-form-item>
            <el-form-item
                :label="t('restaurant_table.note')"
                prop="note"
            >
                <el-input
                    v-model="form.note"
                    type="textarea"
                    :rows="3"
                    :placeholder="t('restaurant_table.note_placeholder')"
                />
            </el-form-item>
            <el-form-item
                :label="t('restaurant_table.active')"
                prop="active"
            >
                <el-switch
                    v-model="form.active"
                    :active-text="t('restaurant_table.yes')"
                    :inactive-text="t('restaurant_table.no')"
                />
            </el-form-item>
            <div 
                class="flex justify-end gap-2 pt-3"
            >
                <el-button 
                    :disabled="saving" 
                    @click="dialogVisible = false"
                >
                    {{ t('restaurant_table.cancel') }}
                </el-button>
                <el-button 
                    native-type="submit" 
                    type="primary" 
                    :loading="saving"
                >
                    {{ editingId !== null ? t('restaurant_table.save') : t('restaurant_table.create') }}
                </el-button>
            </div>
      </el-form>
    </el-dialog>
  </section>
  </el-config-provider>
</template>
