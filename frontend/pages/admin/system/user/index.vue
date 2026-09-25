<script setup lang="ts">
import { ElMessageBox } from 'element-plus'
import { Plus, Search, Refresh, Edit, Delete } from '@element-plus/icons-vue'
import en from 'element-plus/es/locale/lang/en'
import km from 'element-plus/es/locale/lang/km'
import type { FormInstance, FormRules } from 'element-plus'
import type { IUser, IUserForm, IUserListResponse, IUserRoleOption } from '~/types/user'

definePageMeta({ title: 'Users', titleKey: 'user.title', hidePageHeader: true })

const { t, locale } = useI18n()
const elementLocale = computed(() => locale.value === 'km' ? km : en)

const endpoint = 'admin/system/users'
const users = ref<IUser[]>([])
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
const form = reactive<IUserForm>({ 
    username: '', 
    password: '', 
    confirmPassword: '', 
    status: false, 
    isActive: true, 
    isSuperUser: null, 
    profile: '', 
    roles: [] 
})
const roleOptions = ref<IUserRoleOption[]>([])
const selectedRoleOptions = ref<IUserRoleOption[]>([])
const rolesLoading = ref(false)
const rolesError = ref('')
const availableRoles = computed(() => Array.from(new Map(
  [...selectedRoleOptions.value, ...roleOptions.value].map(role => [role.id, role]),
).values()))
const superUserChoice = computed({
  get: () => form.isSuperUser === null ? 'unset' : form.isSuperUser ? 'yes' : 'no',
  set: (value: string) => { form.isSuperUser = value === 'unset' ? null : value === 'yes' },
})
const rules = computed<FormRules<IUserForm>>(() => ({
  username: [
    { required: true, whitespace: true, message: t('user.username_required'), trigger: 'blur' },
    { max: 250, message: t('user.max_length'), trigger: 'blur' },
  ],
  password: [{
    validator: (_rule, value: string, callback) => {
      if (!value && editingId.value !== null) return callback()
      if (Array.from(value).length < 8 || new TextEncoder().encode(value).length > 72) {
        return callback(new Error(t('user.password_length')))
      }
      callback()
    },
    trigger: 'blur',
  }],
  confirmPassword: [{
    validator: (_rule, value: string, callback) => {
      if (!value && (editingId.value === null || form.password !== '')) {
        return callback(new Error(t('user.confirm_password_required')))
      }
      if (value !== form.password) return callback(new Error(t('user.password_mismatch')))
      callback()
    },
    trigger: ['blur', 'change'],
  }],
  profile: [{ max: 2048, message: t('user.profile_length'), trigger: 'blur' }],
}))

watch(() => form.password, () => {
  if (dialogVisible.value && form.confirmPassword) {
    void formRef.value?.validateField('confirmPassword').catch(() => {})
  }
})

async function loadRoleOptions() {
  if (rolesLoading.value) return
  rolesLoading.value = true
  rolesError.value = ''
  try {
    const response = await useApi<IUserRoleOption[] | { payload: IUserRoleOption[] }>('admin/system/roles/select-options')
    roleOptions.value = Array.isArray(response) ? response : response.payload
  } catch (error) {
    rolesError.value = errorMessage(error, t('user.roles_error'))
  } finally {
    rolesLoading.value = false
  }
}

let requestId = 0

function errorMessage(error: unknown, fallback: string): string {
  const message = (error as { data?: { message?: unknown } })?.data?.message
  if (typeof message === 'string') return message
  if (Array.isArray(message) && message.every(item => typeof item === 'string')) return message.join(' ')
  return fallback
}

async function loadUsers() {
  const currentRequest = ++requestId
  loading.value = true
  listError.value = ''
  try {
    const response = await useApi<IUserListResponse>(endpoint, {
      params: { page: page.value, limit: pageSize.value, search: appliedSearch.value || undefined, orderBy: 'id', orderDirection: 'DESC' },
    })
    if (currentRequest !== requestId) return
    const lastPage = Math.max(1, Math.ceil(response.payload.totalRecords / pageSize.value))
    if (page.value > lastPage) {
      page.value = lastPage
      return await loadUsers()
    }
    users.value = response.payload.content
    total.value = response.payload.totalRecords
  } catch (error) {
    if (currentRequest !== requestId) return
    users.value = []
    total.value = 0
    listError.value = errorMessage(error, t('user.load_error'))
  } finally {
    if (currentRequest === requestId) loading.value = false
  }
}

function searchUsers() {
  appliedSearch.value = search.value.trim()
  page.value = 1
  loadUsers()
}

function changePage(value: number) {
  page.value = value
  loadUsers()
}

function changePageSize(value: number) {
  pageSize.value = value
  page.value = 1
  loadUsers()
}

async function openForm(user?: IUser) {
  if (saving.value || deletingId.value !== null) return
  editingId.value = user?.id ?? null
  selectedRoleOptions.value = (user?.roles ?? []).map(role => ({ id: role.id, name: role.name }))
  Object.assign(form, {
    username: user?.username ?? '', password: '', confirmPassword: '', status: user?.status ?? false,
    isActive: user?.isActive ?? true, isSuperUser: user?.isSuperUser ?? null,
    profile: user?.profile ?? '', roles: (user?.roles ?? []).map(role => role.id),
  })
  dialogVisible.value = true
  void loadRoleOptions()
  await nextTick()
  formRef.value?.clearValidate()
}

async function saveUser() {
  if (saving.value || rolesLoading.value || rolesError.value || !formRef.value) return
  if (!await formRef.value.validate().catch(() => false)) return
  saving.value = true
  const isEditing = editingId.value !== null
  try {
    await useApi(isEditing ? `${endpoint}/${editingId.value}` : endpoint, {
      method: isEditing ? 'put' : 'post',
      body: {
        username: form.username.trim(), status: form.status, isActive: form.isActive,
        isSuperUser: form.isSuperUser, profile: form.profile.trim(), roles: [...form.roles],
        ...(!isEditing || form.password !== '' ? { password: form.password } : {}),
      },
    })
    dialogVisible.value = false
    useMessage(isEditing ? t('user.updated') : t('user.created'))
    await loadUsers()
  } catch (error) {
    useMessage(errorMessage(error, t('user.save_error')), 'error')
  } finally {
    saving.value = false
  }
}

async function deleteUser(user: IUser) {
  if (deletingId.value !== null) return
  deletingId.value = user.id
  try {
    await ElMessageBox.confirm(t('user.delete_confirm', { name: user.username }), t('user.delete_title'), {
      confirmButtonText: t('user.delete'), cancelButtonText: t('user.cancel'), type: 'warning',
    })
    await useApi(`${endpoint}/${user.id}`, { method: 'delete' })
    useMessage(t('user.deleted'))
    await loadUsers()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      useMessage(errorMessage(error, t('user.delete_error')), 'error')
    }
  } finally {
    deletingId.value = null
  }
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString(locale.value === 'km' ? 'km-KH' : 'en-US')
}

onMounted(loadUsers)
onBeforeUnmount(() => { requestId++ })
</script>

<template>
    <el-config-provider 
        :locale="elementLocale"
    >
        <section 
            class="rounded-xl border border-slate-200 bg-white p-4 md:p-6" 
            :aria-label="t('user.management')"
        >
            <header 
                class="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5"
            >
                <div>
                    <h1 
                        class="text-xl font-semibold tracking-tight text-slate-900"
                    >
                        {{ t('user.title') }}
                    </h1>
                    <p 
                        class="mt-1 text-sm text-slate-500"
                    >
                        {{ t('user.subtitle') }}
                    </p>
                </div>
                <div 
                    class="flex flex-wrap items-center gap-2"
                >
                    <form 
                        class="flex flex-wrap items-center gap-2" 
                        role="search" 
                        @submit.prevent="searchUsers"
                    >
                        <el-input 
                            v-model="search" 
                            :prefix-icon="Search" 
                            :placeholder="t('user.search_placeholder')" 
                            :aria-label="t('user.search_label')" 
                            clearable class="!w-full sm:!w-64" 
                            @clear="searchUsers" 
                        />
                        <el-button 
                            native-type="submit" 
                            :loading="loading"
                        >
                                {{ t('user.search') }}
                        </el-button>
                    </form>
                    <el-button 
                        :icon="Refresh" 
                        :disabled="loading" 
                        :aria-label="t('user.refresh')" 
                        :title="t('user.refresh')" 
                        class="!ml-0" 
                        @click="loadUsers" 
                    />
                    <el-button 
                        type="primary" 
                        :icon="Plus" 
                        :disabled="saving || deletingId !== null" 
                        class="!ml-0" 
                        @click="openForm()"
                    >
                        {{ t('user.create') }}
                    </el-button>
                </div>
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
            :data="users" 
            row-key="id" 
            :empty-text="listError ? t('user.load_error') : t('user.empty')" 
            class="w-full"
            stripe
        >
            <el-table-column 
                prop="username" 
                :label="t('user.username')" 
                min-width="170" 
                show-overflow-tooltip 
            />
            <el-table-column 
                :label="t('user.roles')" 
                min-width="200"
            >
                <template #default="{ row }">
                    <div 
                        v-if="row.roles?.length" 
                        class="flex flex-wrap gap-1"
                    >
                        <el-tag 
                            v-for="role in row.roles" 
                            :key="role.id" size="small"
                        >
                            {{ role.name }}
                        </el-tag>
                    </div>
                    <span 
                        v-else 
                        class="text-slate-400"
                    >
                        {{ t('user.no_roles') }}
                    </span>
                </template>
            </el-table-column>
            <el-table-column 
                :label="t('user.status')" 
                min-width="120"
            >
                <template #default="{ row }">
                    <el-tag 
                        :type="row.status ? 'success' : 'info'"
                    >
                        {{ row.status ? t('user.active') : t('user.inactive') }}
                    </el-tag>
                </template>
            </el-table-column>
            <el-table-column 
                :label="t('user.is_active')" 
                min-width="140"
            >
                <template #default="{ row }">
                    <el-tag 
                        :type="row.isActive ? 'success' : 'info'"
                    >
                        {{ row.isActive ? t('user.yes') : t('user.no') }}
                    </el-tag>
                </template>
            </el-table-column>
            <el-table-column 
                :label="t('user.super_user')" 
                min-width="150"
            >
                <template #default="{ row }">
                    {{ row.isSuperUser == null ? t('user.unset') : row.isSuperUser ? t('user.yes') : t('user.no') }}
                </template>
            </el-table-column>
            <el-table-column 
                prop="profile" 
                :label="t('user.profile')" 
                min-width="180" 
                show-overflow-tooltip
            >
                <template #default="{ row }">
                    {{ row.profile || '—' }}
                </template>
            </el-table-column>
            <el-table-column 
                :label="t('user.created_at')" 
                min-width="190"
            >
                <template #default="{ row }">
                    {{ formatDate(row.createdAt) }}
                </template>
            </el-table-column>
            <el-table-column 
                :label="t('user.actions')" 
                width="120" fixed="right"
            >
                <template #default="{ row }">
                    <el-tag link type="success" :disabled="saving || deletingId !== null" :aria-label="t('user.edit_label', { name: row.name })" @click="openForm(row)">
                        <Icon name="akar-icons:edit"/>
                    </el-tag>
                    &nbsp;
                    <el-tag link type="danger" :loading="deletingId === row.id" :disabled="saving || deletingId !== null" :aria-label="t('delete_label.delete_label', { name: row.name })" @click="deleteUser(row)">
                        <Icon name="mi:delete"/>
                    </el-tag>
                </template>
            </el-table-column>
        </el-table>
        <div 
            class="mt-5 overflow-x-auto"
        >
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
            :title="editingId !== null ? t('user.edit') : t('user.create')" 
            width="min(800px, 94vw)" 
            :close-on-press-escape="!saving" 
            :show-close="!saving" 
            destroy-on-close 
            draggable 
            @closed="form.password = ''; form.confirmPassword = ''"
        >
            <el-form 
                ref="formRef" 
                :model="form" 
                :rules="rules" 
                label-position="top" 
                :disabled="saving" 
                @submit.prevent="saveUser"
            >
                <el-form-item 
                    :label="t('user.username')" 
                    prop="username"
                >
                    <el-input 
                        v-model="form.username" 
                        maxlength="250" 
                        autocomplete="off" 
                        :placeholder="t('user.username_placeholder')" 
                    />
                </el-form-item>
                <div 
                    class="grid gap-x-5 sm:grid-cols-2"
                >
                    <el-form-item 
                        :label="t('user.password')" 
                        prop="password" :required="editingId === null"
                    >
                        <el-input 
                            v-model="form.password" 
                            type="password" 
                            show-password 
                            autocomplete="new-password" 
                            :placeholder="t('user.password_placeholder')" 
                        />
                        <p 
                            v-if="editingId !== null" 
                            class="mt-1 text-xs text-slate-500"
                        >
                            {{ t('user.password_hint') }}
                        </p>
                    </el-form-item>
                    <el-form-item 
                        :label="t('user.confirm_password')" 
                        prop="confirmPassword" 
                        :required="editingId === null || form.password !== ''"
                    >
                        <el-input 
                            v-model="form.confirmPassword" 
                            type="password" 
                            show-password 
                            autocomplete="new-password" 
                            :placeholder="t('user.confirm_password_placeholder')" 
                        />
                    </el-form-item>
                </div>
            <el-form-item 
                :label="t('user.profile')" 
                prop="profile"
            >
                <el-input 
                    v-model="form.profile" 
                    maxlength="2048" 
                    clearable 
                    :placeholder="t('user.profile_placeholder')" 
                />
            </el-form-item>
            <el-alert 
                v-if="rolesError" 
                :title="rolesError" 
                type="error" 
                show-icon 
                :closable="false" 
                class="mb-3"
            >
                <el-button 
                    link 
                    type="primary" 
                    :loading="rolesLoading" 
                    @click="loadRoleOptions"
                >
                    {{ t('user.retry') }}
                </el-button>
            </el-alert>
            <el-form-item 
                :label="t('user.roles')" 
                prop="roles"
            >
                <el-select 
                    v-model="form.roles" 
                    multiple 
                    filterable 
                    clearable 
                    :loading="rolesLoading" 
                    :disabled="rolesLoading || !!rolesError" 
                    :placeholder="t('user.roles_placeholder')" 
                    class="w-full"
                >
                    <el-option 
                        v-for="role in availableRoles" 
                        :key="role.id" 
                        :label="role.name" 
                        :value="role.id" 
                    />
                </el-select>
            </el-form-item>
            <el-form-item 
                :label="t('user.super_user')" 
                prop="isSuperUser"
            >
                <el-radio-group 
                    v-model="superUserChoice"
                >
                    <el-radio 
                        value="unset"
                    >
                        {{ t('user.unset') }}
                    </el-radio>
                    <el-radio 
                        value="yes"
                    >
                        {{ t('user.yes') }}
                    </el-radio>
                    <el-radio
                        value="no"
                    >
                        {{ t('user.no') }}
                    </el-radio>
                </el-radio-group>
            </el-form-item>
            <div 
                class="flex justify-end gap-2 pt-3"
            >
                <el-button 
                    :disabled="saving" 
                    @click="dialogVisible = false"
                >
                    {{ t('user.cancel') }}
                </el-button>
                <el-button 
                    native-type="submit" 
                    type="primary" 
                    :loading="saving" 
                    :disabled="rolesLoading || !!rolesError"
                >
                    {{ editingId !== null ? t('user.save') : t('user.create') }}
                </el-button>
            </div>
            </el-form>
        </el-dialog>
        </section>
    </el-config-provider>
</template>
