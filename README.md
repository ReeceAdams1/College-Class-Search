# College Class Search

Quick setup and run instructions

Prerequisites
- Node.js (v16+ recommended)
- Git

Backend
1. Install dependencies:
```powershell
cd backend
npm install
```
2. Start server:
```powershell
node server.js
```
The backend listens on `http://localhost:3001` by default.

Frontend
- Open `Website.html` in your browser (double-click or `start "" Website.html` on Windows).
- The frontend expects the backend at `http://localhost:3001`.

Git / Collaboration
- A `.gitignore` is present to exclude `node_modules/` and `.vs/`.
- To invite a collaborator (`daytonphan`): GitHub  Repository  Settings  Manage access  Invite a collaborator.

Notes
- Do not commit secrets. Use a `.env` for API keys and add it to `.gitignore`.
- If you want to shrink repo size, we can purge `node_modules/` and `.vs/` from history (this rewrites history and requires a force-push). Back up the repo first.

Contact
- If you want, I can add a `start` script to `backend/package.json`, create CI, or purge large files  tell me which.
