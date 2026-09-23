import { ApiProperty } from "@nestjs/swagger";

export class RoleSelectOptionResponseDto {
    @ApiProperty()
    id: number;

    @ApiProperty()
    name: string;
}