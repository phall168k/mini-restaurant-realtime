<script setup lang="ts">
import type { IDashboard } from '~/types/dashboard'
const props = defineProps<{ dashboard: IDashboard }>()
const { t } = useI18n()
const tableStatuses = ['available', 'occupied', 'reserved', 'cleaning', 'inactive']
const tableCount = (status: string) => props.dashboard?.tableStatuses.find(row => row.status === status)?.count ?? 0
const allTables = computed(() => props.dashboard?.tableStatuses.reduce((sum, row) => sum + row.count, 0) ?? 0)
</script>

<template>
  <section class="rounded-2xl border border-slate-200 bg-white p-5">
    <h2 class="mb-1 font-semibold text-slate-900">{{ t('dashboard.tables') }}</h2>
    <p class="mb-5 text-xs text-slate-500">{{ t('dashboard.tables_hint') }}</p>
    <div v-for="status in tableStatuses" :key="status" class="mb-4 last:mb-0">
      <div class="mb-2 flex justify-between text-sm"><span>{{ t(`restaurant_table.statuses.${status}`) }}</span><strong>{{ tableCount(status) }}</strong></div>
      <div class="h-2 overflow-hidden rounded-full bg-slate-100"><div class="h-full rounded-full bg-teal-600" :style="{ width: `${allTables ? tableCount(status) / allTables * 100 : 0}%` }" /></div>
    </div>
  </section>
</template>
