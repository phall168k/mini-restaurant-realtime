// All role dashboards display timestamps in the backend's Cambodia business timezone.
export function useDashboardDate() {
  const { locale } = useI18n()
  return (value: string) => new Date(value).toLocaleString(locale.value === 'km' ? 'km-KH' : 'en-US', {
    timeZone: 'Asia/Phnom_Penh', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}
