import { RestaurantTableStatuseEnum } from '../../libs/enums/restaurant-table-status.enum';

export interface RestaurantTableSeed {
  code: string;
  name: string;
  capacity: number;
  status: RestaurantTableStatuseEnum;
  note?: string;
  sort_order: number;
  active: boolean;
  createdByUserId: number;
}

export const restaurantTables: RestaurantTableSeed[] = [
  {
    createdByUserId: 1,
    code: 'T01',
    name: 'Table 1',
    capacity: 2,
    status: RestaurantTableStatuseEnum.AVAILABLE,
    note: '',
    sort_order: 1,
    active: true,
  },
  {
    createdByUserId: 1,
    code: 'T02',
    name: 'Table 2',
    capacity: 2,
    status: RestaurantTableStatuseEnum.AVAILABLE,
    note: '',
    sort_order: 2,
    active: true,
  },
  {
    createdByUserId: 1,
    code: 'T03',
    name: 'Table 3',
    capacity: 4,
    status: RestaurantTableStatuseEnum.AVAILABLE,
    note: '',
    sort_order: 3,
    active: true,
  },
  {
    createdByUserId: 1,
    code: 'T04',
    name: 'Table 4',
    capacity: 4,
    status: RestaurantTableStatuseEnum.AVAILABLE,
    note: '',
    sort_order: 4,
    active: true,
  },
  {
    createdByUserId: 1,
    code: 'T05',
    name: 'Table 5',
    capacity: 4,
    status: RestaurantTableStatuseEnum.AVAILABLE,
    note: '',
    sort_order: 5,
    active: true,
  },
  {
    createdByUserId: 1,
    code: 'T06',
    name: 'Table 6',
    capacity: 4,
    status: RestaurantTableStatuseEnum.AVAILABLE,
    note: '',
    sort_order: 6,
    active: true,
  },
  {
    createdByUserId: 1,
    code: 'T07',
    name: 'Table 7',
    capacity: 6,
    status: RestaurantTableStatuseEnum.AVAILABLE,
    note: '',
    sort_order: 7,
    active: true,
  },
  {
    createdByUserId: 1,
    code: 'T08',
    name: 'Table 8',
    capacity: 6,
    status: RestaurantTableStatuseEnum.AVAILABLE,
    note: '',
    sort_order: 8,
    active: true,
  },
  {
    createdByUserId: 1,
    code: 'T09',
    name: 'Table 9',
    capacity: 8,
    status: RestaurantTableStatuseEnum.AVAILABLE,
    note: '',
    sort_order: 9,
    active: true,
  },
  {
    createdByUserId: 1,
    code: 'T10',
    name: 'Table 10',
    capacity: 10,
    status: RestaurantTableStatuseEnum.AVAILABLE,
    note: '',
    sort_order: 10,
    active: true,
  },
];
