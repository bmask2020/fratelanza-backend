-- CreateIndex
CREATE INDEX "User_status_createdAt_idx" ON "User"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ContactSubmission_status_createdAt_idx" ON "ContactSubmission"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ContactSubmission_handledById_idx" ON "ContactSubmission"("handledById");

-- CreateIndex
CREATE INDEX "UploadedFile_uploadedById_createdAt_idx" ON "UploadedFile"("uploadedById", "createdAt");
