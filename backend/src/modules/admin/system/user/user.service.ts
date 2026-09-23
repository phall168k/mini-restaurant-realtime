import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { BaseCrudService } from '../../../../libs/services/base-crud.service';
import { QueryFilters } from '../../../../libs/services/pagination/filter.helper';
import { handleError } from '../../../../libs/utils/handle-error.util';
import { CreateUserRequestDto } from './dto/create-user-request.dto';
import { UpdateUserRequestDto } from './dto/update-user-request.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UserSelectOptionResponseDto } from './dto/user-select-option-response.dto';
import { UserEntity } from './entities/user.entity';
import { UserMapper } from './user.mapper';
import { RoleEntity } from '../role/entities/role.entity';
import { PasswordHash } from '../../../../libs/utils/password-hash.util';

export const USER_FILTER_FIELDS = ['username', 'status', 'isActive'];

@Injectable()
export class UserService extends BaseCrudService<UserEntity, UserResponseDto> {
  protected queryName = 'user';
  protected SEARCH_FIELDS = ['username'];
  protected FILTER_FIELDS = USER_FILTER_FIELDS;

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {
    super();
  }

  protected getMapperResponseEntityFields() {
    return UserMapper.toDto;
  }

  protected getListQuery() {
    return this.userRepository
      .createQueryBuilder(this.queryName)
      .leftJoinAndSelect('user.roles', 'role');
  }

  protected getFilters(): QueryFilters<UserEntity> {
    const filters: QueryFilters<UserEntity> = {};
    for (const field of ['status', 'isActive']) {
      filters[field] = (query, value) => {
        if (
          value !== true &&
          value !== false &&
          value !== 'true' &&
          value !== 'false'
        ) {
          throw new BadRequestException(`${field} must be true or false`);
        }
        query.andWhere(`user.${field} = :user_${field}`, {
          [`user_${field}`]: value === true || value === 'true',
        });
      };
    }
    filters.createdAt = (query, value) => {
      const parts = String(value).split(',');
      const [start, end] = parts;
      if (
        parts.length !== 2 ||
        !start ||
        !end ||
        !Number.isFinite(Date.parse(start)) ||
        !Number.isFinite(Date.parse(end)) ||
        Date.parse(start) > Date.parse(end)
      ) {
        throw new BadRequestException(
          'createdAt must contain a valid start,end date range',
        );
      }
      query.andWhere('user.createdAt BETWEEN :user_start AND :user_end', {
        user_start: start,
        user_end: end,
      });
    };
    return filters;
  }

  public async create(dto: CreateUserRequestDto): Promise<UserResponseDto> {
    try {
      const passwordHash = await this.hashPassword(dto.password);
      return await this.userRepository.manager.transaction(async (manager) => {
        const repository = manager.getRepository(UserEntity);
        const roles = await this.getRoles(
          manager.getRepository(RoleEntity),
          dto.roles ?? [],
        );
        const entity = UserMapper.toCreateEntity(dto, passwordHash);
        entity.roles = Promise.resolve(roles);
        const saved = await repository.save(entity);
        return UserMapper.toDto(await this.getEntity(saved.id, repository));
      });
    } catch (error) {
      handleError(error);
    }
  }

  async findForSelectOptions(): Promise<UserSelectOptionResponseDto[]> {
    try {
      const entities = await this.userRepository.find({
        order: { username: 'ASC' },
      });
      return await Promise.all(entities.map(UserMapper.toSelectOptionDto));
    } catch (error) {
      handleError(error);
    }
  }

  public async findOne(id: number): Promise<UserResponseDto> {
    try {
      return await UserMapper.toDto(await this.getEntity(id));
    } catch (error) {
      handleError(error);
    }
  }

  public async findOneByUsername(username: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({
      where: { username },
      relations: { roles: true },
    });
  }

  public async update(
    id: number,
    dto: UpdateUserRequestDto,
  ): Promise<UserResponseDto> {
    try {
      const passwordHash =
        dto.password === undefined
          ? undefined
          : await this.hashPassword(dto.password);
      return await this.userRepository.manager.transaction(async (manager) => {
        const repository = manager.getRepository(UserEntity);
        const entity = await repository.findOneBy({ id });
        if (!entity) throw new NotFoundException('User not found');

        UserMapper.toUpdateEntity(entity, dto, passwordHash);
        if (dto.roles !== undefined) {
          entity.roles = Promise.resolve(
            await this.getRoles(manager.getRepository(RoleEntity), dto.roles),
          );
        }
        await repository.save(entity);
        return UserMapper.toDto(await this.getEntity(id, repository));
      });
    } catch (error) {
      handleError(error);
    }
  }

  public async remove(id: number): Promise<UserResponseDto> {
    try {
      const entity = await this.getEntity(id);
      return await UserMapper.toDto(
        await this.userRepository.softRemove(entity),
      );
    } catch (error) {
      handleError(error);
    }
  }

  private async getEntity(
    id: number,
    repository = this.userRepository,
  ): Promise<UserEntity> {
    const entity = await repository.findOne({
      where: { id },
      relations: { roles: true },
    });
    if (!entity) throw new NotFoundException('User not found');
    return entity;
  }

  private async getRoles(
    repository: Repository<RoleEntity>,
    ids: number[],
  ): Promise<RoleEntity[]> {
    if (
      !Array.isArray(ids) ||
      ids.some((id) => !Number.isInteger(id) || id < 1 || id > 2147483647)
    ) {
      throw new BadRequestException('roles must contain positive integer IDs');
    }
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length !== ids.length)
      throw new BadRequestException('roles must contain unique IDs');
    if (!ids.length) return [];
    const roles = await repository.findBy({ id: In(ids) });
    if (roles.length !== ids.length)
      throw new NotFoundException('One or more roles were not found');
    return roles;
  }

  private async hashPassword(password: string): Promise<string> {
    // bcrypt only processes the first 72 bytes, including multi-byte characters.
    if (
      typeof password !== 'string' ||
      Buffer.byteLength(password, 'utf8') > 72
    ) {
      throw new BadRequestException('Password must not exceed 72 UTF-8 bytes');
    }
    return PasswordHash.hash(password);
  }
}
