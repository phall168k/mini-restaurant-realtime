<script setup lang="ts">
import { ElMessageBox } from 'element-plus'
import { Plus, Search } from '@element-plus/icons-vue'
import en from 'element-plus/es/locale/lang/en'
import km from 'element-plus/es/locale/lang/km'
import type { FormInstance, FormRules } from 'element-plus'
import type { ICategory, ICategoryForm, ICategoryListResponse } from '~/types/category'

definePageMeta({ title: 'Categories', titleKey: 'category.title', hidePageHeader: true })

const { t, locale } = useI18n()
const elementLocale = computed(() => locale.value === 'km' ? km : en)

const endpoint = 'admin/master-data/categories'
const categories = ref<ICategory[]>([])
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
const form = reactive<ICategoryForm>({ code: '', nameEn: '', nameKh: '', description: '', status: true })
const rules = computed<FormRules<ICategoryForm>>(() => ({
  code: [
    { required: true, whitespace: true, message: t('category.code_required'), trigger: 'blur' },
    { max: 250, message: t('category.max_length'), trigger: 'blur' },
  ],
  nameEn: [
    { required: true, whitespace: true, message: t('category.name_en_required'), trigger: 'blur' },
    { max: 250, message: t('category.max_length'), trigger: 'blur' },
  ],
  nameKh: [
    { required: true, whitespace: true, message: t('category.name_kh_required'), trigger: 'blur' },
    { max: 250, message: t('category.max_length'), trigger: 'blur' },
  ],
  description: [{ max: 250, message: t('category.max_length'), trigger: 'blur' }],
}))
let requestId = 0

function errorMessage(error: unknown, fallback: string): string {
  const message = (error as { data?: { message?: unknown } })?.data?.message
  if (typeof message === 'string') return message
  if (Array.isArray(message) && message.every(item => typeof item === 'string')) return message.join(' ')
  return fallback
}

async function loadCategories() {
  const currentRequest = ++requestId
  loading.value = true
  listError.value = ''
  try {
    const response = await useApi<ICategoryListResponse>(endpoint, {
      params: { page: page.value, limit: pageSize.value, search: appliedSearch.value || undefined, orderBy: 'id', orderDirection: 'DESC' },
    })
    if (currentRequest !== requestId) return
    const lastPage = Math.max(1, Math.ceil(response.payload.totalRecords / pageSize.value))
    if (page.value > lastPage) {
      page.value = lastPage
      return await loadCategories()
    }
    categories.value = response.payload.content
    total.value = response.payload.totalRecords
  } catch (error) {
    if (currentRequest !== requestId) return
    categories.value = []
    total.value = 0
    listError.value = errorMessage(error, t('category.load_error'))
  } finally {
    if (currentRequest === requestId) loading.value = false
  }
}

function searchCategories() {
  appliedSearch.value = search.value.trim()
  page.value = 1
  loadCategories()
}

function changePage(value: number) {
  page.value = value
  loadCategories()
}

function changePageSize(value: number) {
  pageSize.value = value
  page.value = 1
  loadCategories()
}

async function openForm(category?: ICategory) {
  if (saving.value || deletingId.value !== null) return
  editingId.value = category?.id ?? null
  Object.assign(form, {
    code: category?.code ?? '', nameEn: category?.nameEn ?? '', nameKh: category?.nameKh ?? '',
    description: category?.description ?? '', status: category?.status ?? true,
  })
  dialogVisible.value = true
  await nextTick()
  formRef.value?.clearValidate()
}

async function saveCategory() {
  if (saving.value || !formRef.value) return
  saving.value = true
  const isEditing = editingId.value !== null
  try {
    if (!await formRef.value.validate().catch(() => false)) return
    await useApi(isEditing ? `${endpoint}/${editingId.value}` : endpoint, {
      method: isEditing ? 'put' : 'post',
      body: {
        code: form.code.trim(), nameEn: form.nameEn.trim(), nameKh: form.nameKh.trim(),
        description: form.description.trim(), status: form.status,
      },
    })
    dialogVisible.value = false
    useMessage(isEditing ? t('category.updated') : t('category.created'))
    await loadCategories()
  } catch (error) {
    useMessage(errorMessage(error, t('category.save_error')), 'error')
  } finally {
    saving.value = false
  }
}

async function deleteCategory(category: ICategory) {
  if (saving.value || deletingId.value !== null) return
  deletingId.value = category.id
  try {
    await ElMessageBox.confirm(t('category.delete_confirm', { name: locale.value === 'km' ? category.nameKh : category.nameEn }), t('category.delete_title'), {
      confirmButtonText: t('category.delete'), cancelButtonText: t('category.cancel'), type: 'warning',
    })
    await useApi(`${endpoint}/${category.id}`, { method: 'delete' })
    useMessage(t('category.deleted'))
    await loadCategories()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      useMessage(errorMessage(error, t('category.delete_error')), 'error')
    }
  } finally {
    deletingId.value = null
  }
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString(locale.value === 'km' ? 'km-KH' : 'en-US')
}

onMounted(loadCategories)
onBeforeUnmount(() => { requestId++ })
</script>

<template>
  <el-config-provider :locale="elementLocale">
    <section 
        class="rounded-xl border border-slate-200 bg-white p-4 md:p-6" 
        :aria-label="t('category.management')"
    >
        <header 
            class="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5"
        >
        <div>
            <h1 
                class="text-xl font-semibold tracking-tight text-slate-900"
            >
                {{ t('category.title') }}
            </h1>
            <p class="mt-1 text-sm text-slate-500">{{ t('category.subtitle') }}</p>
        </div>
        <form 
            class="mb-5 flex flex-wrap items-center gap-2" 
            role="search" 
            @submit.prevent="searchCategories"
        >
            <el-input 
                v-model="search" 
                :prefix-icon="Search" 
                :placeholder="t('category.search_placeholder')" 
                :aria-label="t('category.search_label')" 
                clearable 
                class="!w-full sm:!w-80" 
                @clear="searchCategories" 
            />
            <el-button 
                type="primary" 
                :icon="Plus" 
                class="!ml-0" 
                @click="openForm()"
            >
                {{ t('category.create') }}
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
            @click="loadCategories"
        >
            {{ t('category.retry') }}
        </el-button>
    </el-alert>
    <el-table 
        v-loading="loading" 
        :data="categories" 
        row-key="id" 
        :empty-text="listError ? t('category.load_error') : t('category.empty')" 
        class="w-full"
    >
        <el-table-column
            prop="code"
            :label="t('category.code')"
            min-width="160"
            show-overflow-tooltip
        />
        <el-table-column
            prop="nameEn"
            :label="t('category.name_en')"
            min-width="160"
            show-overflow-tooltip
        />
        <el-table-column
            prop="nameKh"
            :label="t('category.name_kh')"
            min-width="160"
            show-overflow-tooltip
        />
        <el-table-column 
            prop="description" 
            :label="t('category.description')" 
            min-width="220" 
            show-overflow-tooltip
        >
            <template #default="{ row }">
                {{ row.description || '—' }}
            </template>
        </el-table-column>
        <el-table-column 
            :label="t('category.status')" 
            width="110"
        >
            <template #default="{ row }">
                <el-tag 
                    :type="row.status ? 'success' : 'info'"
                >
                    {{ row.status ? t('category.active') : t('category.inactive') }}
                </el-tag>
            </template>
        </el-table-column>
        <el-table-column
            :label="t('category.created_by')"
            min-width="160"
            show-overflow-tooltip
        >
            <template #default="{ row }">
                {{ row.createdByUser?.username || '—' }}
            </template>
        </el-table-column>
        <el-table-column 
            :label="t('category.created_at')" 
            min-width="190"
        >
            <template #default="{ row }">
                {{ formatDate(row.createdAt) }}
            </template>
        </el-table-column>
        <el-table-column 
            :label="t('category.actions')" 
            width="150" 
            fixed="right"
        >
            <template #default="{ row }">
                <el-tag role="button" :tabindex="saving || deletingId !== null ? -1 : 0" :aria-disabled="saving || deletingId !== null" type="success" :disabled="saving || deletingId !== null" :aria-label="t('category.edit_label', { name: locale === 'km' ? row.nameKh : row.nameEn })" @click="openForm(row)" @keydown.enter.prevent="openForm(row)" @keydown.space.prevent="openForm(row)">
                    <Icon name="akar-icons:edit"/>
                </el-tag>
                &nbsp;
                <el-tag role="button" :tabindex="saving || deletingId !== null ? -1 : 0" :aria-disabled="saving || deletingId !== null" type="danger" :loading="deletingId === row.id" :disabled="saving || deletingId !== null" :aria-label="t('category.delete_label', { name: locale === 'km' ? row.nameKh : row.nameEn })" @click="deleteCategory(row)" @keydown.enter.prevent="deleteCategory(row)" @keydown.space.prevent="deleteCategory(row)">
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
        :title="editingId !== null ? t('category.edit') : t('category.create')" 
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
            @submit.prevent="saveCategory"
        >
            <el-form-item
                :label="t('category.code')"
                prop="code"
            >
                <el-input
                    v-model="form.code"
                    maxlength="250"
                    :placeholder="t('category.code_placeholder')"
                />
            </el-form-item>
            <el-form-item
                :label="t('category.name_en')"
                prop="nameEn"
            >
                <el-input
                    v-model="form.nameEn"
                    maxlength="250"
                    :placeholder="t('category.name_en_placeholder')"
                />
            </el-form-item>
            <el-form-item
                :label="t('category.name_kh')"
                prop="nameKh"
            >
                <el-input
                    v-model="form.nameKh"
                    maxlength="250"
                    :placeholder="t('category.name_kh_placeholder')"
                />
            </el-form-item>
            <el-form-item 
                :label="t('category.description')" 
                prop="description"
            >
                <el-input 
                    v-model="form.description" 
                    type="textarea" 
                    :rows="3" 
                    maxlength="250" 
                    show-word-limit 
                    :placeholder="t('category.description_placeholder')" 
                />
            </el-form-item>
            <el-form-item 
                :label="t('category.status')" 
                prop="status"
            >
                <el-switch 
                    v-model="form.status" 
                    :active-text="t('category.active')" 
                    :inactive-text="t('category.inactive')" 
                />
            </el-form-item>
            <div 
                class="flex justify-end gap-2 pt-3"
            >
                <el-button 
                    :disabled="saving" 
                    @click="dialogVisible = false"
                >
                    {{ t('category.cancel') }}
                </el-button>
                <el-button 
                    native-type="submit" 
                    type="primary" 
                    :loading="saving"
                >
                    {{ editingId !== null ? t('category.save') : t('category.create') }}
                </el-button>
            </div>
      </el-form>
    </el-dialog>
  </section>
  </el-config-provider>
</template>
