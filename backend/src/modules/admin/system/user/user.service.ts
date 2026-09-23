import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseCrudService } from '../../../../libs/services/base-crud.service';
import { QueryFilters } from '../../../../libs/services/pagination/filter.helper';
import { handleError } from '../../../../libs/utils/handle-error.util';
import { CreateUserRequestDto } from './dto/create-user-request.dto';
import { UpdateUserRequestDto } from './dto/update-user-request.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UserSelectOptionResponseDto } from './dto/user-select-option-response.dto';
import { UserEntity } from './entities/user.entity';
import { UserMapper } from './user.mapper';
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
    return this.userRepository.createQueryBuilder(this.queryName);
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

  async create(dto: CreateUserRequestDto): Promise<UserResponseDto> {
    try {
      const passwordHash = await PasswordHash.hash(dto.password);
      const entity = UserMapper.toCreateEntity({
        ...dto,
        password: passwordHash,
      });
      return UserMapper.toDto(await this.userRepository.save(entity));
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

  async findOne(id: number): Promise<UserResponseDto> {
    try {
      return UserMapper.toDto(await this.getEntity(id));
    } catch (error) {
      handleError(error);
    }
  }

  async update(
    id: number,
    dto: UpdateUserRequestDto,
  ): Promise<UserResponseDto> {
    try {
      const entity = await this.getEntity(id);
      UserMapper.toUpdateEntity(entity, dto);
      return UserMapper.toDto(await this.userRepository.save(entity));
    } catch (error) {
      handleError(error);
    }
  }

  async remove(id: number): Promise<UserResponseDto> {
    try {
      const entity = await this.getEntity(id);
      return UserMapper.toDto(await this.userRepository.softRemove(entity));
    } catch (error) {
      handleError(error);
    }
  }

  private async getEntity(id: number): Promise<UserEntity> {
    const entity = await this.userRepository.findOneBy({ id });
    if (!entity) throw new NotFoundException('User not found');
    return entity;
  }

}
