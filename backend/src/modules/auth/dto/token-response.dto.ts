import { ApiProperty } from "@nestjs/swagger";

export class TokenResponseDto {
    @ApiProperty()
    accessToken: string;

    @ApiProperty()
    expireIn: string;

    @ApiProperty()
    tokenType: string;
}