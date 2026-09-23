import { CreateUserRequestDto } from "./dto/create-user-request.dto";
import { UserResponseDto } from "./dto/user-response.dto";
import { UserSelectOptionResponseDto } from "./dto/user-select-option-response.dto";
import { UpdateUserRequestDto } from "./dto/update-user-request.dto";
import { UserEntity } from "./entities/user.entity";
import { RoleMapper } from "../role/role.mapper";

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

        const roles = (await entity.roles) ?? [];
        dto.roles = await Promise.all(roles.map((role) => RoleMapper.toDto(role)));

        return dto;
    }

    public static async toSelectOptionDto(entity: UserEntity): Promise<UserSelectOptionResponseDto> {
        const dto = new UserSelectOptionResponseDto();

        dto.id = entity.id;
        dto.username = entity.username;

        return dto;
    }

    public static toCreateEntity(dto: CreateUserRequestDto, passwordHash: string): UserEntity {
        const entity = new UserEntity();

        entity.username = dto.username;
        entity.password = passwordHash;
        entity.status = dto.status ?? false;
        entity.isActive = dto.isActive ?? true;
        entity.profile = dto.profile ?? null;
        return entity;
    }

    public static toUpdateEntity(entity: UserEntity, dto: UpdateUserRequestDto, passwordHash?: string): UserEntity {
        if (dto.username !== undefined) entity.username = dto.username;
        if (dto.status !== undefined) entity.status = dto.status;
        if (dto.isActive !== undefined) entity.isActive = dto.isActive;
        if (dto.profile !== undefined) entity.profile = dto.profile;
        if (passwordHash !== undefined) entity.password = passwordHash;

        return entity;
    }
}
