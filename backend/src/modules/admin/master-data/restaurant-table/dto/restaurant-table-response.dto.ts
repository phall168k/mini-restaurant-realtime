import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from '../../../system/user/dto/user-response.dto';
import { RestaurantTableSelectOptionResponseDto } from './restaurant-table-select-option-response.dto';

export class RestaurantTableResponseDto extends RestaurantTableSelectOptionResponseDto {
    @ApiProperty({ type: String, nullable: true })
    note: string | null;

    @ApiProperty()
    active: boolean;

    @ApiProperty()
    createdByUserId: number;

    @ApiProperty({ type: UserResponseDto, nullable: true })
    createdByUser: UserResponseDto | null;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;

    @ApiProperty({ type: Date, nullable: true })
    deletedAt: Date | null;
}
