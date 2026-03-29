# Changelog

## v0.1.1 - 20260329

- User registration and login
- OTP login and password reset
- Farm details onboarding
- Bank details onboarding
- KYC upload and verification flow
- Admin approval and rejection flow
- Company registration and document upload
- Product and marketplace APIs

- Fixed bank registration failure caused by missing `BANK_DETAILS_ENCRYPTION_KEY`.
  Why: the backend could not encrypt account number and IFSC before saving bank details.

- Fixed internal error leakage to the client.
  Why: raw backend errors were being sent in API responses, which exposed server configuration details.

- Fixed duplicate bank details race condition.
  Why: two near-simultaneous requests could hit the unique DB constraint and return a server error instead of a proper conflict response.

- Centralized backend error handling with safe API messages.
  Why: this keeps responses consistent and prevents expected business errors from turning into generic or misleading responses.
