import {
  createCorsOriginDelegate,
  createMulterOptions,
  createUploadFileFilter,
  isSwaggerEnabled,
  parseAllowedUploadMimeTypes,
  parseCorsOrigins,
} from './runtime-config';

describe('runtime-config', () => {
  it('parses comma separated cors origins', () => {
    expect(parseCorsOrigins('https://a.com, https://b.com')).toEqual([
      'https://a.com',
      'https://b.com',
    ]);
  });

  it('enables swagger by default outside production', () => {
    expect(isSwaggerEnabled('development')).toBe(true);
    expect(isSwaggerEnabled('production')).toBe(false);
    expect(isSwaggerEnabled('production', 'true')).toBe(true);
  });

  it('allows configured cors origin and blocks unknown origin', () => {
    const delegate = createCorsOriginDelegate(['https://app.fratelanza.com']);
    const allowed = jest.fn();
    const blocked = jest.fn();

    delegate('https://app.fratelanza.com', allowed);
    delegate('https://evil.example.com', blocked);

    expect(allowed).toHaveBeenCalledWith(null, true);
    expect(blocked.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  it('parses allowed upload mime types and falls back to defaults', () => {
    expect(
      parseAllowedUploadMimeTypes('application/pdf, image/png'),
    ).toEqual(['application/pdf', 'image/png']);
    expect(parseAllowedUploadMimeTypes()).toEqual([
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
    ]);
  });

  it('accepts only allowed upload mime types', () => {
    const fileFilter = createUploadFileFilter(['application/pdf']);
    const allowed = jest.fn();
    const blocked = jest.fn();

    fileFilter({}, { mimetype: 'application/pdf' }, allowed);
    fileFilter({}, { mimetype: 'application/x-msdownload' }, blocked);

    expect(allowed).toHaveBeenCalledWith(null, true);
    expect(blocked.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(blocked).toHaveBeenCalledWith(expect.any(Error), false);
  });

  it('creates multer options with destination and max size', () => {
    expect(createMulterOptions('storage/uploads', 15, ['application/pdf'])).toEqual({
      dest: 'storage/uploads',
      limits: {
        fileSize: 15 * 1024 * 1024,
        files: 1,
      },
      fileFilter: expect.any(Function),
    });
  });
});
