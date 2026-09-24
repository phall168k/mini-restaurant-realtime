import { defu } from 'defu'

export const useApi = async <T>(
  url: string,
  options: {
    method?: 'get' | 'post' | 'put' | 'patch' | 'delete'
    params?: any
    body?: any
    headers?: Record<string, string>
  } = {},
  authOnly: boolean = true
): Promise<T> => {
  const accessToken = useCookie('token');
  const config = useRuntimeConfig()

  try {
    return await $fetch<T>(url, {
      baseURL: config.public.apiBaseUrl,
      ...options,
      headers: defu(options.headers, accessToken.value
        ? { Authorization: `Bearer ${accessToken.value}` }
        : {}
      ),
    })
  } catch (error: any) {
    if (authOnly && error?.status === 401) {
    //   await auth.logout()
    }
    if (authOnly && error?.status === 403) {
      navigateTo('/403');
    }
    throw error
  }
}
