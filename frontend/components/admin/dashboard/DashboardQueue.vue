<script setup lang="ts">
import type { IDashboard } from '~/types/dashboard'
defineProps<{ dashboard: IDashboard; queueTitle: 'active_queue' | 'kitchen_queue' | 'payment_queue' }>()
const { t } = useI18n()
const dateTime = useDashboardDate()
</script>

<template>
  <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white xl:col-span-2">
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
      <div><h2 class="font-semibold text-slate-900">{{ t(`dashboard.${queueTitle}`) }}</h2><p class="mt-1 text-xs text-slate-500">{{ t('dashboard.queue_hint', { shown: dashboard.queue.length, total: dashboard.queueCount }) }}</p></div>
      <el-tag type="info">{{ dashboard.queueCount }}</el-tag>
    </div>
    <el-table :data="dashboard.queue" :empty-text="t('dashboard.empty_queue')">
      <el-table-column prop="orderNumber" :label="t('payment.order')" min-width="150" />
      <el-table-column :label="t('payment.table')" min-width="115"><template #default="{ row }">{{ row.tableName || '—' }}</template></el-table-column>
      <el-table-column :label="t('payment.status')" min-width="125"><template #default="{ row }"><el-tag :type="row.status === 'READY' || row.status === 'SERVED' ? 'success' : 'warning'">{{ t(`order.statuses.${row.status}`) }}</el-tag></template></el-table-column>
      <el-table-column :label="t('payment.created')" min-width="160"><template #default="{ row }">{{ dateTime(row.createdAt) }}</template></el-table-column>
    </el-table>
  </section>
</template>
