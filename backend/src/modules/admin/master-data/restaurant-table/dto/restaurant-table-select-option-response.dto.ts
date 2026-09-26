import { ApiProperty } from '@nestjs/swagger';
import { RestaurantTableStatuseEnum } from '../../../../../libs/enums/restaurant-table-status.enum';

export class RestaurantTableSelectOptionResponseDto {
    @ApiProperty()
    id: number;

    @ApiProperty()
    code: string;

    @ApiProperty()
    name: string;

    @ApiProperty()
    capacity: number;

    @ApiProperty({ enum: RestaurantTableStatuseEnum })
    status: RestaurantTableStatuseEnum;

    @ApiProperty()
    sortOrder: number;
}
