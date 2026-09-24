import { ApiProperty } from "@nestjs/swagger";
import { UserResponseDto } from "../../../system/user/dto/user-response.dto";

export class CategoryResponseDto {
    @ApiProperty()
    id: number;

    @ApiProperty()
    code: string;

    @ApiProperty()
    nameEn: string;

    @ApiProperty()
    nameKh: string;

    @ApiProperty()
    description: string;

    @ApiProperty()
    status: boolean;
    
    @ApiProperty()
    createdByUserId: number;

    @ApiProperty()
    createdByUser: UserResponseDto;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;

    @ApiProperty()
    deletedAt: Date;
}