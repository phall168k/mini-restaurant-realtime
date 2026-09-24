export const useMessage = (message: string, type: 'error' | 'success' | 'primary' | 'warning' | 'info' = 'success') => {
  return ElMessage({
    message: message,
    type: type,
    grouping: true,
    customClass: 'font-Nokora z-[2000] !z-[11111111111111111111111111111111111]'
  });
}
