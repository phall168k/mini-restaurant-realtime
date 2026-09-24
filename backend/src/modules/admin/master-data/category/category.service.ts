import { CreateCategoryRequestDto } from './dto/create-category-request.dto';
import { UpdateCategoryRequestDto } from './dto/update-category-request.dto';
import { CategorySelectOptionResponseDto } from './dto/category-select-option-response.dto';
import { handleError } from '../../../../libs/utils/handle-error.util';
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { BaseCrudService } from "../../../../libs/services/base-crud.service";
import { CategoryEntity } from "./entities/category.entity";
import { CategoryResponseDto } from "./dto/category-response.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CategoryMapper } from "./category.mapper";
import { QueryFilters } from "../../../../libs/services/pagination/filter.helper";

export const CATEGORY_FILTER_FIELDS = [
  'code',
  'createdByUserId',
  'status',
];

@Injectable()
export class CategoryService extends BaseCrudService<CategoryEntity, CategoryResponseDto> {
  protected queryName = 'category';

  protected SEARCH_FIELDS = [
    'code',
    'nameEn',
    'nameKh',
    'description',
    'createdByUser.username',
  ];
  protected FILTER_FIELDS = CATEGORY_FILTER_FIELDS;

  constructor(
    @InjectRepository(CategoryEntity)
    private readonly categoryRepository: Repository<CategoryEntity>,
  ) {
    super();
  }

  protected getMapperResponseEntityFields() {
    return CategoryMapper.toDto;
  }

  protected getFilters() {
    const filters: QueryFilters<CategoryEntity> = {
      createdByUserId: (query, value) => {
        const id = typeof value === 'number' ? value : typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : NaN;
        if (!Number.isInteger(id) || id < 1 || id > 2147483647) {
          throw new BadRequestException('createdByUserId must be a positive integer');
        }
        return query.andWhere('category.createdByUserId = :category_creator', { category_creator: id });
      },
      status: (query, value) => {
        if (![true, false, 'true', 'false'].includes(value as string | boolean)) {
          throw new BadRequestException('status must be true or false');
        }
        return query.andWhere('category.status = :category_status', {
          category_status: value === true || value === 'true',
        });
      },
      createdAt: (query, value) => {
        const parts = String(value).split(',');
        const [start, end] = parts;
        if (parts.length !== 2 || !start || !end || !Number.isFinite(Date.parse(start)) || !Number.isFinite(Date.parse(end)) || Date.parse(start) > Date.parse(end)) {
          throw new BadRequestException('createdAt must contain a valid start,end date range');
        }
        return query.andWhere("category.createdAt BETWEEN :category_start AND :category_end", {
          category_start: start,
          category_end: end,
        });
      },
    };

    return filters;
  }

  protected getListQuery() {
    return this.categoryRepository.createQueryBuilder(this.queryName)
      .leftJoinAndSelect('category.createdByUser', 'createdByUser');
  }

  public async create(dto: CreateCategoryRequestDto): Promise<CategoryResponseDto> {
    try {
      let entity = CategoryMapper.toCreatedEntity(dto);
      entity = await this.categoryRepository.save(entity);
      return await this.findOne(entity.id);
    } catch (error) {
      handleError(error);
    }
  }

  public async findForSelectOptions(): Promise<CategorySelectOptionResponseDto[]> {
    try {
      const entities = await this.categoryRepository.find({ 
        where: {
          status: true,
        },
        order: { nameEn: 'ASC' },
      });
      const items = await Promise.all(
        entities.map((item) => CategoryMapper.toDtoSelectOption(item))
      );
      return items;
    } catch (error) {
      handleError(error);
    }
  }

  public async findOne(id: number): Promise<CategoryResponseDto> {
    try {
      const entity = await this.categoryRepository.findOne({ 
        where: { id },
        relations: {
          createdByUser: true,
        },
      });
      if (!entity) throw new NotFoundException('Category not found');
      return await CategoryMapper.toDto(entity);
    } catch (error) {
      handleError(error);
    }
  }

  public async update(id: number, dto: UpdateCategoryRequestDto): Promise<CategoryResponseDto> {
    try {
      let entity = await this.categoryRepository.findOneBy({ id });
      if (!entity) throw new NotFoundException('Category not found');
      entity = CategoryMapper.toUpdateEntity(entity, dto);
      entity = await this.categoryRepository.save(entity);
      return await this.findOne(entity.id);
    } catch (error) {
      handleError(error);
    }
  }

  public async remove(id: number): Promise<CategoryResponseDto> {
    try {
      const entity = await this.categoryRepository.findOneBy({ id });
      if (!entity) throw new NotFoundException('Category not found');
      const removed = await this.categoryRepository.softRemove(entity);
      return await CategoryMapper.toDto(removed);
    } catch (error) {
      handleError(error);
    }
  }
}
