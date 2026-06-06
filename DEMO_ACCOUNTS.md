# Demo Accounts (50 total) – Aksara School Management

After running **reset + seed 50** you have exactly these accounts.

## Run reset + seed

```bash
cd backend
npm run reset:seed:50
```

Requires: `FIREBASE_PROJECT_ID` and `FIREBASE_SERVICE_ACCOUNT_PATH` (or `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY`) in `backend/.env`.

---

## Credentials (50 accounts)

| Role      | Count | Email pattern                    | Password     |
|-----------|-------|----------------------------------|--------------|
| SaaS Admin| 1     | `saas@cognifa.com`              | `saasadmin123` |
| Principal | 1     | `principal@smkdemodepok.sch.id` | `principal123` |
| Staff     | 4     | `staff1@smkdemodepok.sch.id` … `staff4@...` | `staff123` |
| Finance   | 4     | `finance1@smkdemodepok.sch.id` … `finance4@...` | `finance123` |
| Teacher   | 12    | `teacher1@...` … `teacher12@smkdemodepok.sch.id` | `teacher123` |
| Student   | 15    | `s0001@...` … `s0015@smkdemodepok.sch.id` | `student123` |
| Parent    | 13    | `parent0001@...` … `parent0013@smkdemodepok.sch.id` | `parent123` |

**Passwords:** `saasadmin123` | `principal123` | `staff123` | `finance123` | `teacher123` | `student123` | `parent123`

---

## Quick test

1. **SaaS:** `saas@cognifa.com` / `saasadmin123`
2. **School:** `principal@smkdemodepok.sch.id` / `principal123`
3. **Student:** `s0001@smkdemodepok.sch.id` / `student123`

---

**Security:** Demo only. Do not use in production.
