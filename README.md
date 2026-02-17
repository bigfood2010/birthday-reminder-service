# Birthday Reminder Service

Backend service that manages users and sends birthday greetings at **9:00 AM local time** on each user birthday.

## What is implemented

- User CRUD API (`name`, `email`, `birthday`, `timezone`)
- Timezone-aware birthday scheduling logic
- Background worker that processes due birthday reminders
- MongoDB persistence with unique email constraint
- Dockerized API + worker + MongoDB setup
- Comprehensive test suite (unit, integration, e2e)

## Quick start (recommended for reviewers)

Run the full stack:

```bash
docker compose -f docker/docker-compose.yml up --build
```

Services:
- API: `http://localhost:3000`
- MongoDB: `localhost:27017`

Stop:

```bash
docker compose -f docker/docker-compose.yml down
```

## Local development (without Docker)

Install dependencies:

```bash
npm install
```

Run API:

```bash
npm run start:dev
```

Run worker (separate terminal):

```bash
npm run start:worker:dev
```

Default DB URI: `mongodb://localhost:27017/birthday_service`  
Override with `MONGODB_URI`.

Optional worker retry tuning:
- `WORKER_MAX_DELIVERY_ATTEMPTS` (default: `3`)
- `WORKER_RETRY_DELAY_MINUTES` (default: `15`)

Message delivery provider (minimal options):
- `BIRTHDAY_MESSAGE_PROVIDER` (`mock` by default, optional `sendgrid`)
- `SENDGRID_API_KEY` (required when provider is `sendgrid`)
- `SENDGRID_FROM_EMAIL` (required when provider is `sendgrid`)

## Testing

The test suite is organized into three categories:

| Type | Location | Description |
|------|----------|-------------|
| **Unit** | `test/unit/` | Isolated tests with mocks |
| **Integration** | `test/integration/` | Multi-layer tests |
| **E2E** | `test/e2e/` | Full HTTP request/response tests |

### Run tests

```bash
# Run unit tests (default)
npm test

# Run specific test suites
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:e2e           # End-to-end tests only

# Run all test suites
npm run test:all

# Run with coverage
npm run test:cov

# Watch mode (development)
npm run test:watch
```

## Validation commands

```bash
npm run lint
npm run build
npm run test:all
```

## Assumptions

- Default reminder delivery is simulated via logs (`BIRTHDAY_MESSAGE_PROVIDER=mock`).
- Optional SendGrid integration is available (`BIRTHDAY_MESSAGE_PROVIDER=sendgrid`).
- Worker awaits delivery before persisting yearly send success.
- Failed delivery is retried up to 3 attempts with 15-minute backoff.
- After retries are exhausted, the worker skips that year and schedules the next birthday.
- Delivery calls include deterministic idempotency key format: `birthday:<userId>:<year>`.
- `birthday` must be `YYYY-MM-DD`.
- `timezone` must be a valid IANA timezone.
- Leap-day birthdays (`02-29`) are sent only in leap years.
- Updating `birthday` or `timezone` recomputes next schedule.

## Feedback fulfillment table

| Reviewer feedback | Risk | Implemented fix | Evidence |
|------|------|------|------|
| `birthdayMessageService.send(...)` was called without `await` | Delivery errors from external providers could be missed by worker control flow | Made `send` asynchronous and awaited in worker processing flow | `src/birthday-worker/birthday-message.service.ts`, `src/birthday-worker/birthday-worker.service.ts`, `test/unit/birthday-worker/birthday-worker.service.spec.ts` |
| `markBirthdayProcessed` happened before delivery confirmation | DB could mark year as sent even when provider call fails | Reordered flow to `await send` first, then persist success with `markBirthdayProcessed` | `src/birthday-worker/birthday-worker.service.ts`, `test/unit/birthday-worker/birthday-worker.service.spec.ts` |
| No retry mechanism for transient delivery failures | Users could miss their yearly birthday message permanently after one failure | Added DB-backed retry state (`deliveryAttemptCount`, `nextDeliveryAttemptAtUtc`, `lastDeliveryError`, `lastDeliveryAttemptAtUtc`) and retry-aware due-user query | `src/users/schemas/user.schema.ts`, `src/users/users.repository.ts`, `test/unit/users/users.repository.spec.ts` |
| No bounded failure handling for repeated errors | Endless retries or undefined terminal behavior could occur | Added bounded retry policy: 3 attempts, 15-minute backoff, then skip current year and reschedule next birthday | `src/birthday-worker/birthday-worker.service.ts`, `.env.example`, `README.md`, `test/unit/birthday-worker/birthday-worker.service.spec.ts` |
| Potential duplicate sends if provider succeeds but DB update fails afterward | At-least-once processing can resend without a stable dedupe key | Added deterministic idempotency key format `birthday:<userId>:<year>` to delivery payload/log context | `src/birthday-worker/birthday-message.service.ts`, `src/birthday-worker/birthday-worker.service.ts`, `test/unit/birthday-worker/birthday-message.service.spec.ts` |

## Reviewer resources

- Step-by-step run and test walkthrough: `docs/walkthrough.md`
- API examples (curl): `docs/api-examples.md`
- Postman collection: `docs/postman/birthday-reminder-service.postman_collection.json`
- Postman environment: `docs/postman/birthday-reminder-local.postman_environment.json`
- Assignment brief: `docs/birthday-service-assignment.pdf`
