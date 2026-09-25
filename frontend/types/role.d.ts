export interface IRole {
  id: number;
  name: string;
  description?: string | null;
  status: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface IRoleForm {
  name: string;
  description: string;
  status: boolean;
}

export interface IRoleListResponse {
  payload: {
    currentPage: number;
    skippedRecords: number;
    totalPages: number;
    hasNext: boolean;
    content: IRole[];
    payloadSize: number;
    totalRecords: number;
  };
  timestamp: number;
}
