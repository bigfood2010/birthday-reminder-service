# API Examples

Base URL: `http://localhost:3000`

## Create user

```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Doe",
    "email": "jane@example.com",
    "birthday": "1990-01-11",
    "timezone": "Asia/Tokyo"
  }'
```

## Get user

```bash
curl http://localhost:3000/users/<USER_ID>
```

## Update user

```bash
curl -X PATCH http://localhost:3000/users/<USER_ID> \
  -H "Content-Type: application/json" \
  -d '{
    "timezone": "America/New_York"
  }'
```

## Delete user

```bash
curl -X DELETE http://localhost:3000/users/<USER_ID>
```

## Demo seed scripts

```bash
npm run demo:seed:api
npm run demo:seed:due
npm run demo:cleanup
```
