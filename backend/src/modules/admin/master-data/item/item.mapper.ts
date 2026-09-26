import { UserMapper } from '../../system/user/user.mapper';
import { CategoryMapper } from '../category/category.mapper';
import { ItemEntity } from './entities/item.entity';
import { ItemResponseDto } from './dto/item-response.dto';
import { ItemSelectOptionResponseDto } from './dto/item-select-option-response.dto';
import { CreateItemRequestDto } from './dto/create-item-request.dto';
import { UpdateItemRequestDto } from './dto/update-item-request.dto';

export class ItemMapper {
    private static decimal(value: string): string {
        const [whole, fraction = ''] = value.split('.');
        return `${whole.replace(/^0+(?=\d)/, '')}.${fraction.padEnd(2, '0')}`;
    }

    public static async toDto(entity: ItemEntity): Promise<ItemResponseDto> {
        return Object.assign(new ItemResponseDto(), ItemMapper.toDtoSelectOption(entity), {
            category: entity.category ? await CategoryMapper.toDtoSelectOption(entity.category) : null,
            description: entity.description ?? null,
            unitPrice: entity.unitPrice,
            status: entity.status,
            createdByUserId: entity.createdByUserId,
            createdByUser: entity.createdByUser ? await UserMapper.toDto(entity.createdByUser) : null,
            createdAt: entity.createdAt,
            updatedAt: entity.updatedAt,
            deletedAt: entity.deletedAt ?? null,
        });
    }

    public static toDtoSelectOption(entity: ItemEntity): ItemSelectOptionResponseDto {
        return Object.assign(new ItemSelectOptionResponseDto(), {
            id: entity.id, categoryId: entity.categoryId, code: entity.code,
            nameEn: entity.nameEn, nameKh: entity.nameKh,
            discount: entity.discount,
            thumbnail: entity.thumbnail ?? null,
        });
    }

    public static toCreatedEntity(dto: CreateItemRequestDto): ItemEntity {
        const entity = Object.assign(new ItemEntity(), {
            createdByUserId: dto.createdByUserId,
            unitPrice: '0.00', discount: '0.00', status: true, description: null, thumbnail: null,
        });
        return ItemMapper.toUpdateEntity(entity, dto);
    }

    public static toUpdateEntity(entity: ItemEntity, dto: UpdateItemRequestDto): ItemEntity {
        if (dto.categoryId !== undefined) entity.categoryId = dto.categoryId;
        if (dto.code !== undefined) entity.code = dto.code;
        if (dto.nameEn !== undefined) entity.nameEn = dto.nameEn;
        if (dto.nameKh !== undefined) entity.nameKh = dto.nameKh;
        if (dto.description !== undefined) entity.description = dto.description;
        if (dto.unitPrice !== undefined) entity.unitPrice = ItemMapper.decimal(dto.unitPrice);
        if (dto.discount !== undefined) entity.discount = ItemMapper.decimal(dto.discount);
        if (dto.thumbnail !== undefined) entity.thumbnail = dto.thumbnail;
        if (dto.status !== undefined) entity.status = dto.status;
        return entity;
    }
}
