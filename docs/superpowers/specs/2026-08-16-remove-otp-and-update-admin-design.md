# Remove OTP And Update Admin Credentials

## Scope

Remove every user-facing and callable OTP authentication flow from TechPhone Store. Registration becomes a single-step phone-and-password flow. Password recovery is hidden because the application will no longer have a verified recovery mechanism. Update the demo administrator credentials to phone `0918550811` and password `0918550811` in both frontend mock mode and backend seed data.

This change does not add a replacement password-recovery mechanism, alter authenticated password changes, or change customer demo credentials.

## Frontend Design

- `Register` submits account details directly through a `register` action and redirects to login after successful account creation. It contains no OTP state, OTP copy, OTP input, or SMS delivery step.
- `Login` no longer displays the forgot-password link. The `/forgot-password` route, route metadata, and lazy import are removed so the page is not reachable through the SPA.
- `AuthContext` and `authApi` expose direct registration and no OTP or password-reset methods.
- Mock authentication deletes OTP request and verification behavior. Direct mock registration remains responsible for phone normalization, duplicate checks, and customer account creation.
- OTP-only storage constants and styles are removed when no longer referenced.
- Existing mock localStorage is migrated narrowly: the record with administrator id `user-admin` receives the new phone and password. Other locally persisted users and store data remain unchanged.
- The login demo-account shortcut displays and fills `0918550811` for both administrator fields.

## Backend Design

The existing architecture remains `route -> controller -> service -> repository -> model`.

- `POST /api/auth/register` validates the current registration payload, calls the auth service, creates an active customer directly, and returns the established API envelope with HTTP 201.
- The auth service normalizes the phone, rejects duplicates, hashes the password, creates the user with `phoneVerified` set to its schema default, and issues no OTP or authenticated session.
- Registration OTP and forgot-password OTP routes are removed. Their controller exports, validators, service methods, delivery dependency, and Swagger paths/schemas are removed when unused.
- Login no longer rejects an account based on `phoneVerified`, because direct registrations are intentionally not phone-verified.
- Existing authenticated `PUT /api/auth/change-password` behavior remains unchanged.
- Backend seed data hashes `0918550811` specifically for the administrator. Existing customer seed-password behavior remains unchanged.
- No startup process silently rewrites an existing MongoDB administrator. Applying the backend credential change to an already populated environment requires running the existing seed command, which intentionally replaces demo data.

## API And Data Flow

Registration data flows from the form to `authApi.register`, then to `POST /auth/register` in real-API mode or `mockDb.register` in mock mode. A successful response confirms account creation; the user then logs in explicitly. Registration must never auto-assign an admin role or accept caller-controlled role/status/verification fields.

OTP database records already present in MongoDB are left inert. Removing public routes prevents new OTP creation or consumption without requiring a destructive data migration.

## Error Handling

Frontend validation continues to reject missing fields, invalid Vietnamese phone numbers, passwords shorter than six characters, and mismatched password confirmation. Backend validators and service checks remain authoritative in API mode. Duplicate-phone and invalid-input errors continue through `AppError`, the global error handler, and the existing response envelope.

## Testing And Verification

- Add frontend tests first for one-step registration, absence of OTP and forgot-password UI/routes, the new admin shortcut, mock direct registration, and migration of persisted admin credentials.
- Add backend tests first for direct registration, duplicate-phone rejection, absence of OTP endpoints, login of a directly registered customer, and admin seed credential resolution where practical.
- Replace obsolete OTP assertions rather than retaining tests for removed behavior.
- Run focused red/green tests during implementation, then the complete backend Jest suite, frontend Vitest suite, frontend lint, and frontend production build.

## Acceptance Criteria

1. No visible page, link, input, message, or reachable public API asks for, sends, or verifies an OTP.
2. A customer can register once with name, valid Vietnamese phone, password, and confirmation, then log in with that phone and password.
3. The mock administrator can log in with `0918550811` / `0918550811`, including when old mock users already exist in localStorage.
4. Fresh backend seed data contains an administrator that can log in with `0918550811` / `0918550811`.
5. Customer demo credentials and authenticated password changes continue to work.
