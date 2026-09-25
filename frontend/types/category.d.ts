import type { IUser } from './user';

export interface ICategory {
  id: number;
  code: string;
  nameEn: string;
  nameKh: string;
  description: string | null;
  status: boolean;
  createdByUserId: number;
  createdByUser: IUser | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ICategoryForm {
  code: string;
  nameEn: string;
  nameKh: string;
  description: string;
  status: boolean;
}

export interface ICategoryListResponse {
  payload: {
    currentPage: number;
    skippedRecords: number;
    totalPages: number;
    hasNext: boolean;
    content: ICategory[];
    payloadSize: number;
    totalRecords: number;
  };
  timestamp: number;
}
