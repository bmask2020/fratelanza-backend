import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@fratelanza.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Fratelanza@2026' })
  @IsString()
  @MinLength(8)
  password: string;
}
