import { ApiProperty } from "@nestjs/swagger";
import { UserResponseDto } from "../../admin/system/user/dto/user-response.dto";
import { TokenResponseDto } from "./token-response.dto";

export class SignInResponseDto {
    @ApiProperty({ type: () => UserResponseDto })
    users: UserResponseDto;

    @ApiProperty({ type: () => TokenResponseDto })
    token: TokenResponseDto;
}