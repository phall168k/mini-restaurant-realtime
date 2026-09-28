import { io, type Socket } from 'socket.io-client';

export default defineNuxtPlugin(() => {
    const config = useRuntimeConfig();

    const accessToken = useCookie<string | null>('accessToken');

    const socket: Socket = io(
        config.public.websocketUrl,
        {
            autoConnect: true,
            transports: ['websocket'],
            auth: {
                token: accessToken.value,
            },
        },
    );

    return {
        provide: {
            socket,
        },
    };
});