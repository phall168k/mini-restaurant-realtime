import type { RoleEnum } from '~/constants/role.enum'
import { RealtimeEvent } from '~/constants/realtime-events'
import type { IDashboard } from '~/types/dashboard'

// Each mounted role gets its own state, request lifecycle, and socket callbacks.
export function useRoleDashboard(role: RoleEnum, roleEvents: readonly string[], initialData?: IDashboard | null) {
  const { t } = useI18n()
  const { $socket } = useNuxtApp()
  const dashboard = ref<IDashboard | null>(initialData?.role === role ? initialData : null)
  const loading = ref(false)
  const error = ref('')
  const events = [...new Set(['connect', RealtimeEvent.SOCKET_CONNECTED, ...roleEvents])]
  let active = true
  let pendingRefresh = false
  let timer: ReturnType<typeof setTimeout> | undefined

  async function refresh() {
    if (!active) return
    // An event during a request must trigger another fetch, rather than get lost.
    if (loading.value) { pendingRefresh = true; return }
    clearTimeout(timer)
    pendingRefresh = false
    loading.value = true
    error.value = ''
    try {
      const response = await useApi<{ payload: IDashboard }>('admin/dashboard', { params: { role } })
      if (active) dashboard.value = response.payload
    } catch {
      if (active) error.value = t('dashboard.load_error')
    } finally {
      if (active) {
        loading.value = false
        if (pendingRefresh) scheduleRefresh()
      }
    }
  }
  function scheduleRefresh() {
    if (!active) return
    if (loading.value) { pendingRefresh = true; return }
    clearTimeout(timer)
    timer = setTimeout(() => { void refresh() }, 400)
  }
  onMounted(() => {
    events.forEach(event => $socket.on(event, scheduleRefresh))
    if (!dashboard.value) void refresh()
  })
  onBeforeUnmount(() => {
    active = false
    clearTimeout(timer)
    events.forEach(event => $socket.off(event, scheduleRefresh))
  })
  return { dashboard, loading, error, refresh }
}
