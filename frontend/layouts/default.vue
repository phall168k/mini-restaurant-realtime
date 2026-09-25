<script setup lang="ts">
import { Menu } from '@element-plus/icons-vue'
import AdminSidebar from '~/components/admin/Sidebar.vue'
import AdminBreadcrumbs from '~/components/admin/Breadcrumbs.vue'
import type { ILanguage } from '~/types/language'

const { t, locale, setLocale } = useI18n()
const changingLanguage = ref(false)
const route = useRoute()
const auth = useAuthStore()
const collapsed = ref(false)
const mobileOpen = ref(false)

const displayName = computed(() => auth.user?.username || auth.users?.username || 'Administrator')
const displayRoles = computed(() => {
  const user = auth.users || auth.user
  if (user?.isSuperUser === true) return t('user.super_user')
  const roles = Array.isArray(user?.roles) ? user.roles : []
  const names = [...new Set(roles.map(role => role.name).filter(Boolean))]
  return names.length ? names.join(', ') : t('user.no_roles')
})
const initials = computed(() => displayName.value.slice(0, 2).toUpperCase())
const pageTitle = computed(() => {
  if (typeof route.meta.titleKey === 'string') return t(route.meta.titleKey)
  if (typeof route.meta.title === 'string') return route.meta.title
  const segment = route.path.split('/').filter(Boolean).at(-1)
  return segment ? segment.replace(/[-_]/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase()) : 'Dashboard'
})

function closeNavigation() {
  mobileOpen.value = false
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') closeNavigation()
}

const languages = ref<ILanguage[]>([
  {
    key: 'en',
    name: 'English',
    flag: 'circle-flags:us',
  },
  {
    key: 'km',
    name: 'ភាសាខ្មែរ',
    flag: 'circle-flags:kh',
  },
])

const currentLanguage = computed(() => languages.value.find(language => language.key === locale.value) || languages.value[0]!)

async function changeLanguage(language: string) {
  if (changingLanguage.value || language === locale.value || (language !== 'en' && language !== 'km')) return
  changingLanguage.value = true
  try {
    await setLocale(language)
  } catch {
    useMessage(t('language.change_error'), 'error')
  } finally {
    changingLanguage.value = false
  }
}

watch(() => route.fullPath, closeNavigation)
onMounted(() => window.addEventListener('keydown', handleKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-800">
    <a href="#main-content" class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-2 focus:z-[60] focus:rounded focus:bg-white focus:p-3 focus:text-teal-700">Skip to content</a>
    <button v-if="mobileOpen" type="button" aria-label="Close navigation overlay" class="fixed inset-0 z-40 bg-slate-900/40 md:hidden" @click="closeNavigation" />
    <AdminSidebar :collapsed="collapsed" :mobile-open="mobileOpen" @close="closeNavigation" />

    <header class="fixed left-0 right-0 top-0 z-30 flex h-[72px] items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 transition-[left] duration-200 motion-reduce:transition-none md:px-8"
      :class="collapsed ? 'md:left-20' : 'md:left-[248px]'">
      <div class="flex min-w-0 items-center gap-3 md:gap-5">
        <button type="button" :aria-label="collapsed ? 'Expand sidebar' : 'Collapse sidebar'" :aria-expanded="!collapsed" aria-controls="admin-sidebar"
          class="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-700 md:inline-flex" @click="collapsed = !collapsed">
          <Icon :name="collapsed ? 'bi:arrows-collapse-vertical' : 'iconoir:sidebar-collapse'" />
        </button>
        <button type="button" aria-label="Open navigation" :aria-expanded="mobileOpen" aria-controls="admin-sidebar"
          class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-700 md:hidden" @click="mobileOpen = !mobileOpen">
          <Menu aria-hidden="true" class="h-5 w-5" />
        </button>
        <AdminBreadcrumbs />
      </div>
      <div class="flex shrink-0 items-center gap-3">
        <el-dropdown
          trigger="click"
          :disabled="changingLanguage"
          @command="changeLanguage"
        >
          <button
            type="button"
            class="h-[30px] w-[30px] rounded-full border flex items-center justify-center cursor-pointer"
            :disabled="changingLanguage"
            :aria-label="t('language.select', { name: currentLanguage.name })"
            :title="t('language.select', { name: currentLanguage.name })"
          >
            <Icon :size="30" :name="currentLanguage.flag"/>
          </button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item
                v-for="language in languages"
                :key="language.key"
                :command="language.key"
                :disabled="language.key === locale || changingLanguage"
              >
                <div class="flex items-center gap-2" :lang="language.key">
                  <Icon :size="20" :name="language.flag"/>
                  <span>{{ language.name }}</span>
                </div>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <div
          class="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors bg-slate-100 hover:text-slate-700 cursor-pointer"
          role="img"
          :aria-label="t('notification.unread')"
          :title="t('notification.unread')"
        >
          <Icon :size="24" name="hugeicons:notification-01" aria-hidden="true"/>
          <span
            class="absolute -right-1 -top-1 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-red-500 px-1 pt-1 text-[9px] font-semibold leading-none text-white ring-2 ring-white"
            aria-hidden="true"
          >
            9
          </span>
        </div>
        <div class="hidden text-right sm:block">
          <strong class="block max-w-40 truncate text-xs font-semibold">{{ displayName }}</strong>
          <small class="mt-1 block text-[10px] text-slate-500">{{ displayRoles }}</small>
        </div>
        <span class="flex h-9 w-9 items-center justify-center rounded-full bg-teal-50 text-xs font-bold text-teal-700" :aria-label="displayName">{{ initials }}</span>
      </div>
    </header>

    <main id="main-content" tabindex="-1" class="flex min-h-screen flex-col px-5 pb-5 pt-24 transition-[margin-left] duration-200 motion-reduce:transition-none md:px-8 md:pt-[104px]"
      :class="collapsed ? 'md:ml-20' : 'md:ml-[248px]'">
      <div v-if="!route.meta.hidePageHeader" class="mb-6">
        <p class="mb-2 text-[10px] tracking-widest text-slate-500">YOUR WORKSPACE</p>
        <h1 class="text-2xl font-semibold tracking-tight">{{ pageTitle }}</h1>
      </div>
      <div class="min-w-0 flex-1"><slot /></div>
      <footer class="flex justify-between gap-4 pt-9 text-[10px] text-slate-500"><span>Mini Restaurant</span><span>Management System</span></footer>
    </main>
  </div>
</template>

<style scoped>
/* Keep the style entry valid for existing Vite HMR clients. Styling uses Tailwind. */
</style>
