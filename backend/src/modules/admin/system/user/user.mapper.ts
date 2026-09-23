import { CreateUserRequestDto } from "./dto/create-user-request.dto";
import { UserResponseDto } from "./dto/user-response.dto";
import { UserSelectOptionResponseDto } from "./dto/user-select-option-response.dto";
import { UpdateUserRequestDto } from "./dto/update-user-request.dto";
import { UserEntity } from "./entities/user.entity";

export class UserMapper {
    public static async toDto(entity: UserEntity): Promise<UserResponseDto> {
        const dto = new UserResponseDto();

        dto.id = entity.id;
        dto.username = entity.username;
        dto.status = entity.status;
        dto.isActive = entity.isActive;
        dto.profile = entity.profile ?? null;
        dto.createdAt = entity.createdAt;
        dto.updatedAt = entity.updatedAt;
        dto.deletedAt = entity.deletedAt ?? null;

        return dto;
    }

    public static async toSelectOptionDto(entity: UserEntity): Promise<UserSelectOptionResponseDto> {
        const dto = new UserSelectOptionResponseDto();

        dto.id = entity.id;
        dto.username = entity.username;

        return dto;
    }

    public static toCreateEntity(dto: CreateUserRequestDto): UserEntity {
        const entity = new UserEntity();

        entity.username = dto.username;
        entity.password = dto.password;
        entity.status = dto.status ?? false;
        entity.isActive = dto.isActive ?? true;
        entity.profile = dto.profile ?? null;

        return entity;
    }

    public static toUpdateEntity(entity: UserEntity, dto: UpdateUserRequestDto): UserEntity {
        
        entity.username = dto.username;
        entity.status = dto.status ?? false;
        entity.isActive = dto.isActive ?? true;
        entity.profile = dto.profile ?? null;

        return entity;
    }
}
