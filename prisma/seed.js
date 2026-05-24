const { PrismaClient, Role, UserStatus, ContactStatus } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const defaultAdminPasswordHash =
  process.env.ADMIN_PASSWORD_HASH ||
  '$2b$10$cXcpFQdoEHfkf9uqeYcCG.YbMpmDpM4ejVATslMIURj3/8u5Jnp.q';

async function upsertUser({ email, passwordHash, role, status }) {
  return prisma.user.upsert({
    where: { email },
    update: {
      role,
      status,
      passwordHash,
    },
    create: {
      email,
      passwordHash,
      role,
      status,
    },
  });
}

async function ensureContact({ name, email, company, subject, message, status, handledById }) {
  const existingContact = await prisma.contactSubmission.findFirst({
    where: { email, subject },
  });

  if (existingContact) {
    return prisma.contactSubmission.update({
      where: { id: existingContact.id },
      data: {
        name,
        company,
        message,
        status,
        handledById,
      },
    });
  }

  return prisma.contactSubmission.create({
    data: {
      name,
      email,
      company,
      subject,
      message,
      status,
      handledById,
    },
  });
}

async function ensureUpload({ originalName, storedName, mimeType, path, size, uploadedById }) {
  const existingUpload = await prisma.uploadedFile.findFirst({
    where: { storedName },
  });

  if (existingUpload) {
    return prisma.uploadedFile.update({
      where: { id: existingUpload.id },
      data: {
        originalName,
        mimeType,
        path,
        size,
        uploadedById,
      },
    });
  }

  return prisma.uploadedFile.create({
    data: {
      originalName,
      storedName,
      mimeType,
      path,
      size,
      uploadedById,
    },
  });
}

async function main() {
  const operationsPasswordHash = await bcrypt.hash('Operations@2026', 10);
  const editorPasswordHash = await bcrypt.hash('Editor@2026', 10);

  const superAdmin = await upsertUser({
    email: process.env.ADMIN_EMAIL || 'admin@fratelanza.com',
    passwordHash: defaultAdminPasswordHash,
    role: Role.SUPER_ADMIN,
    status: UserStatus.ACTIVE,
  });

  const adminUser = await upsertUser({
    email: 'operations@fratelanza.com',
    passwordHash: operationsPasswordHash,
    role: Role.ADMIN,
    status: UserStatus.ACTIVE,
  });

  const editorUser = await upsertUser({
    email: 'editor@fratelanza.com',
    passwordHash: editorPasswordHash,
    role: Role.EDITOR,
    status: UserStatus.ACTIVE,
  });

  await ensureContact({
    name: 'Ahmed Ali',
    email: 'ahmed@example.com',
    company: 'Atlas Trading',
    subject: 'Partnership inquiry',
    message: 'We need a partnership proposal and pricing details for the new platform.',
    status: ContactStatus.PENDING,
    handledById: null,
  });

  await ensureContact({
    name: 'Sara Hassan',
    email: 'sara@example.com',
    company: 'Nile Ventures',
    subject: 'Enterprise quotation',
    message: 'Please assign someone to prepare an enterprise quotation for our internal portal.',
    status: ContactStatus.IN_PROGRESS,
    handledById: adminUser.id,
  });

  await ensureContact({
    name: 'Mahmoud Salem',
    email: 'mahmoud@example.com',
    company: 'Salem Group',
    subject: 'Implementation follow-up',
    message: 'Thank you. We reviewed the previous offer and need implementation follow-up next week.',
    status: ContactStatus.RESOLVED,
    handledById: superAdmin.id,
  });

  await ensureUpload({
    originalName: 'company-profile.pdf',
    storedName: 'seed-company-profile.pdf',
    mimeType: 'application/pdf',
    path: 'uploads/seed-company-profile.pdf',
    size: 102400,
    uploadedById: superAdmin.id,
  });

  await ensureUpload({
    originalName: 'brand-assets.zip',
    storedName: 'seed-brand-assets.zip',
    mimeType: 'application/zip',
    path: 'uploads/seed-brand-assets.zip',
    size: 512000,
    uploadedById: editorUser.id,
  });

  console.log('Seed completed successfully.');
  console.log(
    JSON.stringify(
      {
        users: [superAdmin.email, adminUser.email, editorUser.email],
        samplePasswords: {
          superAdmin: 'Fratelanza@2026',
          admin: 'Operations@2026',
          editor: 'Editor@2026',
        },
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error('Seed failed.');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
