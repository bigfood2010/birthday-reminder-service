# Birthday Reminder Service

Backend service that manages users and sends a simulated birthday greeting at **9:00 AM local time** on each user birthday.

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

- Reminder delivery is simulated via logs (no SMTP/provider integration).
- `birthday` must be `YYYY-MM-DD`.
- `timezone` must be a valid IANA timezone.
- Leap-day birthdays (`02-29`) are sent only in leap years.
- Updating `birthday` or `timezone` recomputes next schedule.

## Reviewer resources

- Step-by-step run and test walkthrough: `docs/walkthrough.md`
- API examples (curl): `docs/api-examples.md`
- Postman collection: `docs/postman/birthday-reminder-service.postman_collection.json`
- Postman environment: `docs/postman/birthday-reminder-local.postman_environment.json`
- Assignment brief: `docs/birthday-service-assignment.pdf`
