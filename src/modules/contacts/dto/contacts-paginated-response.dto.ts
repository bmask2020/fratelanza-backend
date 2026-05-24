import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../../common/pagination/pagination-meta.dto';
import { ContactResponseDto } from './contact-response.dto';

export class ContactsPaginatedResponseDto {
  @ApiProperty({ type: ContactResponseDto, isArray: true })
  items: ContactResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
