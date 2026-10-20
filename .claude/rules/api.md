---
paths:
  - "src/app/api/**"   # TODO(stub): set to the real API dir
  - "**/server/**"
  - "**/routes/**"
  - "**/actions/**"
---
<!-- last-verified: 2026-10-01 -->
# API / server

- Validate request input with {{VALIDATION_LIB}} schemas at the edge of every handler.
- Response shape: {{e.g. `{ data: T } | { error: { code, message } }`}}; consistent HTTP status codes.
- AuthZ check first, before any data access.
- Business logic lives in {{SERVICE_LAYER_PATH}}; handlers stay thin.
- Idempotency for retries on mutating endpoints where clients may retry.
- Log with structured fields; never log secrets or PII.
- Rate-limit public endpoints. Paginate list endpoints.
