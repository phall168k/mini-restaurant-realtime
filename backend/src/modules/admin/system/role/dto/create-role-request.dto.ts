import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRoleRequestDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    @MaxLength(250)
    name: string;

    @ApiProperty()
    @IsOptional()
    @IsString()
    @MaxLength(250)
    description?: string;

    @ApiProperty({ default: true })
    @IsOptional()
    @IsBoolean()
    status: boolean;
}
