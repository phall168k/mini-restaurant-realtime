<script setup lang="ts">
import { ElMessageBox } from 'element-plus'
import { Plus, Search } from '@element-plus/icons-vue'
import en from 'element-plus/es/locale/lang/en'
import km from 'element-plus/es/locale/lang/km'
import type { FormInstance, FormRules } from 'element-plus'
import type { IRole, IRoleForm, IRoleListResponse } from '~/types/role'

definePageMeta({ title: 'Roles', titleKey: 'role.title', hidePageHeader: true })

const { t, locale } = useI18n()
const elementLocale = computed(() => locale.value === 'km' ? km : en)

const endpoint = 'admin/system/roles'
const roles = ref<IRole[]>([])
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
const form = reactive<IRoleForm>({ name: '', description: '', status: true })
const rules = computed<FormRules<IRoleForm>>(() => ({
  name: [
    { required: true, whitespace: true, message: t('role.name_required'), trigger: 'blur' },
    { max: 250, message: t('role.max_length'), trigger: 'blur' },
  ],
  description: [{ max: 250, message: t('role.max_length'), trigger: 'blur' }],
}))
let requestId = 0

function errorMessage(error: unknown, fallback: string): string {
  const message = (error as { data?: { message?: unknown } })?.data?.message
  if (typeof message === 'string') return message
  if (Array.isArray(message) && message.every(item => typeof item === 'string')) return message.join(' ')
  return fallback
}

async function loadRoles() {
  const currentRequest = ++requestId
  loading.value = true
  listError.value = ''
  try {
    const response = await useApi<IRoleListResponse>(endpoint, {
      params: { page: page.value, limit: pageSize.value, search: appliedSearch.value || undefined, orderBy: 'id', orderDirection: 'DESC' },
    })
    if (currentRequest !== requestId) return
    const lastPage = Math.max(1, Math.ceil(response.payload.totalRecords / pageSize.value))
    if (page.value > lastPage) {
      page.value = lastPage
      return await loadRoles()
    }
    roles.value = response.payload.content
    total.value = response.payload.totalRecords
  } catch (error) {
    if (currentRequest !== requestId) return
    roles.value = []
    total.value = 0
    listError.value = errorMessage(error, t('role.load_error'))
  } finally {
    if (currentRequest === requestId) loading.value = false
  }
}

function searchRoles() {
  appliedSearch.value = search.value.trim()
  page.value = 1
  loadRoles()
}

function changePage(value: number) {
  page.value = value
  loadRoles()
}

function changePageSize(value: number) {
  pageSize.value = value
  page.value = 1
  loadRoles()
}

async function openForm(role?: IRole) {
  editingId.value = role?.id ?? null
  Object.assign(form, { name: role?.name ?? '', description: role?.description ?? '', status: role?.status ?? true })
  dialogVisible.value = true
  await nextTick()
  formRef.value?.clearValidate()
}

async function saveRole() {
  if (saving.value || !formRef.value) return
  if (!await formRef.value.validate().catch(() => false)) return
  saving.value = true
  const isEditing = editingId.value !== null
  try {
    await useApi(isEditing ? `${endpoint}/${editingId.value}` : endpoint, {
      method: isEditing ? 'put' : 'post',
      body: { name: form.name.trim(), description: form.description.trim(), status: form.status },
    })
    dialogVisible.value = false
    useMessage(isEditing ? t('role.updated') : t('role.created'))
    await loadRoles()
  } catch (error) {
    useMessage(errorMessage(error, t('role.save_error')), 'error')
  } finally {
    saving.value = false
  }
}

async function deleteRole(role: IRole) {
  if (deletingId.value !== null) return
  deletingId.value = role.id
  try {
    await ElMessageBox.confirm(t('role.delete_confirm', { name: role.name }), t('role.delete_title'), {
      confirmButtonText: t('role.delete'), cancelButtonText: t('role.cancel'), type: 'warning',
    })
    await useApi(`${endpoint}/${role.id}`, { method: 'delete' })
    useMessage(t('role.deleted'))
    await loadRoles()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      useMessage(errorMessage(error, t('role.delete_error')), 'error')
    }
  } finally {
    deletingId.value = null
  }
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString(locale.value === 'km' ? 'km-KH' : 'en-US')
}

onMounted(loadRoles)
onBeforeUnmount(() => { requestId++ })
</script>

<template>
  <el-config-provider :locale="elementLocale">
    <section 
        class="rounded-xl border border-slate-200 bg-white p-4 md:p-6" 
        :aria-label="t('role.management')"
    >
        <header 
            class="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5"
        >
        <div>
            <h1 
                class="text-xl font-semibold tracking-tight text-slate-900"
            >
                {{ t('role.title') }}
            </h1>
            <p class="mt-1 text-sm text-slate-500">{{ t('role.subtitle') }}</p>
        </div>
        <form 
            class="mb-5 flex flex-wrap items-center gap-2" 
            role="search" 
            @submit.prevent="searchRoles"
        >
            <el-input 
                v-model="search" 
                :prefix-icon="Search" 
                :placeholder="t('role.search_placeholder')" 
                :aria-label="t('role.search_label')" 
                clearable 
                class="!w-full sm:!w-80" 
                @clear="searchRoles" 
            />
            <el-button 
                type="primary" 
                :icon="Plus" 
                class="!ml-0" 
                @click="openForm()"
            >
                {{ t('role.create') }}
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
    />
    <el-table 
        v-loading="loading" 
        :data="roles" 
        row-key="id" 
        :empty-text="listError ? t('role.load_error') : t('role.empty')" 
        class="w-full"
    >
        <el-table-column 
            prop="name" 
            :label="t('role.name')" 
            min-width="160" 
            show-overflow-tooltip 
        />
        <el-table-column 
            prop="description" 
            :label="t('role.description')" 
            min-width="220" 
            show-overflow-tooltip
        >
            <template #default="{ row }">
                {{ row.description || '—' }}
            </template>
        </el-table-column>
        <el-table-column 
            :label="t('role.status')" 
            width="110"
        >
            <template #default="{ row }">
                <el-tag 
                    :type="row.status ? 'success' : 'info'"
                >
                    {{ row.status ? t('role.active') : t('role.inactive') }}
                </el-tag>
            </template>
        </el-table-column>
        <el-table-column 
            :label="t('role.created_at')" 
            min-width="190"
        >
            <template #default="{ row }">
                {{ formatDate(row.createdAt) }}
            </template>
        </el-table-column>
        <el-table-column 
            :label="t('role.actions')" 
            width="150" 
            fixed="right"
        >
            <template #default="{ row }">
                <el-tag link type="success" :disabled="saving || deletingId !== null" :aria-label="t('role.edit_label', { name: row.name })" @click="openForm(row)">
                    <Icon name="akar-icons:edit"/>
                </el-tag>
                &nbsp;
                <el-tag link type="danger" :loading="deletingId === row.id" :disabled="saving || deletingId !== null" :aria-label="t('role.delete_label', { name: row.name })" @click="deleteRole(row)">
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
        :title="editingId !== null ? t('role.edit') : t('role.create')" 
        width="50%" 
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
            @submit.prevent="saveRole"
        >
            <el-form-item 
                :label="t('role.name')" 
                prop="name"
            >
                <el-input 
                    v-model="form.name" 
                    maxlength="250" 
                    :placeholder="t('role.name_placeholder')" 
                />
            </el-form-item>
            <el-form-item 
                :label="t('role.description')" 
                prop="description"
            >
                <el-input 
                    v-model="form.description" 
                    type="textarea" 
                    :rows="3" 
                    maxlength="250" 
                    show-word-limit 
                    :placeholder="t('role.description_placeholder')" 
                />
            </el-form-item>
            <el-form-item 
                :label="t('role.status')" 
                prop="status"
            >
                <el-switch 
                    v-model="form.status" 
                    :active-text="t('role.active')" 
                    :inactive-text="t('role.inactive')" 
                />
            </el-form-item>
            <div 
                class="flex justify-end gap-2 pt-3"
            >
                <el-button 
                    :disabled="saving" 
                    @click="dialogVisible = false"
                >
                    {{ t('role.cancel') }}
                </el-button>
                <el-button 
                    native-type="submit" 
                    type="primary" 
                    :loading="saving"
                >
                    {{ editingId !== null ? t('role.save') : t('role.create') }}
                </el-button>
            </div>
      </el-form>
    </el-dialog>
  </section>
  </el-config-provider>
</template>
