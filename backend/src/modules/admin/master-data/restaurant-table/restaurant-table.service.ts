import { PaginationRequest } from '../../../../libs/services/pagination/interfaces/pagination-request.interface';
import { PaginationResponseDto } from '../../../../libs/services/pagination/pagination-response.dto';
import { RestaurantTableStatuseEnum } from '../../../../libs/enums/restaurant-table-status.enum';
import { CreateRestaurantTableRequestDto } from './dto/create-restaurant-table-request.dto';
import { UpdateRestaurantTableRequestDto } from './dto/update-restaurant-table-request.dto';
import { RestaurantTableSelectOptionResponseDto } from './dto/restaurant-table-select-option-response.dto';
import { handleError } from '../../../../libs/utils/handle-error.util';
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { BaseCrudService } from "../../../../libs/services/base-crud.service";
import { RestaurantTableEntity } from "./entities/restaurant-table.entity";
import { RestaurantTableResponseDto } from "./dto/restaurant-table-response.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { RestaurantTableMapper } from "./restaurant-table.mapper";
import { QueryFilters } from "../../../../libs/services/pagination/filter.helper";

export const RESTAURANT_TABLE_FILTER_FIELDS = [
  'code',
  'createdByUserId',
  'status',
  'active',
  'name',
];

@Injectable()
export class RestaurantTableService extends BaseCrudService<RestaurantTableEntity, RestaurantTableResponseDto> {
  protected queryName = 'restaurantTable';

  protected SEARCH_FIELDS = [
    'code',
    'name',
    'note',
    'createdByUser.username',
  ];
  protected FILTER_FIELDS = RESTAURANT_TABLE_FILTER_FIELDS;

  constructor(
    @InjectRepository(RestaurantTableEntity)
    private readonly restaurantTableRepository: Repository<RestaurantTableEntity>,
  ) {
    super();
  }

  protected getMapperResponseEntityFields() {
    return RestaurantTableMapper.toDto;
  }

  protected getFilters() {
    const filters: QueryFilters<RestaurantTableEntity> = {
      createdByUserId: (query, value) => {
        const id = typeof value === 'number' ? value : typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : NaN;
        if (!Number.isInteger(id) || id < 1 || id > 2147483647) {
          throw new BadRequestException('createdByUserId must be a positive integer');
        }
        return query.andWhere('restaurantTable.createdByUserId = :restaurantTable_creator', { restaurantTable_creator: id });
      },
      status: (query, value) => {
        if (!Object.values(RestaurantTableStatuseEnum).includes(value as RestaurantTableStatuseEnum)) {
          throw new BadRequestException('Invalid restaurant table status');
        }
        return query.andWhere('restaurantTable.status = :table_status', { table_status: value });
      },
      active: (query, value) => {
        if (![true, false, 'true', 'false'].includes(value as string | boolean)) {
          throw new BadRequestException('active must be true or false');
        }
        return query.andWhere('restaurantTable.active = :table_active', { table_active: value === true || value === 'true' });
      },
      createdAt: (query, value) => {
        const parts = String(value).split(',');
        const [start, end] = parts;
        if (parts.length !== 2 || !start || !end || !Number.isFinite(Date.parse(start)) || !Number.isFinite(Date.parse(end)) || Date.parse(start) > Date.parse(end)) {
          throw new BadRequestException('createdAt must contain a valid start,end date range');
        }
        return query.andWhere("restaurantTable.createdAt BETWEEN :restaurantTable_start AND :restaurantTable_end", {
          restaurantTable_start: start,
          restaurantTable_end: end,
        });
      },
    };

    return filters;
  }

  protected getListQuery() {
    return this.restaurantTableRepository.createQueryBuilder(this.queryName)
      .leftJoinAndSelect('restaurantTable.createdByUser', 'createdByUser');
  }

  public async findAll(pagination: PaginationRequest): Promise<PaginationResponseDto<RestaurantTableResponseDto>> {
    return super.findAll({
      ...pagination,
      order: Object.keys(pagination.order ?? {}).length ? pagination.order : { sortOrder: 'ASC', id: 'ASC' },
    });
  }

  public async create(dto: CreateRestaurantTableRequestDto): Promise<RestaurantTableResponseDto> {
    try {
      let entity = RestaurantTableMapper.toCreatedEntity(dto);
      entity = await this.restaurantTableRepository.save(entity);
      return await this.findOne(entity.id);
    } catch (error) {
      handleError(error);
    }
  }

  public async findForSelectOptions(): Promise<RestaurantTableSelectOptionResponseDto[]> {
    try {
      const entities = await this.restaurantTableRepository.find({ 
        where: {
          active: true,
        },
        order: { sortOrder: 'ASC', id: 'ASC' },
      });
      const items = await Promise.all(
        entities.map((item) => RestaurantTableMapper.toDtoSelectOption(item))
      );
      return items;
    } catch (error) {
      handleError(error);
    }
  }

  public async findOne(id: number): Promise<RestaurantTableResponseDto> {
    try {
      const entity = await this.restaurantTableRepository.findOne({ 
        where: { id },
        relations: {
          createdByUser: true,
        },
      });
      if (!entity) throw new NotFoundException('Restaurant table not found');
      return await RestaurantTableMapper.toDto(entity);
    } catch (error) {
      handleError(error);
    }
  }

  public async update(id: number, dto: UpdateRestaurantTableRequestDto): Promise<RestaurantTableResponseDto> {
    try {
      let entity = await this.restaurantTableRepository.findOneBy({ id });
      if (!entity) throw new NotFoundException('Restaurant table not found');
      entity = RestaurantTableMapper.toUpdateEntity(entity, dto);
      entity = await this.restaurantTableRepository.save(entity);
      return await this.findOne(entity.id);
    } catch (error) {
      handleError(error);
    }
  }

  public async remove(id: number): Promise<RestaurantTableResponseDto> {
    try {
      const entity = await this.restaurantTableRepository.findOne({ where: { id }, relations: { createdByUser: true } });
      if (!entity) throw new NotFoundException('Restaurant table not found');
      const removed = await this.restaurantTableRepository.softRemove(entity);
      return await RestaurantTableMapper.toDto(removed);
    } catch (error) {
      handleError(error);
    }
  }
}
