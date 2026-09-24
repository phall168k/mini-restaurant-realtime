import { ApiProperty } from '@nestjs/swagger';
import { RoleResponseDto } from '../../role/dto/role-response.dto';

export class UserResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  username: string;

  @ApiProperty({ default: false })
  status: boolean;

  @ApiProperty({ default: true })
  isActive: boolean;

  @ApiProperty({ type: Boolean, nullable: true, default: null })
  isSuperUser: boolean | null;

  @ApiProperty({ type: String, nullable: true })
  profile: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ type: Date, nullable: true })
  deletedAt: Date | null;

  @ApiProperty({ type: () => [RoleResponseDto] })
  roles: RoleResponseDto[];
}
