<script setup lang="ts">
import { RoleEnum } from '~/constants/role.enum'
import { RealtimeEvent } from '~/constants/realtime-events'
import type { IDashboard } from '~/types/dashboard'
import DashboardFrame from './DashboardFrame.vue'
import DashboardMetrics from './DashboardMetrics.vue'
import DashboardQueue from './DashboardQueue.vue'
import DashboardWorkspace from './DashboardWorkspace.vue'

// Cooker: Pending/preparing kitchen orders and their item quantities.
// Keep this role's event subscriptions and layout independent of the other dashboards.
const props = defineProps<{ initialData?: IDashboard | null }>()
const { dashboard, loading, error, refresh } = useRoleDashboard(RoleEnum.COOKER, [
  RealtimeEvent.KITCHEN_ORDER_NEW,
  RealtimeEvent.KITCHEN_ORDER_UPDATED,
  RealtimeEvent.ORDER_ITEM_ADD_MORE,
  RealtimeEvent.ORDER_STATUS_CHANGED,
  RealtimeEvent.ORDER_ITEM_STATUS_CHANGED,
  RealtimeEvent.ORDER_READY,
  RealtimeEvent.ORDER_CANCELED,
], props.initialData)
</script>

<template>
  <DashboardFrame :dashboard="dashboard" :loading="loading" :error="error" @refresh="refresh">
    <template v-if="dashboard">
      <!-- Pending/preparing kitchen orders and their item quantities. -->
      <DashboardMetrics :dashboard="dashboard" />
      <div class="grid items-start gap-6 xl:grid-cols-3">
        <DashboardQueue :dashboard="dashboard" queue-title="kitchen_queue" />
        <div class="space-y-6">
          <DashboardWorkspace :role="RoleEnum.COOKER" destination="/admin/operation/kitchen" />
        </div>
      </div>
    </template>
  </DashboardFrame>
</template>
