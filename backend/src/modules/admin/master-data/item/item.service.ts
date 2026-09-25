import { CategoryEntity } from '../category/entities/category.entity';
import { CreateItemRequestDto } from './dto/create-item-request.dto';
import { UpdateItemRequestDto } from './dto/update-item-request.dto';
import { ItemSelectOptionResponseDto } from './dto/item-select-option-response.dto';
import { handleError } from '../../../../libs/utils/handle-error.util';
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { BaseCrudService } from "../../../../libs/services/base-crud.service";
import { ItemEntity } from "./entities/item.entity";
import { ItemResponseDto } from "./dto/item-response.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ItemMapper } from "./item.mapper";
import { QueryFilters } from "../../../../libs/services/pagination/filter.helper";

export const ITEM_FILTER_FIELDS = [
  'code',
  'categoryId',
  'status',
];

@Injectable()
export class ItemService extends BaseCrudService<ItemEntity, ItemResponseDto> {
  protected queryName = 'item';

  protected SEARCH_FIELDS = [
    'code',
    'nameEn',
    'nameKh',
    'description',
    'category.nameEn',
    'category.nameKh',
  ];
  protected FILTER_FIELDS = ITEM_FILTER_FIELDS;

  constructor(
    @InjectRepository(ItemEntity)
    private readonly itemRepository: Repository<ItemEntity>,
    @InjectRepository(CategoryEntity)
    private readonly categoryRepository: Repository<CategoryEntity>,
  ) {
    super();
  }

  protected getMapperResponseEntityFields() {
    return ItemMapper.toDto;
  }

  protected getFilters() {
    const filters: QueryFilters<ItemEntity> = {
      categoryId: (query, value) => {
        const id = typeof value === 'number' ? value : typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : NaN;
        if (!Number.isInteger(id) || id < 1 || id > 2147483647) {
          throw new BadRequestException('categoryId must be a positive integer');
        }
        return query.andWhere('item.categoryId = :item_category', { item_category: id });
      },
      status: (query, value) => {
        if (![true, false, 'true', 'false'].includes(value as string | boolean)) {
          throw new BadRequestException('status must be true or false');
        }
        return query.andWhere('item.status = :item_status', {
          item_status: value === true || value === 'true',
        });
      },
      createdAt: (query, value) => {
        const parts = String(value).split(',');
        const [start, end] = parts;
        if (parts.length !== 2 || !start || !end || !Number.isFinite(Date.parse(start)) || !Number.isFinite(Date.parse(end)) || Date.parse(start) > Date.parse(end)) {
          throw new BadRequestException('createdAt must contain a valid start,end date range');
        }
        return query.andWhere("item.createdAt BETWEEN :item_start AND :item_end", {
          item_start: start,
          item_end: end,
        });
      },
    };

    return filters;
  }

  protected getListQuery() {
    return this.itemRepository.createQueryBuilder(this.queryName)
      .leftJoinAndSelect('item.category', 'category')
      .leftJoinAndSelect('item.createdByUser', 'createdByUser');
  }

  public async create(dto: CreateItemRequestDto): Promise<ItemResponseDto> {
    try {
      await this.requireCategory(dto.categoryId);
      let entity = ItemMapper.toCreatedEntity(dto);
      entity = await this.itemRepository.save(entity);
      return await this.findOne(entity.id);
    } catch (error) {
      handleError(error);
    }
  }

  public async findForSelectOptions(categoryId?: number): Promise<ItemSelectOptionResponseDto[]> {
    try {
      if (categoryId !== undefined && (!Number.isInteger(categoryId) || categoryId < 1 || categoryId > 2147483647)) {
        throw new BadRequestException('categoryId must be a positive integer');
      }
      const entities = await this.itemRepository.find({ 
        where: {
          status: true,
          ...(categoryId !== undefined ? { categoryId } : {}),
        },
        order: { nameEn: 'ASC' },
      });
      const items = await Promise.all(
        entities.map((item) => ItemMapper.toDtoSelectOption(item))
      );
      return items;
    } catch (error) {
      handleError(error);
    }
  }

  public async findOne(id: number): Promise<ItemResponseDto> {
    try {
      const entity = await this.itemRepository.findOne({ 
        where: { id },
        relations: {
          category: true,
          createdByUser: true,
        },
      });
      if (!entity) throw new NotFoundException('Item not found');
      return await ItemMapper.toDto(entity);
    } catch (error) {
      handleError(error);
    }
  }

  public async update(id: number, dto: UpdateItemRequestDto): Promise<ItemResponseDto> {
    try {
      let entity = await this.itemRepository.findOneBy({ id });
      if (!entity) throw new NotFoundException('Item not found');
      if (dto.categoryId !== undefined) await this.requireCategory(dto.categoryId);
      entity = ItemMapper.toUpdateEntity(entity, dto);
      entity = await this.itemRepository.save(entity);
      return await this.findOne(entity.id);
    } catch (error) {
      handleError(error);
    }
  }

  private async requireCategory(id: number): Promise<void> {
    const category = await this.categoryRepository.findOneBy({ id });
    if (!category) throw new NotFoundException('Category not found');
  }

  public async remove(id: number): Promise<ItemResponseDto> {
    try {
      const entity = await this.itemRepository.findOne({ where: { id }, relations: { category: true, createdByUser: true } });
      if (!entity) throw new NotFoundException('Item not found');
      const removed = await this.itemRepository.softRemove(entity);
      return await ItemMapper.toDto(removed);
    } catch (error) {
      handleError(error);
    }
  }
}
