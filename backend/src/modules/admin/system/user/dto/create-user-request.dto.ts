import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  Min,
  Max,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateUserRequestDto {
  @ApiProperty({ example: 'john.doe', maxLength: 250 })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, { message: 'username must not be blank' })
  @MaxLength(250)
  username: string;

  @ApiProperty({ writeOnly: true, minLength: 8, maxLength: 72 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;

  @ApiPropertyOptional({ default: false })
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  status?: boolean;

  @ApiPropertyOptional({ default: true })
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'Profile image URL or file path',
    maxLength: 2048,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  profile?: string | null;

  @ApiPropertyOptional({
    type: [Number],
    description: 'Unique role IDs; an empty array clears all roles on update',
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(2147483647, { each: true })
  @ArrayUnique()
  roles?: number[];
}
