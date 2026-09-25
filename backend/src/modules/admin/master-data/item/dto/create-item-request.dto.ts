import { ApiHideProperty, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateIf, ValidateNested } from 'class-validator';
import { AttachmentDto } from '../../../../../libs/dtos/attachment.dto';

const moneySchema = {
    default: '0.00',
    description: 'Non-negative decimal with up to 12 integer digits and 2 decimal places. Numbers or decimal strings are accepted; responses use strings for precision.',
    oneOf: [
        { 
            type: 'string', 
            example: '12.50' 
        }, 
        { 
            type: 'number', 
            example: 12.5 
        }
    ],
};

export class CreateItemRequestDto {
    @ApiProperty()
    @IsInt()
    @Min(1)
    @Max(2147483647)
    categoryId: number;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @Matches(/\S/)
    @MaxLength(250)
    code: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @Matches(/\S/)
    @MaxLength(250)
    nameEn: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @Matches(/\S/)
    @MaxLength(250)
    nameKh: string;

    @ApiPropertyOptional({ 
        type: String, 
        nullable: true 
    })
    @IsOptional()
    @IsString()
    description?: string | null;

    @ApiPropertyOptional(moneySchema)
    @ValidateIf((_object, value) => value !== undefined)
    @Transform(({ value }) => typeof value === 'number' ? String(value) : value)
    @IsString()
    @Matches(/^\d{1,12}(\.\d{1,2})?$/, { message: 'unitPrice must be a non-negative decimal with at most 12 integer digits and 2 decimal places' })
    unitPrice?: string;

    @ApiPropertyOptional(moneySchema)
    @ValidateIf((_object, value) => value !== undefined)
    @Transform(({ value }) => typeof value === 'number' ? String(value) : value)
    @IsString()
    @Matches(/^\d{1,12}(\.\d{1,2})?$/, { message: 'discount must be a non-negative decimal with at most 12 integer digits and 2 decimal places' })
    discount?: string;

    @ApiPropertyOptional({ 
        type: AttachmentDto, 
        nullable: true, 
        description: 'Metadata from POST /minio/upload. Set null to clear the thumbnail.' 
    })
    @IsOptional()
    @IsObject()
    @ValidateNested()
    @Type(() => AttachmentDto)
    thumbnail?: AttachmentDto | null;

    @ApiPropertyOptional({ default: true })
    @ValidateIf((_object, value) => value !== undefined)
    @IsBoolean()
    status?: boolean;

    @ApiHideProperty()
    createdByUserId: number;
}
