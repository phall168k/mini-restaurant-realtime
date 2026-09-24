import { ApiHideProperty, ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateCategoryRequestDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    @MaxLength(250)
    code: string;

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    @MaxLength(250)
    nameEn: string;

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    @MaxLength(250)
    nameKh: string;

    @ApiProperty()
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty()
    @IsOptional()
    @IsBoolean()
    status: boolean;

    @ApiHideProperty()
    createdByUserId: number;
}
