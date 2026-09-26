import { ApiProperty } from '@nestjs/swagger';
import { AttachmentDto } from '../../../../../libs/dtos/attachment.dto';

export class ItemSelectOptionResponseDto {
    @ApiProperty()
    id: number;

    @ApiProperty()
    categoryId: number;

    @ApiProperty()
    code: string;

    @ApiProperty()
    nameEn: string;

    @ApiProperty()
    nameKh: string;

    @ApiProperty({ type: String, example: '0.00' })
    discount: string;

    @ApiProperty({ type: AttachmentDto, nullable: true })
    thumbnail: AttachmentDto | null;
}
