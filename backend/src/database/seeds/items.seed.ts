import type { ItemEntity } from '../../modules/admin/master-data/item/entities/item.entity';

export interface ItemSeed {
  categoryId: number;
  code: string;
  nameEn: string;
  nameKh: string;
  description?: string;
  unitPrice: string;
  discount: string;
  thumbnail?: ItemEntity['thumbnail'];
  status: boolean;
  createdByUserId: number; 
}
export const items: ItemSeed[] = [
  {
    createdByUserId: 1,
    categoryId: 1,
    code: 'FRIED_RICE',
    nameEn: 'Fried Rice',
    nameKh: 'បាយឆា',
    description: 'Fried rice with vegetables and meat',
    unitPrice: '3.5',
    discount:'0',
    status: true,
  },
  {
    createdByUserId: 1,
    categoryId: 1,
    code: 'CHICKEN_RICE',
    nameEn: 'Chicken Rice',
    nameKh: 'បាយសាច់មាន់',
    description: 'Rice served with chicken',
    unitPrice: '4.0',
    discount: '0',
    status: true,
  },
  {
    createdByUserId: 1,
    categoryId: 1,
    code: 'BEEF_LOK_LAK',
    nameEn: 'Beef Lok Lak',
    nameKh: 'ឡុកឡាក់សាច់គោ',
    description: 'Khmer-style stir-fried beef',
    unitPrice: '5.5',
    discount: '0.5',
    status: true,
  },
  {
    createdByUserId: 1,
    categoryId: 1,
    code: 'FRIED_NOODLES',
    nameEn: 'Fried Noodles',
    nameKh: 'មីឆា',
    description: 'Stir-fried noodles with vegetables and meat',
    unitPrice: '3.5',
    discount: '0',
    status: true,
  },
  {
    createdByUserId: 1,
    categoryId: 1,
    code: 'CHICKEN_SOUP',
    nameEn: 'Chicken Soup',
    nameKh: 'ស៊ុបមាន់',
    description: 'Chicken soup with vegetables',
    unitPrice: '4.5',
    discount: '0',
    status: true,
  },
  {
    createdByUserId: 1,
    categoryId: 1,
    code: 'GRILLED_CHICKEN',
    nameEn: 'Grilled Chicken',
    nameKh: 'មាន់អាំង',
    description: 'Grilled marinated chicken',
    unitPrice: '6.0',
    discount: '0.5',
    status: true,
  },
  {
    createdByUserId: 1,
    categoryId: 1,
    code: 'GRILLED_PORK',
    nameEn: 'Grilled Pork',
    nameKh: 'សាច់ជ្រូកអាំង',
    description: 'Grilled marinated pork',
    unitPrice: '5.0',
    discount: '0',
    status: true,
  },
  {
    createdByUserId: 1,
    categoryId: 1,
    code: 'FISH_SOUP',
    nameEn: 'Fish Soup',
    nameKh: 'សម្លត្រី',
    description: 'Traditional fish soup',
    unitPrice: '5.5',
    discount: '0',
    status: true,
  },
  {
    createdByUserId: 1,
    categoryId: 1,
    code: 'CHICKEN_CURRY',
    nameEn: 'Chicken Curry',
    nameKh: 'ការីមាន់',
    description: 'Khmer-style chicken curry',
    unitPrice: '5.0',
    discount: '0.5',
    status: true,
  },
  {
    createdByUserId: 1,
    categoryId: 1,
    code: 'PORK_RICE',
    nameEn: 'Pork Rice',
    nameKh: 'បាយសាច់ជ្រូក',
    description: 'Rice served with grilled pork',
    unitPrice: '3.5',
    discount: '0',
    status: true,
  },
];
