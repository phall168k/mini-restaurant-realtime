<script setup lang="ts">
import { Close } from '@element-plus/icons-vue'

defineProps<{ collapsed: boolean; mobileOpen: boolean }>()
const emit = defineEmits<{ close: [] }>()
const route = useRoute()

interface MenuItem {
  label: string
  to: string
  icon: string
  enabled: boolean
}

const groups: { label: string; items: MenuItem[] }[] = [
  { 
    label: 'Workspace', 
    items: [
      { 
        label: 'Dashboard', 
        to: '/', icon: 'hugeicons:dashboard-square-02', 
        enabled: true 
      }
    
    ]
  },
]

function isActive(path: string) {
  return route.path === path || (path !== '/' && route.path.startsWith(`${path}/`))
}
</script>

<template>
  <aside id="admin-sidebar" aria-label="Main navigation"
    class="fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col border-r border-slate-200 bg-white transition-[width,transform] duration-200 motion-reduce:transition-none md:translate-x-0"
    :class="[collapsed ? 'md:w-20' : 'md:w-[248px]', mobileOpen ? 'translate-x-0' : '-translate-x-full max-md:invisible']">
    <NuxtLink to="/" aria-label="Mini Restaurant dashboard" class="flex h-[72px] shrink-0 items-center gap-3 overflow-hidden whitespace-nowrap px-[22px] focus-visible:outline focus-visible:outline-teal-700">
      <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-700 text-3xl font-extrabold text-white">m<span class="text-teal-200">.</span></span>
      <span :class="{ 'md:hidden': collapsed }">
        <strong class="block text-sm">Mini Restaurant</strong>
        <small class="mt-1 block text-[8px] tracking-widest text-slate-500">MANAGEMENT SYSTEM</small>
      </span>
    </NuxtLink>
    <button type="button" aria-label="Close navigation" class="absolute right-3 top-20 rounded-lg p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline focus-visible:outline-teal-700 md:hidden" @click="emit('close')">
      <Close aria-hidden="true" class="h-5 w-5" />
    </button>

    <nav class="flex-1 space-y-7 overflow-y-auto overflow-x-hidden px-3.5 pb-6 pt-14 md:pt-6">
      <section v-for="group in groups" :key="group.label" :aria-label="group.label">
        <h2 class="mb-2.5 mx-3 h-4 whitespace-nowrap text-[10px] font-bold uppercase tracking-widest text-slate-500" :class="{ 'md:invisible': collapsed }">{{ group.label }}</h2>
        <ul class="space-y-1">
          <li v-for="item in group.items" :key="item.to">
            <NuxtLink v-if="item.enabled" :to="item.to" :aria-label="item.label" :aria-current="isActive(item.to) ? 'page' : undefined" :title="item.label"
              class="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-700"
              :class="isActive(item.to) ? 'bg-teal-50 font-semibold text-teal-700' : 'text-slate-600 hover:bg-slate-50'">
              <Icon :name="item.icon"/>
              <span class="whitespace-nowrap" :class="{ 'md:hidden': collapsed }">{{ item.label }}</span>
            </NuxtLink>
            <button v-else type="button" disabled :aria-label="`${item.label} — coming soon`" :title="`${item.label} — coming soon`" class="flex min-h-11 w-full cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-400">
              <component :is="item.icon" aria-hidden="true" class="h-5 w-5 shrink-0" />
              <span :class="{ 'md:hidden': collapsed }">{{ item.label }}</span>
              <span class="ml-auto rounded bg-slate-100 px-1.5 py-0.5 text-[9px] text-slate-500" :class="{ 'md:hidden': collapsed }">Soon</span>
            </button>
          </li>
        </ul>
      </section>
    </nav>
    <div class="mx-5 flex min-h-16 items-center gap-2 overflow-hidden whitespace-nowrap border-t border-slate-100 text-xs text-slate-500" :class="{ 'md:justify-center': collapsed }">
      <span aria-hidden="true" class="h-2 w-2 shrink-0 rounded-full bg-teal-700" />
      <span :class="{ 'md:hidden': collapsed }">Restaurant workspace</span>
    </div>
  </aside>
</template>
