# Cognifa — Continue on MacBook

Use this checklist when moving from Windows to macOS. **Code syncs via Git; secrets and env files do not.**

## Before you leave Windows

1. **Commit and push** (from project root in PowerShell):
   ```powershell
   git status
   git add -A
   git commit -m "WIP: handoff to Mac"
   git push origin main
   ```
2. **Nested repo `aksara-framework/`** has local changes. Either commit inside that folder and push its remote, or ignore if you only use `packages/` (main app uses `packages/*`, not `aksara-framework/`).
3. **Copy these files securely** (USB, AirDrop, password manager, encrypted zip — never commit):
   - `frontend/.env.local`
   - `backend/.env` (if you use backend seed scripts)
   - `cognifa-16209-firebase-adminsdk-*.json` (project root or `frontend/` — match paths in your env)
4. Optional: copy `RELEASE-NOTES-2025-03-07.md` if you want it on Mac (currently untracked).

## On MacBook — first-time setup

### Prerequisites

```bash
# Node 20 (repo has .nvmrc)
brew install nvm   # or use fnm / volta
cd ~/path/to/cognifa   # after clone
nvm install
nvm use

node -v   # should be v20.x
```

### Clone

```bash
git clone https://github.com/aksaraworld/cognifa.git
cd cognifa
git checkout main
git pull
```

If `aksara-framework/` is empty after clone, it is a git submodule pointer — run:

```bash
git submodule update --init --recursive
```

(If that fails, the folder may be optional; development uses `packages/`.)

### Install dependencies

```bash
npm run install:all
chmod +x build-packages.sh
./build-packages.sh
```

### Environment files

```bash
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
```

Paste values from your Windows copies (or Firebase Console). See [FIREBASE_CONNECT.md](./FIREBASE_CONNECT.md) and [frontend/LOCAL_LOGIN_SETUP.md](./frontend/LOCAL_LOGIN_SETUP.md).

**Typical layout:**

| File | Purpose |
|------|---------|
| `frontend/.env.local` | `NEXT_PUBLIC_FIREBASE_*`, `FIREBASE_PROJECT_ID`, `FIREBASE_SERVICE_ACCOUNT_PATH` |
| `backend/.env` | Same Firebase Admin vars for `npm run seed:firebase` |
| `cognifa-16209-firebase-adminsdk-*.json` | Service account key (gitignored) |

Path example if JSON is at repo root:

```env
FIREBASE_SERVICE_ACCOUNT_PATH=../cognifa-16209-firebase-adminsdk-fbsvc-47ae77c666.json
```

(relative to `frontend/` when Next.js runs)

### Run locally

```bash
npm run dev
```

- Frontend: http://localhost:3000  
- Demo logins: [DEMO_ACCOUNTS.md](./DEMO_ACCOUNTS.md) (e.g. `saas@cognifa.com` / `saasadmin123`)

### Reseed Firestore (optional)

```bash
cd backend
npm run seed:firebase
```

Requires `backend/.env` + service account JSON.

## Cursor on Mac

1. **File → Open Folder** → select the `cognifa` repo root (not only `frontend/`).
2. Project rule **`.cursor/rules/cognifa-project.mdc`** loads automatically — tells the agent about stack, paths, and Mac commands.
3. In chat, you can say: *“Read MAC_HANDOFF.md and continue where I left off.”*

## Mac vs Windows commands

| Task | Windows | macOS |
|------|---------|--------|
| Build packages | `.\build-packages.ps1` | `./build-packages.sh` |
| Dev servers | `npm run dev` | `npm run dev` |
| Stop server | Ctrl+C | Ctrl+C |

## Repo reference

| Item | Value |
|------|--------|
| GitHub | https://github.com/aksaraworld/cognifa.git |
| Branch | `main` |
| Firebase project | `cognifa-16209` |
| Node | 20.x (`.nvmrc`) |

## Key docs

- [README.md](./README.md) — features & quick start  
- [SETUP_AKSARA.md](./SETUP_AKSARA.md) — build `packages/*`  
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)  
- [DEMO_ACCOUNTS.md](./DEMO_ACCOUNTS.md)  
- [VERCEL_SETUP.md](./VERCEL_SETUP.md) — production deploy  

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Login 500 / auth/me fails | Set `FIREBASE_SERVICE_ACCOUNT_PATH` in `frontend/.env.local`; restart `npm run dev` |
| Module `@aksara/*` not found | Run `./build-packages.sh` from repo root |
| Wrong Node version | `nvm use` in repo root (reads `.nvmrc`) |
| Empty Firestore | `cd backend && npm run seed:firebase` |
