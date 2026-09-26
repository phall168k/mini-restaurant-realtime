import { ApiProperty } from '@nestjs/swagger';
import { CategorySelectOptionResponseDto } from '../../category/dto/category-select-option-response.dto';
import { ItemSelectOptionResponseDto } from './item-select-option-response.dto';
import { UserResponseDto } from '../../../system/user/dto/user-response.dto';

export class ItemResponseDto extends ItemSelectOptionResponseDto {
    @ApiProperty({ 
        type: CategorySelectOptionResponseDto, 
        nullable: true 
    })
    category: CategorySelectOptionResponseDto | null;

    @ApiProperty({ 
        type: String, 
        nullable: true 
    })
    description: string | null;

    @ApiProperty({ 
        type: String, 
        example: '12.50' 
    })
    unitPrice: string;

    @ApiProperty({ 
        type: String, 
        example: '0.00' 
    })
    discount: string;

    @ApiProperty()
    status: boolean;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;

    @ApiProperty({ 
        type: Date, 
        nullable: true 
    })
    deletedAt: Date | null;

    @ApiProperty()
    createdByUserId: number;

    @ApiProperty({
        type: UserResponseDto,
        nullable: true,
    })
    createdByUser: UserResponseDto | null;
}
