export interface RoleSeed {
    name: string;
    description: string;
    status: boolean;
}

export const roles: RoleSeed[] = [
    {
        name: 'Admin',
        description: 'Admin',
        status: true,
    },
    {
        name: 'Cashier',
        description: 'Cashier',
        status: true,
    },
    {
        name: 'Cooker',
        description: 'Cooker',
        status: true,
    },
    {
        name: 'Receiptionist',
        description: 'Receiptionist',
        status: true,
    },
];
