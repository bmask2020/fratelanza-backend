import { ApiPropertyOptional } from '@nestjs/swagger';
import { ContactStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateContactWorkflowDto {
  @ApiPropertyOptional({ enum: ContactStatus, example: ContactStatus.IN_PROGRESS })
  @IsOptional()
  @IsEnum(ContactStatus)
  status?: ContactStatus;

  @ApiPropertyOptional({ example: 'cman4r8q70000v7k4ef8jtw1m' })
  @IsOptional()
  @IsString()
  handledById?: string;
}
