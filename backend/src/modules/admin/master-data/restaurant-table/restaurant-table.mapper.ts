import { RestaurantTableStatuseEnum } from '../../../../libs/enums/restaurant-table-status.enum';
import { UserMapper } from '../../system/user/user.mapper';
import { RestaurantTableEntity } from './entities/restaurant-table.entity';
import { RestaurantTableResponseDto } from './dto/restaurant-table-response.dto';
import { RestaurantTableSelectOptionResponseDto } from './dto/restaurant-table-select-option-response.dto';
import { CreateRestaurantTableRequestDto } from './dto/create-restaurant-table-request.dto';
import { UpdateRestaurantTableRequestDto } from './dto/update-restaurant-table-request.dto';

export class RestaurantTableMapper {
    public static async toDto(entity: RestaurantTableEntity): Promise<RestaurantTableResponseDto> {
        return Object.assign(new RestaurantTableResponseDto(), RestaurantTableMapper.toDtoSelectOption(entity), {
            note: entity.note ?? null,
            active: entity.active,
            createdByUserId: entity.createdByUserId,
            createdByUser: entity.createdByUser ? await UserMapper.toDto(entity.createdByUser) : null,
            createdAt: entity.createdAt,
            updatedAt: entity.updatedAt,
            deletedAt: entity.deletedAt ?? null,
        });
    }

    public static toDtoSelectOption(entity: RestaurantTableEntity): RestaurantTableSelectOptionResponseDto {
        return Object.assign(new RestaurantTableSelectOptionResponseDto(), {
            id: entity.id, code: entity.code, name: entity.name,
            capacity: entity.capacity, status: entity.status, sort_order: entity.sortOrder,
        });
    }

    public static toCreatedEntity(dto: CreateRestaurantTableRequestDto): RestaurantTableEntity {
        const entity = Object.assign(new RestaurantTableEntity(), {
            status: RestaurantTableStatuseEnum.AVAILABLE, sort_order: 0, active: true, note: null,
            createdByUserId: dto.createdByUserId,
        });
        return this.toUpdateEntity(entity, dto);
    }

    public static toUpdateEntity(entity: RestaurantTableEntity, dto: UpdateRestaurantTableRequestDto): RestaurantTableEntity {
        if (dto.code !== undefined) entity.code = dto.code;
        if (dto.name !== undefined) entity.name = dto.name;
        if (dto.capacity !== undefined) entity.capacity = dto.capacity;
        if (dto.status !== undefined) entity.status = dto.status;
        if (dto.note !== undefined) entity.note = dto.note;
        if (dto.sortOrder !== undefined) entity.sortOrder = dto.sortOrder;
        if (dto.active !== undefined) entity.active = dto.active;
        return entity;
    }
}
