import {
  BadRequestException,
  HttpException,
  InternalServerErrorException,
  Logger,
  RequestTimeoutException,
} from '@nestjs/common';
import { TimeoutError } from 'rxjs';
import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { PaginationRequest } from './pagination/interfaces/pagination-request.interface';
import { PaginationResponseDto } from './pagination/pagination-response.dto';
import { Pagination } from './pagination/pagination.helper';
import { applyFilters, QueryFilters } from './pagination/filter.helper';

export abstract class BaseCrudService<T extends ObjectLiteral, U> {
  protected queryName = '';
  protected FILTER_FIELDS: string[] = [];
  protected SEARCH_FIELDS: string[] = [];
  private readonly logger = new Logger(BaseCrudService.name);

  protected abstract getFilters(): QueryFilters<T>;
  protected abstract getListQuery(): SelectQueryBuilder<T>;
  protected abstract getMapperResponseEntityFields(): (
    entity: T,
  ) => U | Promise<U>;

  protected getAllFilters(): QueryFilters<T> {
    const filters = { ...this.getFilters() };

    this.FILTER_FIELDS.forEach((field, index) => {
      if (Object.hasOwn(filters, field)) return;
      filters[field] = (query, value) => {
        const parameter = this.nextParameter(query, `crud_filter_${index}`);
        query.andWhere(`${this.fieldPath(query, field)} ILIKE :${parameter}`, {
          [parameter]: `%${value}%`,
        });
      };
    });

    if (this.SEARCH_FIELDS.length && !Object.hasOwn(filters, 'search')) {
      filters.search = (query, value) => {
        const parameter = this.nextParameter(query, 'crud_search');
        const conditions = this.SEARCH_FIELDS.map(
          (field) => `${this.fieldPath(query, field)} ILIKE :${parameter}`,
        ).join(' OR ');
        query.andWhere(`(${conditions})`, { [parameter]: `%${value}%` });
      };
    }
    return filters;
  }

  private fieldPath(query: SelectQueryBuilder<T>, field: string): string {
    return field.includes('.')
      ? field
      : `${this.queryName || query.alias}.${field}`;
  }

  private nextParameter(query: SelectQueryBuilder<T>, prefix: string): string {
    const parameters = query.getParameters();
    let name = prefix;
    let index = 0;
    while (Object.hasOwn(parameters, name)) name = `${prefix}_${++index}`;
    return name;
  }

  protected applyQueryFilters(
    query: SelectQueryBuilder<T>,
    params?: Record<string, unknown>,
  ): void {
    applyFilters(query, this.getAllFilters(), params);
  }

  public async findAll(
    pagination: PaginationRequest,
  ): Promise<PaginationResponseDto<U>> {
    try {
      const [entities, total] = await this.getListAndCount(pagination);
      const mapper = this.getMapperResponseEntityFields();
      const dtos = await Promise.all(entities.map((entity) => mapper(entity)));
      return Pagination.of(pagination, total, dtos);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (error instanceof TimeoutError) throw new RequestTimeoutException();
      this.logger.error(
        'Failed to retrieve paginated records',
        error instanceof Error ? error.stack : error,
      );
      throw new InternalServerErrorException();
    }
  }

  protected getListAndCount(
    pagination: PaginationRequest,
  ): Promise<[T[], number]> {
    const { skip, limit, order, params } = pagination;
    const query = this.getListQuery();
    this.applyQueryFilters(query, params);

    for (const [field, direction] of Object.entries(order ?? {})) {
      const path = this.fieldPath(query, field);
      const separator = path.indexOf('.');
      const alias = query.expressionMap.aliases.find(
        (item) => item.name === path.slice(0, separator),
      );
      const property = path.slice(separator + 1);
      if (
        !alias?.hasMetadata ||
        !alias.metadata.columns.some(
          (column) => column.propertyPath === property,
        ) ||
        (direction !== 'ASC' && direction !== 'DESC')
      ) {
        throw new BadRequestException('Invalid sort field or direction');
      }
      query.addOrderBy(path, direction);
    }
    return query.skip(skip).take(limit).getManyAndCount();
  }
}
