export interface UserSeed {
    username: string;
    password: string;
    status: boolean;
    isActive: boolean;
}

export const users: UserSeed[] = [
    {
        username: 'Admin',
        password: '123',
        status: false,
        isActive: true,
    },
    {
        username: 'Sok Dara',
        password: '123',
        status: false,
        isActive: true,
    },
    {
        username: 'Chan Sok Dara',
        password: '123',
        status: false,
        isActive: true,
    },
];
