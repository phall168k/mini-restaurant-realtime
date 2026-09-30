<script setup lang="ts">
import { RoleEnum } from '~/constants/role.enum'
import { RealtimeEvent } from '~/constants/realtime-events'
import type { IDashboard } from '~/types/dashboard'
import DashboardFrame from './DashboardFrame.vue'
import DashboardMetrics from './DashboardMetrics.vue'
import DashboardQueue from './DashboardQueue.vue'
import DashboardWorkspace from './DashboardWorkspace.vue'
import DashboardPayments from './DashboardPayments.vue'

// Cashier: Orders awaiting payment and the signed-in cashier's own daily collections.
// Keep this role's event subscriptions and layout independent of the other dashboards.
const props = defineProps<{ initialData?: IDashboard | null }>()
const { dashboard, loading, error, refresh } = useRoleDashboard(RoleEnum.CASHIER, [
  RealtimeEvent.ORDER_STATUS_CHANGED,
  RealtimeEvent.ORDER_ITEM_STATUS_CHANGED,
  RealtimeEvent.ORDER_READY,
  RealtimeEvent.ORDER_CANCELED,
], props.initialData)
</script>

<template>
  <DashboardFrame :dashboard="dashboard" :loading="loading" :error="error" @refresh="refresh">
    <template v-if="dashboard">
      <!-- Orders awaiting payment and the signed-in cashier's own daily collections. -->
      <DashboardMetrics :dashboard="dashboard" />
      <div class="grid items-start gap-6 xl:grid-cols-3">
        <DashboardQueue :dashboard="dashboard" queue-title="payment_queue" />
        <div class="space-y-6">
          <DashboardWorkspace :role="RoleEnum.CASHIER" destination="/admin/operation/payment" />
        </div>
      </div>
      <DashboardPayments :dashboard="dashboard" personal />
    </template>
  </DashboardFrame>
</template>
