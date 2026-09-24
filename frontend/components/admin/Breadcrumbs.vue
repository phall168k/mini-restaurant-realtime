<script setup lang="ts">
import { ArrowRight, House } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()

const breadcrumbs = computed(() => {
  const segments = route.path.split('/').filter(Boolean)
  const items = [{ label: 'Dashboard', path: '/', linked: segments.length > 0 }]

  segments.forEach((segment, index) => {
    const path = `/${segments.slice(0, index + 1).join('/')}`
    const match = router.resolve(path)
    const isCurrent = index === segments.length - 1
    const title = isCurrent ? route.meta.title : match.meta.title
    items.push({
      label: typeof title === 'string' ? title : segment.replace(/[-_]/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase()),
      path,
      linked: !isCurrent && match.matched.length > 0,
    })
  })

  return items
})
</script>

<template>
  <nav aria-label="Breadcrumb" class="min-w-0">
    <ol class="flex flex-wrap items-center gap-2 text-xs text-slate-500">
      <li v-for="(item, index) in breadcrumbs" :key="item.path" class="flex min-w-0 items-center gap-2">
        <ArrowRight v-if="index" aria-hidden="true" class="h-3 w-3 shrink-0 text-slate-400" />
        <House v-else aria-hidden="true" class="h-4 w-4 shrink-0" />
        <NuxtLink v-if="item.linked" :to="item.path" class="rounded hover:text-teal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-700">
          {{ item.label }}
        </NuxtLink>
        <span v-else :aria-current="index === breadcrumbs.length - 1 ? 'page' : undefined" :class="{ 'font-medium text-slate-800': index === breadcrumbs.length - 1 }">
          {{ item.label }}
        </span>
      </li>
    </ol>
  </nav>
</template>
