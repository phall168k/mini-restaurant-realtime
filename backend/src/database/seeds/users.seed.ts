export interface UserSeed {
    username: string;
    password: string;
    status: boolean;
    isActive: boolean;
    profile?: string | null;
    // Role names are resolved to existing RoleEntity records by MainSeeder.
    roles: string[];
}

export const users: UserSeed[] = [
    {
        username: 'Admin',
        password: '123',
        status: false,
        isActive: true,
        roles: [
            'Admin'
        ]
    },
    {
        username: 'Sok Dara',
        password: '123',
        status: false,
        isActive: true,
        roles: [
            'Cashier',
        ]
    },
    {
        username: 'Chan Sok Dara',
        password: '123',
        status: false,
        isActive: true,
        roles: [
            'Cooker'
        ]
    },
];
