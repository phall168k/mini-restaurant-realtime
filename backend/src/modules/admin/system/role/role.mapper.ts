import { CreateRoleRequestDto } from "./dto/create-role-request.dto";
import { RoleResponseDto } from "./dto/role-response.dto";
import { RoleSelectOptionResponseDto } from "./dto/role-select-option-response.dto";
import { UpdateRoleRequestDto } from "./dto/update-role-request.dto";
import { RoleEntity } from "./entities/role.entity";

export class RoleMapper {
    public static async toDto(entity: RoleEntity): Promise<RoleResponseDto> {
        const dto = new RoleResponseDto();

        dto.id = entity.id;
        dto.name = entity.name;
        dto.description = entity.description;
        dto.status = entity.status;
        dto.createdAt = entity.createdAt;
        dto.updatedAt = entity.updatedAt;
        dto.deletedAt = entity.deletedAt;

        return dto;
    }

    public static async toSelectOptionDto(entity: RoleEntity): Promise<RoleSelectOptionResponseDto> {
        const dto = new RoleSelectOptionResponseDto();

        dto.id = entity.id;
        dto.name = entity.name;

        return dto;
    }

    public static toCreateEntity(dto: CreateRoleRequestDto): RoleEntity {
        const entity = new RoleEntity();

        entity.name = dto.name;
        entity.description = dto.description;
        entity.status = dto.status;

        return entity;
    }

    public static toUpdateEntity(entity: RoleEntity, dto: UpdateRoleRequestDto): RoleEntity {
        entity.name = dto.name;
        entity.description = dto.description;
        entity.status = dto.status;

        return entity;
    }
}