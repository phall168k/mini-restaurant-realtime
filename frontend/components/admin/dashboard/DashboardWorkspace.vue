<script setup lang="ts">
import { Right } from '@element-plus/icons-vue'
import type { RoleEnum } from '~/constants/role.enum'
defineProps<{ role: RoleEnum; destination: string }>()
const { t } = useI18n()
</script>

<template>
  <section class="rounded-2xl bg-teal-800 p-6 text-white">
    <h2 class="text-lg font-semibold">{{ t('dashboard.workspace') }}</h2>
    <p class="mb-5 mt-2 text-sm text-teal-100">{{ t(`dashboard.descriptions.${role}`) }}</p>
    <NuxtLink :to="destination" class="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">{{ t(`dashboard.actions.${role}`) }}<Right class="h-4 w-4" aria-hidden="true" /></NuxtLink>
  </section>
</template>
