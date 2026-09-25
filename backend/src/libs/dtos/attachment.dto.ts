import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Max, MaxLength, Min } from 'class-validator';

// Matches the metadata returned by POST /minio/upload; never store a temporary signed URL.
export class AttachmentDto {
    @ApiProperty({ example: 'mini-restaurant' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(63)
    bucket: string;

    @ApiProperty({ example: 'uploads/uuid-image.jpg' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(1024)
    objectName: string;

    @ApiProperty({ example: 'image.jpg' })
    @IsString()
    @IsNotEmpty()
    originalName: string;

    @ApiProperty({ example: 'image/jpeg' })
    @IsString()
    @IsNotEmpty()
    mimetype: string;

    @ApiProperty({ example: 1024 })
    @IsInt()
    @Min(0)
    @Max(Number.MAX_SAFE_INTEGER)
    size: number;
}
