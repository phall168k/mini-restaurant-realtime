export default defineNuxtRouteMiddleware((to) => {
  const token = useCookie('accessToken')

  const isAuthenticated = !!token.value

  if (to.path.startsWith('/auth')) {
    if (isAuthenticated && to.path === '/auth/sign-in') {
      return navigateTo('/')
    }
    return
  }

  if (!isAuthenticated) {
    return navigateTo('/auth/sign-in')
  }
})