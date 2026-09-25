import type { IAttachment } from './attachment';
import type { IUser } from './user';

export interface IItemCategoryOption {
  id: number;
  code: string;
  nameEn: string;
  nameKh: string;
}

export interface IItem {
  id: number;
  categoryId: number;
  code: string;
  nameEn: string;
  nameKh: string;
  category: IItemCategoryOption | null;
  description: string | null;
  unitPrice: string;
  discount: string;
  thumbnail: IAttachment | null;
  status: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  createdByUserId: number;
  createdByUser: IUser | null;
}

export interface IItemForm {
  categoryId: number | null;
  code: string;
  nameEn: string;
  nameKh: string;
  description: string;
  unitPrice: string;
  discount: string;
  thumbnail: IAttachment | null;
  status: boolean;
}

export interface IItemListResponse {
  payload: {
    currentPage: number;
    skippedRecords: number;
    totalPages: number;
    hasNext: boolean;
    content: IItem[];
    payloadSize: number;
    totalRecords: number;
  };
  timestamp: number;
}
