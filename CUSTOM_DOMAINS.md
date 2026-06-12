# School domains on kithome.id

## Two apps, one parent domain

| URL | App | Vercel project |
|-----|-----|----------------|
| [kithome.id](https://kithome.id) | **KitHome** (property SaaS) | KitHome project — **do not touch** |
| [kitschool.vercel.app](https://kitschool.vercel.app) | **Kitschool platform / SaaS admin** | `kitschool-frontend` |
| `al-um.kithome.id` | **School tenant** (landing + portal) | `kitschool-frontend` |

**Do not add `kithome.id` apex to the Kitschool Vercel project.** Apex DNS stays on KitHome.

School subdomains are added **one-by-one** to Kitschool (no wildcard needed).

---

# Vercel checklist (Kitschool project only)

Project: **`kitschool-frontend`** → Settings → Domains

### ✅ Add (per school)

```
al-um.kithome.id
```

Type exactly — no `https://`, no `*.`

### ❌ Do NOT add to Kitschool

| Domain | Reason |
|--------|--------|
| `kithome.id` | Already on KitHome property app |
| `www.kithome.id` | KitHome |
| `*.kithome.id` | Not needed; add each school subdomain individually |

---

## DNS — now on Vercel (Domainesia disabled) ✅

If nameservers are already `ns1.vercel-dns.com` / `ns2.vercel-dns.com`, **Domainesia DNS panel will not work** — that is normal. Manage everything in Vercel.

### Option A — easiest (recommended)

1. Open **kitschool-frontend** → **Settings → Domains**
2. Add: `al-um.kithome.id`
3. If `kithome.id` zone is on the **same Vercel team**, Vercel usually **auto-creates** the DNS record
4. Wait for **Valid Configuration** (green)

### Option B — manual DNS in Vercel

1. [vercel.com/dashboard](https://vercel.com/dashboard) → **Domains** (left sidebar, team level)
2. Click **`kithome.id`**
3. Open **DNS Records** (or Advanced → Vercel DNS)
4. **Add record**:

| Type | Name | Value |
|------|------|-------|
| `CNAME` | `al-um` | `cname.vercel-dns.com` |

> Name is just `al-um` — not `al-um.kithome.id`

5. Then add `al-um.kithome.id` to **kitschool-frontend** → Domains (if not already)

### CLI alternative

```bash
vercel dns add kithome.id al-um CNAME cname.vercel-dns.com
```

### What NOT to change

| Record | Points to | Touch? |
|--------|-----------|--------|
| `@` / apex `kithome.id` | KitHome project | **No** |
| `www` | KitHome | **No** |
| `al-um` | Kitschool | Add this only |

Propagation: usually 1–5 min on Vercel DNS, up to 24h worst case. Check: [DNS Checker](https://dnschecker.org).

Docs: [Managing DNS Records on Vercel](https://vercel.com/docs/domains/managing-dns-records)

---

## Vercel environment variables

**kitschool-frontend** → Settings → Environment Variables → **Production** → **Redeploy**

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SCHOOL_DOMAIN_BASE` | `kithome.id` |
| `NEXT_PUBLIC_PLATFORM_URL` | `https://kitschool.vercel.app` |

Do **not** set `NEXT_PUBLIC_PLATFORM_HOSTS` to `kithome.id`.

Optional local `frontend/.env.local`:

```env
NEXT_PUBLIC_SCHOOL_DOMAIN_BASE=kithome.id
NEXT_PUBLIC_PLATFORM_URL=https://kitschool.vercel.app
```

---

## Firebase Authorized Domains

Firebase Console → Authentication → Settings → Authorized domains

| Domain | Add? |
|--------|------|
| `kitschool.vercel.app` | ✓ (platform login) |
| `al-um.kithome.id` | ✓ (school login) |
| `kithome.id` | ✗ (KitHome app, not Kitschool) |

Add each new school subdomain when onboarding (`sma-x.kithome.id`, etc.).

---

## School config in app

SaaS → Schools → Edit:

| Field | PPST example |
|-------|----------------|
| Subdomain | `al-um` |
| Landing slug | `ppst-alum` |
| Landing enabled | ✓ |

---

## Firestore indexes

```bash
firebase deploy --only firestore:indexes --project kitschool-b86dd
```

---

## Two logins

| URL | Who | Branding |
|-----|-----|----------|
| [kitschool.vercel.app/login](https://kitschool.vercel.app/login) | Internal Kitschool team (SaaS admin) | Kitschool logo + "Portal Admin Kitschool" |
| [al-um.kithome.id/login](https://al-um.kithome.id/login) | PPST staff, parents, students | PPST logo + "Portal PPST Al UM" |
| [al-um.kithome.id](https://al-um.kithome.id) | Public | PPST Al UM dummy landing (hero, programs, CTA) |
| [kitschool.vercel.app/school/ppst-alum](https://kitschool.vercel.app/school/ppst-alum) | Preview | Same landing on platform URL |

SaaS admin logging in on `al-um.kithome.id` → redirected to `kitschool.vercel.app/saas/dashboard`.

---

## Verify

| URL | Expected |
|-----|----------|
| [kithome.id](https://kithome.id) | KitHome property app (unchanged) |
| [kitschool.vercel.app/saas/dashboard](https://kitschool.vercel.app/saas/dashboard) | Kitschool SaaS admin |
| `https://al-um.kithome.id` | PPST landing page |
| `https://al-um.kithome.id/login` | PPST-branded login → `/dashboard` on same host |
| `https://al-um.kithome.id/saas/dashboard` | Redirects to `kitschool.vercel.app/saas/dashboard` |

---

## Reserved subdomains on kithome.id

Schools cannot use: `www`, `app`, `admin`, `api`, `mail`, `staging`, `dev`, `cdn`

---

## Local dev

Subdomain routing does not run on `localhost`. Preview landing:

`http://localhost:3000/school/ppst-alum`

Requires `FIREBASE_PROJECT_ID=kitschool-b86dd` in `frontend/.env.local`. Firebase Admin can use:

- Service account JSON (`FIREBASE_SERVICE_ACCOUNT_PATH`), or
- `gcloud auth application-default login`

If Firestore is unreachable, dev mode serves dummy PPST data for slug `ppst-alum`.
