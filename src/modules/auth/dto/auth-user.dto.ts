import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../../common/auth/roles.enum';

export class AuthUserDto {
  @ApiProperty({ example: 'seed-admin' })
  id: string;

  @ApiProperty({ example: 'admin@fratelanza.com' })
  email: string;

  @ApiProperty({ enum: Role, example: Role.SuperAdmin })
  role: Role;
}
