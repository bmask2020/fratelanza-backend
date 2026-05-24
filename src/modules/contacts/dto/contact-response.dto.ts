import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContactStatus, Role, UserStatus } from '@prisma/client';

class ContactHandlerDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ enum: Role })
  role: Role;

  @ApiProperty({ enum: UserStatus })
  status: UserStatus;
}

export class ContactResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiPropertyOptional()
  company?: string;

  @ApiProperty()
  subject: string;

  @ApiProperty()
  message: string;

  @ApiProperty({ enum: ContactStatus })
  status: ContactStatus;

  @ApiPropertyOptional({ type: ContactHandlerDto })
  handledBy?: ContactHandlerDto;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}
