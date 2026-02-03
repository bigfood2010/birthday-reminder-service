# Walkthrough: Run and Test the App

This walkthrough gives you a quick demo path plus full validation steps.

## 1) Install dependencies

```bash
npm install
```

If needed, use: `docs/manual-install-commands.md`.

---

## 2) Start MongoDB + API + worker (fastest way)

```bash
docker compose -f docker/docker-compose.yml up --build
```

Keep this running in Terminal A.

---

## 3) Seed test users (Terminal B)

```bash
npm run demo:seed:api
```

This creates sample users through the API.

---

## 4) Force one due user for instant worker output (Terminal B)

```bash
npm run demo:seed:due
```

Within about one minute, worker logs in Terminal A should show a simulated birthday send.

---

## 5) Verify API quickly

```bash
curl http://localhost:3000/
```

Expected:

```json
{"status":"ok"}
```

---

## 6) Test with Postman

Import these files:

1. `docs/postman/birthday-reminder-service.postman_collection.json`
2. `docs/postman/birthday-reminder-local.postman_environment.json`

Then run requests in order:

1. `Health`
2. `Create User`
3. `Get User by Id`
4. `Update User Timezone`
5. `Delete User`

The `Create User` request auto-saves `userId` for subsequent requests.

---

## 7) Run quality checks locally (without Docker)

```bash
npm run lint
npm run build
npm test -- --runInBand
```

---

## 8) Cleanup demo data

```bash
npm run demo:cleanup
```

---

## 9) Alternate local run (without docker compose)

Terminal A:

```bash
npm run start:dev
```

Terminal B:

```bash
npm run start:worker:dev
```

You still need MongoDB running at:

`mongodb://localhost:27017/birthday_service`
