import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

interface CreateUploadedFileInput {
  originalName: string;
  storedName: string;
  mimeType: string;
  path: string;
  size: number;
  uploadedById?: string;
}

@Injectable()
export class UploadsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: CreateUploadedFileInput) {
    return this.prisma.uploadedFile.create({
      data: input,
    });
  }

  countAll() {
    return this.prisma.uploadedFile.count();
  }
}
