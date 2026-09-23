import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateRoleRequestDto } from './dto/create-role-request.dto';
import { UpdateRoleRequestDto } from './dto/update-role-request.dto';
import { RoleResponseDto } from './dto/role-response.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { RoleEntity } from './entities/role.entity';
import { RoleMapper } from './role.mapper';
import { handleError } from '../../../../libs/utils/handle-error.util';
import { RoleSelectOptionResponseDto } from './dto/role-select-option-response.dto';
import { BaseCrudService } from '../../../../libs/services/base-crud.service';
import { Repository } from 'typeorm';
import { QueryFilters } from '../../../../libs/services/pagination/filter.helper';

export const ROLE_FILTER_FIELDS = [
  'name',
  'status',
];

@Injectable()
export class RoleService extends BaseCrudService<RoleEntity, RoleResponseDto> {
  protected queryName = 'role';

  protected SEARCH_FIELDS = [
    'name',
    'description',
  ];
  protected FILTER_FIELDS = ROLE_FILTER_FIELDS;

  constructor(
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
  ) {
    super();
  }

  protected getMapperResponseEntityFields() {
    return RoleMapper.toDto;
  }

  protected getFilters() {
    const filters: QueryFilters<RoleEntity> = {
      status: (query, value) => {
        if (![true, false, 'true', 'false'].includes(value as string | boolean)) {
          throw new BadRequestException('status must be true or false');
        }
        return query.andWhere('role.status = :role_status', {
          role_status: value === true || value === 'true',
        });
      },
      createdAt: (query, value) => {
        const parts = String(value).split(',');
        const [start, end] = parts;
        if (parts.length !== 2 || !start || !end || !Number.isFinite(Date.parse(start)) || !Number.isFinite(Date.parse(end)) || Date.parse(start) > Date.parse(end)) {
          throw new BadRequestException('createdAt must contain a valid start,end date range');
        }
        return query.andWhere("role.createdAt BETWEEN :role_start AND :role_end", {
          role_start: start,
          role_end: end,
        });
      },
    };

    return filters;
  }

  protected getListQuery() {
    return this.roleRepository.createQueryBuilder(this.queryName);
  }

  public async create(dto: CreateRoleRequestDto): Promise<RoleResponseDto> {
    try {
      let entity = RoleMapper.toCreateEntity(dto);
      entity = await this.roleRepository.save(entity);
      return RoleMapper.toDto(entity);
    } catch (error) {
      handleError(error);
    }
  }

  public async findForSelectOptions(): Promise<RoleSelectOptionResponseDto[]> {
    try {
      const entities = await this.roleRepository.find();
      const items = Promise.all(
        entities.map((item) => RoleMapper.toSelectOptionDto(item))
      );
      return items;
    } catch (error) {
      handleError(error);
    }
  }

  public async findOne(id: number): Promise<RoleResponseDto> {
    try {
      const entity = await this.roleRepository.findOneBy({ id });
      if (!entity) throw new NotFoundException('Role not found');
      return RoleMapper.toDto(entity);
    } catch (error) {
      handleError(error);
    }
  }

  public async update(id: number, dto: UpdateRoleRequestDto): Promise<RoleResponseDto> {
    try {
      let entity = await this.roleRepository.findOneBy({ id });
      if (!entity) throw new NotFoundException('Role not found');
      entity = RoleMapper.toUpdateEntity(entity, dto);
      entity = await this.roleRepository.save(entity);
      return RoleMapper.toDto(entity);
    } catch (error) {
      handleError(error);
    }
  }

  public async remove(id: number): Promise<RoleResponseDto> {
    try {
      const entity = await this.roleRepository.findOneBy({ id });
      if (!entity) throw new NotFoundException('Role not found');
      await this.roleRepository.softDelete(id);
      return RoleMapper.toDto(entity);
    } catch (error) {
      handleError(error);
    }
  }
}
