import type { IRole } from "./role";

export interface IUser {
    id: number;
    username: string;
    status: boolean;
    isActive: boolean;
    isSuperUser?: boolean | null;
    profile?: string | null;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    roles?: IRole[];
}

export interface IUserListResponse {
  payload: {
    currentPage: number;
    skippedRecords: number;
    totalPages: number;
    hasNext: boolean;
    content: IUser[];
    payloadSize: number;
    totalRecords: number;
  };
  timestamp: number;
}

export interface IUserForm {
  username: string;
  password: string;
  confirmPassword: string;
  status: boolean;
  isActive: boolean;
  isSuperUser: boolean | null;
  profile: string;
  roles: number[];
}

export interface IUserRoleOption {
  id: number;
  name: string;
}
