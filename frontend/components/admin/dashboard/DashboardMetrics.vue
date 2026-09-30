<script setup lang="ts">
import type { IDashboard } from '~/types/dashboard'
defineProps<{ dashboard: IDashboard }>()
const { t } = useI18n()
const metricIcons: Record<string, string> = {
  active_orders: 'hugeicons:shopping-basket-01', orders_today: 'hugeicons:shopping-basket-01',
  available_tables: 'hugeicons:table-01', occupied_tables: 'hugeicons:table-01',
  kitchen_orders: 'hugeicons:chef-hat', pending_items: 'hugeicons:chef-hat', preparing_items: 'hugeicons:chef-hat', ready_items: 'hugeicons:chef-hat',
}
</script>

<template>
  <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <article v-for="metric in dashboard.metrics" :key="metric.key" class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div class="mb-4 flex items-center justify-between gap-3">
        <h2 class="text-sm font-medium text-slate-500">{{ t(`dashboard.metrics.${metric.key}`) }}</h2>
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><Icon :name="metricIcons[metric.key] || 'f7:money-dollar-circle'" size="22" /></span>
      </div>
      <p class="break-all text-3xl font-semibold tracking-tight text-slate-900">{{ metric.value }}</p>
    </article>
  </div>
</template>
