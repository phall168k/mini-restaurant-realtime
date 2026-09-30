<script setup lang="ts">
import type { IDashboard } from '~/types/dashboard'
defineProps<{ dashboard: IDashboard; personal?: boolean }>()
const { t } = useI18n()
const dateTime = useDashboardDate()
</script>

<template>
  <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white">
    <div class="border-b border-slate-100 p-5"><h2 class="font-semibold text-slate-900">{{ t(personal ? 'dashboard.my_recent_payments' : 'dashboard.recent_payments') }}</h2><p class="mt-1 text-xs text-slate-500">{{ t('dashboard.payments_hint') }}</p></div>
    <el-table :data="dashboard.recentPayments" :empty-text="t('dashboard.empty_payments')">
      <el-table-column prop="paymentNo" :label="t('payment.number')" min-width="230" />
      <el-table-column :label="t('payment.method')" min-width="130"><template #default="{ row }">{{ t(`payment.methods.${row.paymentMethod}`) }}</template></el-table-column>
      <el-table-column prop="total" :label="t('payment.total')" min-width="140" align="right" />
      <el-table-column :label="t('payment.created')" min-width="190"><template #default="{ row }">{{ dateTime(row.createdAt) }}</template></el-table-column>
    </el-table>
  </section>
</template>
