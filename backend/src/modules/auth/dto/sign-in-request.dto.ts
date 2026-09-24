import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class SignInRequestDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @Matches(/\S/, { message: 'username must not be blank' })
    @MaxLength(250)
    username: string;

    @ApiProperty({ writeOnly: true })
    @IsString()
    @IsNotEmpty()
    password: string;
}
