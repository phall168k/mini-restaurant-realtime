import type { IUser } from './user';
import type { RestaurantTableStatuseEnum } from '~/constants/restaurant-table-status.enum';

export interface IRestaurantTable {
  id: number;
  code: string;
  name: string;
  capacity: number;
  status: RestaurantTableStatuseEnum;
  sort_order: number;
  note: string | null;
  active: boolean;
  createdByUserId: number;
  createdByUser: IUser | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface IRestaurantTableForm {
  code: string;
  name: string;
  capacity: number | undefined;
  status: RestaurantTableStatuseEnum;
  note: string;
  sortOrder: number | undefined;
  active: boolean;
}

export interface IRestaurantTableListResponse {
  payload: {
    currentPage: number;
    skippedRecords: number;
    totalPages: number;
    hasNext: boolean;
    content: IRestaurantTable[];
    payloadSize: number;
    totalRecords: number;
  };
  timestamp: number;
}
