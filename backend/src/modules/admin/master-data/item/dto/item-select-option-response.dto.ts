import { ApiProperty } from '@nestjs/swagger';

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
}
