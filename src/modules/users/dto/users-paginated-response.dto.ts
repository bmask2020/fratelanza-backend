import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../../common/pagination/pagination-meta.dto';
import { UserResponseDto } from './user-response.dto';

export class UsersPaginatedResponseDto {
  @ApiProperty({ type: UserResponseDto, isArray: true })
  items: UserResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
