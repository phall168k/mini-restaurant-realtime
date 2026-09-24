export interface CategorySeed {
  code: string;
  nameEn: string;
  nameKh: string;
  description?: string;
  status: boolean;
  createdByUserId: number; 
}
export const categories: CategorySeed[] = [
  {
    createdByUserId: 1,
    code: 'FOOD',
    nameEn: 'Food',
    nameKh: 'អាហារ',
    status: true,
  },
  {
    createdByUserId: 1,
    code: 'DRINK',
    nameEn: 'Drink',
    nameKh: 'ភេសជ្ជៈ',
    status: true,
  },
  {
    createdByUserId: 1,
    code: 'SNACK',
    nameEn: 'Snack',
    nameKh: 'អាហារសម្រន់',
    status: true,
  },
  {
    createdByUserId: 1,
    code: 'DAIRY',
    nameEn: 'Dairy',
    nameKh: 'ផលិតផលទឹកដោះគោ',
    status: true,
  },
  {
    createdByUserId: 1,
    code: 'BAKERY',
    nameEn: 'Bakery',
    nameKh: 'នំបុ័ង',
    status: true,
  },
  {
    createdByUserId: 1,
    code: 'FROZEN',
    nameEn: 'Frozen Food',
    nameKh: 'អាហារកក',
    status: true,
  },
  {
    createdByUserId: 1,
    code: 'HOUSEHOLD',
    nameEn: 'Household',
    nameKh: 'សម្ភារៈផ្ទះ',
    status: true,
  },
  {
    createdByUserId: 1,
    code: 'PERSONAL',
    nameEn: 'Personal Care',
    nameKh: 'ថែទាំផ្ទាល់ខ្លួន',
    status: true,
  },
  {
    createdByUserId: 1,
    code: 'CLEANING',
    nameEn: 'Cleaning',
    nameKh: 'សម្អាត',
    status: true,
  },
  {
    createdByUserId: 1,
    code: 'OTHER',
    nameEn: 'Other',
    nameKh: 'ផ្សេងៗ',
    status: true,
  },
];
