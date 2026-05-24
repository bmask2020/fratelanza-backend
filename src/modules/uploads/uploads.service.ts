import { BadRequestException, Injectable } from '@nestjs/common';
import { UploadsRepository } from '../../database/repositories/uploads.repository';
import { UploadedFilePayload } from './types/uploaded-file.type';
import { UploadInspectionService } from './upload-inspection.service';

@Injectable()
export class UploadsService {
  constructor(
    private readonly uploadsRepository: UploadsRepository,
    private readonly uploadInspectionService: UploadInspectionService,
  ) {}

  async save(userId: string, file?: UploadedFilePayload) {
    if (!file) {
      throw new BadRequestException('A file upload is required.');
    }

    this.uploadInspectionService.inspect(file);

    return this.uploadsRepository.create({
      originalName: file.originalname,
      mimeType: file.mimetype,
      storedName: file.filename,
      size: file.size,
      path: file.path,
      uploadedById: userId,
    });
  }
}
