<script setup lang="ts">
import { RoleEnum } from '~/constants/role.enum'
import { RealtimeEvent } from '~/constants/realtime-events'
import type { IDashboard } from '~/types/dashboard'
import DashboardFrame from './DashboardFrame.vue'
import DashboardMetrics from './DashboardMetrics.vue'
import DashboardQueue from './DashboardQueue.vue'
import DashboardWorkspace from './DashboardWorkspace.vue'
import DashboardTables from './DashboardTables.vue'
import DashboardPayments from './DashboardPayments.vue'

// Admin: Restaurant-wide sales, active orders, and table availability.
// Keep this role's event subscriptions and layout independent of the other dashboards.
const props = defineProps<{ initialData?: IDashboard | null }>()
const { dashboard, loading, error, refresh } = useRoleDashboard(RoleEnum.ADMIN, [
  RealtimeEvent.KITCHEN_ORDER_NEW,
  RealtimeEvent.KITCHEN_ORDER_UPDATED,
  RealtimeEvent.ORDER_ITEM_ADD_MORE,
  RealtimeEvent.ORDER_STATUS_CHANGED,
  RealtimeEvent.ORDER_ITEM_STATUS_CHANGED,
  RealtimeEvent.ORDER_READY,
  RealtimeEvent.ORDER_CANCELED,
  RealtimeEvent.TABLE_STATUS_CHANGED,
], props.initialData)
</script>

<template>
  <DashboardFrame :dashboard="dashboard" :loading="loading" :error="error" @refresh="refresh">
    <template v-if="dashboard">
      <!-- Restaurant-wide sales, active orders, and table availability. -->
      <DashboardMetrics :dashboard="dashboard" />
      <div class="grid items-start gap-6 xl:grid-cols-3">
        <DashboardQueue :dashboard="dashboard" queue-title="active_queue" />
        <div class="space-y-6">
          <DashboardWorkspace :role="RoleEnum.ADMIN" destination="/admin/master-data/restaurant-table" />
          <DashboardTables :dashboard="dashboard" />
        </div>
      </div>
      <DashboardPayments :dashboard="dashboard" />
    </template>
  </DashboardFrame>
</template>
