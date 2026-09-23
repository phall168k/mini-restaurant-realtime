import { TableColumnOptions } from "typeorm";

export const commonFields: TableColumnOptions[] = [
    {
        name: 'created_at',
        type: 'timestamp with time zone',
        isNullable: false,
        default: 'now()',
    },
    {
        name: 'updated_at',
        type: 'timestamp with time zone',
        isNullable: false,
        default: 'now()',
    },
    {
        name: 'deleted_at',
        type: 'timestamp with time zone',
        isNullable: true,
        default: null,
    },
];