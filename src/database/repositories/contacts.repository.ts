import { Injectable } from '@nestjs/common';
import { ContactStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

interface CreateContactInput {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  subject: string;
  message: string;
}

interface ListContactsInput {
  status?: ContactStatus;
  search?: string;
  handledById?: string;
  page?: number;
  limit?: number;
}

interface UpdateContactWorkflowInput {
  status?: ContactStatus;
  handledById?: string;
}

@Injectable()
export class ContactsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: CreateContactInput) {
    return this.prisma.contactSubmission.create({
      data: input,
      include: {
        handledBy: true,
      },
    });
  }

  findAll(filters: ListContactsInput = {}) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 10;
    const where: Prisma.ContactSubmissionWhereInput = {
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.handledById ? { handledById: filters.handledById } : {}),
      ...(filters.search
        ? {
            OR: [
              {
                name: {
                  contains: filters.search,
                  mode: 'insensitive',
                },
              },
              {
                email: {
                  contains: filters.search,
                  mode: 'insensitive',
                },
              },
              {
                subject: {
                  contains: filters.search,
                  mode: 'insensitive',
                },
              },
              {
                company: {
                  contains: filters.search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };

    return Promise.all([
      this.prisma.contactSubmission.findMany({
        where,
        include: {
          handledBy: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.contactSubmission.count({ where }),
    ]);
  }

  findById(id: string) {
    return this.prisma.contactSubmission.findUnique({
      where: { id },
      include: {
        handledBy: true,
      },
    });
  }

  updateWorkflow(id: string, input: UpdateContactWorkflowInput) {
    return this.prisma.contactSubmission.update({
      where: { id },
      data: input,
      include: {
        handledBy: true,
      },
    });
  }

  countAll() {
    return this.prisma.contactSubmission.count();
  }

  countByStatus(status: ContactStatus) {
    return this.prisma.contactSubmission.count({
      where: { status },
    });
  }
}
