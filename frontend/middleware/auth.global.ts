export default defineNuxtRouteMiddleware((to) => {
  const token = useCookie('token')

  const isAuthenticated = !!token.value

  if (to.path.startsWith('/auth')) {
    if (isAuthenticated && to.path === '/auth/login') {
      return navigateTo('/')
    }
    return
  }

  if (!isAuthenticated) {
    return navigateTo('/auth/login')
  }
})