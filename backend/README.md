# Family Digital Vault — Backend

## Quick Start

```bash
cd backend
npm install
# Edit .env with your keys
npm start
```

## Environment Variables (`.env`)

| Variable | Description |
|---|---|
| `PORT` | Server port (default: 5000) |
| `JWT_SECRET` | Secret for signing JWTs (change before demo!) |
| `GROQ_API_KEY` | Your Groq API key |
| `GROQ_API_URL` | Groq chat completions endpoint |
| `GROQ_MODEL` | Optional Groq model override (default: `llama-3.3-70b-versatile`) |

## API Endpoints

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user (protected) |

### Documents
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/documents/upload` | Upload file (multipart/form-data, field: `file`) |
| GET | `/api/documents` | List documents (role-based) |
| GET | `/api/documents/:id` | Get single document |
| DELETE | `/api/documents/:id` | Delete document |

### Search
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/search?q=aadhaar` | AI-powered smart search |

## Role Logic
- **Admin** → sees all documents in the family group
- **Member** → sees only their own uploaded documents

## Notes
- Data is persisted in `db.json` with `users` and `documents` collections
- AI processing is **async** — upload responds instantly, AI fills metadata in background
- If Groq API fails, mock data is used automatically (no crash)
- Files stored in `/uploads/` folder (auto-created by multer)
