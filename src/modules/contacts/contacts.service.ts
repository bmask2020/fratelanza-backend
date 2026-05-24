import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ContactStatus, Role, UserStatus } from '@prisma/client';
import { ContactsRepository } from '../../database/repositories/contacts.repository';
import { UsersRepository } from '../../database/repositories/users.repository';
import { CreateContactDto } from './dto/create-contact.dto';
import { ListContactsQueryDto } from './dto/list-contacts-query.dto';
import { UpdateContactWorkflowDto } from './dto/update-contact-workflow.dto';
import { PaginatedResult, paginate } from '../../common/pagination/paginate';
import { AuditService } from '../../common/audit/audit.service';

export interface ContactSubmission extends CreateContactDto {
  id: string;
  status: ContactStatus;
  handledBy?: {
    id: string;
    email: string;
    role: Role;
    status: UserStatus;
  };
  createdAt: string;
  updatedAt?: string;
}

@Injectable()
export class ContactsService {
  constructor(
    private readonly contactsRepository: ContactsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly auditService: AuditService,
  ) {}

  async create(createContactDto: CreateContactDto): Promise<ContactSubmission> {
    const submission = await this.contactsRepository.create(createContactDto);

    return this.toContactSubmission(submission);
  }

  async findAll(
    query: ListContactsQueryDto = new ListContactsQueryDto(),
  ): Promise<PaginatedResult<ContactSubmission>> {
    const [submissions, total] = await this.contactsRepository.findAll(query);

    return paginate(
      submissions.map((submission) => this.toContactSubmission(submission)),
      query.page,
      query.limit,
      total,
    );
  }

  async updateWorkflow(
    id: string,
    updateContactWorkflowDto: UpdateContactWorkflowDto,
  ): Promise<ContactSubmission> {
    if (Object.keys(updateContactWorkflowDto).length === 0) {
      throw new BadRequestException('At least one workflow field is required.');
    }

    const existingSubmission = await this.contactsRepository.findById(id);

    if (!existingSubmission) {
      throw new NotFoundException('Contact submission was not found.');
    }

    if (updateContactWorkflowDto.handledById) {
      const assignedUser = await this.usersRepository.findById(
        updateContactWorkflowDto.handledById,
      );

      if (!assignedUser) {
        throw new NotFoundException('Assigned user was not found.');
      }
    }

    const updatedSubmission = await this.contactsRepository.updateWorkflow(id, {
      status: updateContactWorkflowDto.status,
      handledById: updateContactWorkflowDto.handledById,
    });

    await this.auditService.record({
      action: 'contacts.workflow.update',
      entityType: 'contact_submission',
      entityId: updatedSubmission.id,
      actorId: updateContactWorkflowDto.handledById,
      metadata: {
        status: updatedSubmission.status,
        handledById: updateContactWorkflowDto.handledById,
      },
    });

    return this.toContactSubmission(updatedSubmission);
  }

  private toContactSubmission(submission: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    company: string | null;
    subject: string;
    message: string;
    status: ContactStatus;
    createdAt: Date;
    updatedAt: Date;
    handledBy?: {
      id: string;
      email: string;
      role: Role;
      status: UserStatus;
    } | null;
  }): ContactSubmission {
    return {
      id: submission.id,
      name: submission.name,
      email: submission.email,
      phone: submission.phone ?? undefined,
      company: submission.company ?? undefined,
      subject: submission.subject,
      message: submission.message,
      status: submission.status,
      handledBy: submission.handledBy ?? undefined,
      createdAt: submission.createdAt.toISOString(),
      updatedAt: submission.updatedAt.toISOString(),
    };
  }
}
