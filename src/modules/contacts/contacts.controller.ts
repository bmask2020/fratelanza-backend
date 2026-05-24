import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '../../common/auth/roles.enum';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ContactResponseDto } from './dto/contact-response.dto';
import { ContactsPaginatedResponseDto } from './dto/contacts-paginated-response.dto';
import { CreateContactDto } from './dto/create-contact.dto';
import { ListContactsQueryDto } from './dto/list-contacts-query.dto';
import { UpdateContactWorkflowDto } from './dto/update-contact-workflow.dto';
import { ContactsService } from './contacts.service';

@ApiTags('Contacts')
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  @ApiOperation({ summary: 'Submit a public contact request' })
  @ApiCreatedResponse({ type: ContactResponseDto })
  create(@Body() createContactDto: CreateContactDto) {
    return this.contactsService.create(createContactDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SuperAdmin, Role.Admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List contact submissions with workflow filters' })
  @ApiOkResponse({ type: ContactsPaginatedResponseDto })
  findAll(@Query() query: ListContactsQueryDto) {
    return this.contactsService.findAll(query);
  }

  @Patch(':id/workflow')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SuperAdmin, Role.Admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update contact status or assign a handler' })
  @ApiOkResponse({ type: ContactResponseDto })
  updateWorkflow(
    @Param('id') id: string,
    @Body() updateContactWorkflowDto: UpdateContactWorkflowDto,
  ) {
    return this.contactsService.updateWorkflow(id, updateContactWorkflowDto);
  }
}
