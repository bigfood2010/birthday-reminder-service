#!/usr/bin/env node

const baseUrl = process.env.API_BASE_URL ?? 'http://localhost:3000';
const suffix = Date.now();

const users = [
  {
    name: 'Demo Tokyo',
    email: `demo+tokyo-${suffix}@example.com`,
    birthday: '1992-01-15',
    timezone: 'Asia/Tokyo',
  },
  {
    name: 'Demo New York',
    email: `demo+ny-${suffix}@example.com`,
    birthday: '1990-07-04',
    timezone: 'America/New_York',
  },
  {
    name: 'Demo Leap User',
    email: `demo+leap-${suffix}@example.com`,
    birthday: '2000-02-29',
    timezone: 'UTC',
  },
];

async function createUser(payload) {
  const response = await fetch(`${baseUrl}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}

async function run() {
  console.log(`Seeding via API: ${baseUrl}`);
  for (const user of users) {
    const result = await createUser(user);
    if (!result.ok) {
      console.error(
        `Failed [${result.status}] ${user.email} -> ${JSON.stringify(result.data)}`,
      );
      continue;
    }

    console.log(
      `Created user ${result.data.id} (${result.data.email}) nextBirthdayAt=${result.data.nextBirthdayAtUtc}`,
    );
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
