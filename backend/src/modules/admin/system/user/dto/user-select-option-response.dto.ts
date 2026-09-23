import { ApiProperty } from '@nestjs/swagger';

export class UserSelectOptionResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  username: string;
}
