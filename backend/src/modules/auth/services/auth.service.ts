import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from '../../admin/system/user/user.service';
import { SignInRequestDto } from '../dto/sign-in-request.dto';
import { handleError } from '../../../libs/utils/handle-error.util';
import { PasswordHash } from '../../../libs/utils/password-hash.util';
import { TokenService } from './token.service';
import { UserMapper } from '../../admin/system/user/user.mapper';
import { SignInResponseDto } from '../dto/sign-in-response.dto';

@Injectable()
export class AuthService {
    constructor(
        private readonly userService: UserService,
        private readonly tokenService: TokenService,
    ) {}

    public async signIn(dto: SignInRequestDto): Promise<SignInResponseDto> {
        try {
            const user = await this.userService.findOneByUsername(dto.username, true);
            if (!user) throw new UnauthorizedException();
            if (!user.isActive) throw new ForbiddenException('User is inactive');
            const isMatched = await PasswordHash.verify(dto.password, user.password);
            if (!isMatched) throw new UnauthorizedException();

            const userPayload = await UserMapper.toDto(user);

            const token = await this.tokenService.generateAuthToken(userPayload);

            return {
                users: userPayload,
                token,
            };
        } catch (error) {
            handleError(error);
        }
    }
}
