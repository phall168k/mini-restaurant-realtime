import type { ISignIn, ISignInResponse } from '~/types/sign-in'
import type { IUser } from '~/types/user'

const cookieOptions = {
  maxAge: 60 * 60 * 24,
  sameSite: 'strict' as const,
  secure: process.env.NODE_ENV === 'production',
}

export const useAuthStore = defineStore('auth', () => {
    const { $socket } = useNuxtApp();
    const user = ref<IUser | null>(null);
    const accessToken = useCookie<string | null>('accessToken', cookieOptions);
    const users = useCookie<IUser | null>('users', cookieOptions);

    const isLoggedIn = computed(() => !!accessToken.value);

    const handleSignIn = async(payload: ISignIn) => {
        try {
            const response = await useApi<ISignInResponse>('auth/sign-in', {
                method: 'post',
                body: payload,
            }, false);
            accessToken.value = response.payload.token.accessToken;
            users.value = response.payload.users;
            user.value = response.payload.users;
            await navigateTo('/');
        } catch (error) {
            throw error;
        }
    }

    const logout = async () => {
        accessToken.value = null;
        users.value = null;
        user.value = null;
        if (import.meta.client) {
            $socket.disconnect();
            $socket.auth = {};
        }
        // Reload to discard all authenticated page/store state and replace history.
        await navigateTo('/auth/sign-in', { external: true, replace: true });
    }

    return {
        logout,
        user,
        accessToken,
        users,
        isLoggedIn,
        handleSignIn,
    }
 
})
