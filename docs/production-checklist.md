# Production Checklist

## Env Secrets

- Replace `JWT_ACCESS_SECRET` with a long random secret generated outside the repository.
- Replace `JWT_REFRESH_SECRET` with a different long random secret.
- Replace `ADMIN_PASSWORD_HASH` with a real bcrypt hash for the production admin password.
- Ensure `.env` is not committed and production secrets are injected through the server or deployment platform.
- Rotate JWT secrets and admin credentials through a defined release process.
- If external monitoring is enabled, inject `MONITORING_DSN` through the deployment platform rather than committing it.

## CORS

- Set `CORS_ORIGINS` to explicit trusted origins only.
- Use a comma-separated list such as `https://fratelanza.com,https://admin.fratelanza.com`.
- Do not leave development origins enabled in production.
- Set `ENABLE_SWAGGER=false` on public production deployments unless the API docs are intentionally exposed.

## Storage

- Keep `STORAGE_DRIVER=local` only for single-server deployments.
- Set `UPLOAD_DESTINATION` to a persistent writable path outside ephemeral temp storage.
- Review `MAX_UPLOAD_SIZE_MB` based on expected document size and reverse-proxy limits.
- Keep `ALLOWED_UPLOAD_MIME_TYPES` and `ALLOWED_UPLOAD_EXTENSIONS` as small as possible.
- Keep `UPLOAD_SCAN_MODE=basic` at minimum, or replace the inspection hook with an external antivirus or malware-scanning provider.
- Add backup, retention, and antivirus scanning policies before public file intake.
- For multi-instance or cloud deployments, move uploads to object storage and keep only metadata in PostgreSQL.

## Release Verification

- Run `npm run prisma:migrate:deploy` before application rollout.
- Run `npm run prisma:generate` and `npm run build` in CI.
- Run `npm run smoke:live` against the deployed environment after release.
- Enable `MONITORING_ENABLED=true` only after confirming the provider configuration is valid in the target environment.
- Validate the production env against `.env.production.example` before release.
