import { UserMapper } from "../../system/user/user.mapper";
import { CategoryResponseDto } from "./dto/category-response.dto";
import { CategorySelectOptionResponseDto } from "./dto/category-select-option-response.dto";
import { CreateCategoryRequestDto } from "./dto/create-category-request.dto";
import { UpdateCategoryRequestDto } from "./dto/update-category-request.dto";
import { CategoryEntity } from "./entities/category.entity";

export class CategoryMapper {
    public static async toDto(entity: CategoryEntity): Promise<CategoryResponseDto> {
        const dto = new CategoryResponseDto();

        dto.id = entity.id;
        dto.code = entity.code;
        dto.nameEn = entity.nameEn;
        dto.nameKh = entity.nameKh;
        dto.description = entity.description;
        dto.status = entity.status;
        dto.createdByUserId = entity.createdByUserId;
        dto.createdAt = entity.createdAt;
        dto.updatedAt = entity.updatedAt;
        dto.deletedAt = entity.deletedAt;

        if (entity.createdByUser) {
            dto.createdByUser = await UserMapper.toDto(entity.createdByUser);
        }

        return dto;
    }

    public static async toDtoSelectOption(entity: CategoryEntity): Promise<CategorySelectOptionResponseDto> {
        const dto = new CategorySelectOptionResponseDto();

        dto.id = entity.id;
        dto.code = entity.code;
        dto.nameEn = entity.nameEn;
        dto.nameKh = entity.nameKh;

        return dto;
    }

    public static toCreatedEntity(dto: CreateCategoryRequestDto): CategoryEntity {
        const entity = new CategoryEntity();

        entity.code = dto.code;
        entity.nameEn = dto.nameEn;
        entity.nameKh = dto.nameKh;
        entity.description = dto.description;
        entity.status = dto.status ?? true;
        entity.createdByUserId = dto.createdByUserId;

        return entity;
    }

    public static toUpdateEntity(entity: CategoryEntity, dto: UpdateCategoryRequestDto): CategoryEntity {
        if (dto.code !== undefined) entity.code = dto.code;
        if (dto.nameEn !== undefined) entity.nameEn = dto.nameEn;
        if (dto.nameKh !== undefined) entity.nameKh = dto.nameKh;
        if (dto.description !== undefined) entity.description = dto.description;
        if (dto.status !== undefined) entity.status = dto.status;

        return entity;
    }
}