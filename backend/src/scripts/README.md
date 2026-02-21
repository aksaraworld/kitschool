# Backend Scripts

## Firebase / Firestore Seeds

| Script | Command | Description |
|--------|---------|-------------|
| **Full seed** | `npm run seed:firebase` | Reset Firestore + 50 users + subjects, grades, grade components, etc. |
| **Reset only** | `npm run seed:firebase:reset` | Drop all Firestore data, create 50 demo accounts |
| **Add modules** | `npm run seed:firebase:modules` | Add subjects, rooms, exams, grades, grade components (no reset) |

**Typical flow:** Run `seed:firebase` once to get a fresh demo. Use `seed:firebase:modules` to add more data without wiping users.

## Other

- `bootstrap:firebase` – Minimal bootstrap (school + admin/principal)
- `migrate:firebase` / `migrate:firebase:all` – Migrate from MongoDB
- `demo:auth` – Set demo auth passwords
- `seed` – MongoDB seed (legacy)
- `drop-db` / `reset-db` – MongoDB drop/reset (legacy)
