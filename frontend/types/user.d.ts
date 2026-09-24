import type { IRole } from "./role";

export interface IUser {
    id: number;
    username: string;
    status: boolean;
    isActive: boolean;
    isSuperUser?: boolean;
    profile?: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date;
    roles?: IRole[];
}
