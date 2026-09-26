import { ApiHideProperty, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateIf } from 'class-validator';
import { RestaurantTableStatuseEnum } from '../../../../../libs/enums/restaurant-table-status.enum';

export class CreateRestaurantTableRequestDto {
    @ApiProperty({ example: 'T01' })
    @IsString()
    @IsNotEmpty()
    @Matches(/\S/)
    @MaxLength(250)
    code: string;

    @ApiProperty({ example: 'Table 1' })
    @IsString()
    @IsNotEmpty()
    @Matches(/\S/)
    @MaxLength(250)
    name: string;

    @ApiProperty({ example: 4, minimum: 1 })
    @IsInt()
    @Min(1)
    @Max(2147483647)
    capacity: number;

    @ApiPropertyOptional({ enum: RestaurantTableStatuseEnum, default: RestaurantTableStatuseEnum.AVAILABLE })
    @ValidateIf((_object, value) => value !== undefined)
    @IsEnum(RestaurantTableStatuseEnum)
    status?: RestaurantTableStatuseEnum;

    @ApiPropertyOptional({ type: String, nullable: true })
    @IsOptional()
    @IsString()
    note?: string | null;

    @ApiPropertyOptional({ default: 0, minimum: 0 })
    @ValidateIf((_object, value) => value !== undefined)
    @IsInt()
    @Min(0)
    @Max(2147483647)
    sortOrder?: number;

    @ApiPropertyOptional({ default: true })
    @ValidateIf((_object, value) => value !== undefined)
    @IsBoolean()
    active?: boolean;

    @ApiHideProperty()
    createdByUserId: number;
}
