export interface IRole {
    id: number;
    name: string;
    description?: string;
    status: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date;
}