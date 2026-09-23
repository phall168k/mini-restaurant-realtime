import { BadRequestException } from '@nestjs/common';
import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

export type FilterValue = string | number | boolean;
export type QueryFilters<T extends ObjectLiteral> = Record<
  string,
  (query: SelectQueryBuilder<T>, value: FilterValue) => unknown
>;

export function applyFilters<T extends ObjectLiteral>(
  query: SelectQueryBuilder<T>,
  filters: QueryFilters<T>,
  params?: Record<string, unknown>,
): void {
  for (const [key, value] of Object.entries(params ?? {})) {
    if (!Object.hasOwn(filters, key) || typeof filters[key] !== 'function')
      continue;
    if (
      value == null ||
      value === '' ||
      (Array.isArray(value) && value.length === 0)
    )
      continue;
    if (!['string', 'number', 'boolean'].includes(typeof value)) {
      throw new BadRequestException(`Invalid value for filter: ${key}`);
    }
    filters[key](query, value as FilterValue);
  }
}
