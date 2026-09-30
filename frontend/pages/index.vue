<script setup lang="ts">
import { Refresh } from '@element-plus/icons-vue'
import { RoleEnum } from '~/constants/role.enum'
import type { IDashboard } from '~/types/dashboard'
import AdminDashboard from '~/components/admin/dashboard/AdminDashboard.vue'
import ReceptionistDashboard from '~/components/admin/dashboard/ReceptionistDashboard.vue'
import CookerDashboard from '~/components/admin/dashboard/CookerDashboard.vue'
import CashierDashboard from '~/components/admin/dashboard/CashierDashboard.vue'

definePageMeta({ title: 'Dashboard', titleKey: 'navigation.dashboard', hidePageHeader: true })
const { t } = useI18n()
const roles = ref<RoleEnum[]>([])
const selectedRole = ref<RoleEnum>()
const initialData = ref<IDashboard | null>(null)
const loading = ref(false)
const error = ref('')
let active = true

// This page only discovers authorized roles and hosts the selected role component.
// Each component owns its own layout, requests, and realtime subscriptions.
const dashboards = {
  [RoleEnum.ADMIN]: AdminDashboard,
  [RoleEnum.RECEPTIONIST]: ReceptionistDashboard,
  [RoleEnum.COOKER]: CookerDashboard,
  [RoleEnum.CASHIER]: CashierDashboard,
}
async function initialize() {
  if (loading.value) return
  loading.value = true
  error.value = ''
  try {
    const response = await useApi<{ payload: IDashboard }>('admin/dashboard')
    if (!active) return
    roles.value = response.payload.roles
    selectedRole.value = response.payload.role
    initialData.value = response.payload
  } catch {
    if (active) error.value = t('dashboard.load_error')
  } finally { if (active) loading.value = false }
}
function changeRole() {
  // Only use the bootstrap snapshot once; returning to a role fetches fresh data.
  initialData.value = null
}
onMounted(() => { void initialize() })
onBeforeUnmount(() => { active = false })
</script>

<template>
  <section class="space-y-6" :aria-label="t('navigation.dashboard')">
    <!-- Shared navigation; role-specific content lives in the four dashboard components. -->
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p class="mb-2 text-xs font-semibold uppercase tracking-widest text-teal-700">{{ t('app.name') }}</p>
        <h1 class="text-2xl font-semibold text-slate-900">{{ t('navigation.dashboard') }}</h1>
        <p v-if="selectedRole" class="mt-2 max-w-2xl text-sm text-slate-500">{{ t(`dashboard.descriptions.${selectedRole}`) }}</p>
      </div>
      <el-select v-if="roles.length > 1" v-model="selectedRole" class="!w-44" :aria-label="t('dashboard.view')" @change="changeRole">
        <el-option v-for="role in roles" :key="role" :value="role" :label="t(`dashboard.roles.${role}`)" />
      </el-select>
      <el-tag v-else-if="selectedRole" type="success" size="large">{{ t(`dashboard.roles.${selectedRole}`) }}</el-tag>
    </header>
    <el-alert v-if="error" :title="error" type="error" show-icon :closable="false" />
    <el-button v-if="error" :icon="Refresh" :loading="loading" @click="initialize">{{ t('payment.refresh') }}</el-button>
    <el-skeleton v-if="loading" :rows="8" animated class="rounded-2xl border border-slate-200 bg-white p-6" />
    <!-- The key unmounts the previous role, removing its listeners and ignoring late responses. -->
    <component :is="dashboards[selectedRole]" v-if="selectedRole" :key="selectedRole" :initial-data="initialData" />
  </section>
</template>
