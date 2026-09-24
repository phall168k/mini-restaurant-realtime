import { Body, Controller, Post } from '@nestjs/common';
import { SkipAuth } from './decorators/skip-auth.decorator';
import { ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { SignInResponseDto } from './dto/sign-in-response.dto';
import { SignInRequestDto } from './dto/sign-in-request.dto';
import { AuthService } from './services/auth.service';

@ApiTags('Authentication')
@Controller({
    path: 'auth',
    version: '1',
})
export class AuthController {

    constructor(private readonly authService: AuthService) {}

    @Post('sign-in')
    @SkipAuth()
    @ApiOperation({ summary: 'Sign in by username and password' })
    @ApiOkResponse({ type: SignInResponseDto })
    @ApiUnauthorizedResponse({ description: 'Unauthorized' })
    @ApiForbiddenResponse({ description: 'User is inactive' })
    public signIn(@Body() dto: SignInRequestDto): Promise<SignInResponseDto> {
        return this.authService.signIn(dto);
    }

}
