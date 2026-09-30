<script setup lang="ts">
import type { IDashboard } from '~/types/dashboard'
import { Refresh } from '@element-plus/icons-vue'
defineProps<{ dashboard: IDashboard | null; loading: boolean; error: string }>()
defineEmits<{ refresh: [] }>()
const { t } = useI18n()
const dateTime = useDashboardDate()
</script>

<template>
  <!-- Shared presentation only; the mounted role component owns requests and listeners. -->
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
      <div v-if="dashboard" class="flex flex-wrap gap-3">
        <span>{{ t('dashboard.business_day', { date: dashboard.date }) }}</span>
        <span>{{ t('dashboard.updated', { time: dateTime(dashboard.generatedAt) }) }}</span>
      </div>
      <el-button :icon="Refresh" :loading="loading" @click="$emit('refresh')">{{ t('payment.refresh') }}</el-button>
    </div>
    <el-alert v-if="error" :title="error" type="error" show-icon :closable="false" />
    <el-skeleton v-if="loading && !dashboard" :rows="8" animated class="rounded-2xl border border-slate-200 bg-white p-6" />
    <slot v-if="dashboard" />
  </div>
</template>
