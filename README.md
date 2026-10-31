# BrewHub

BrewHub is a coffee ordering app for offices. Employees pick their company on a shared tablet (for example an iPad in the kitchen), find themselves in the employee list and order drinks. An admin manages companies, employees, products and orders, and exports a monthly Excel report showing what each employee ordered and what they owe.

## Features

**For employees**
- Choose your company and search for yourself by name or employee ID
- Order drinks (espresso, latte macchiato, hot chocolate, …) with quantities
- New employees can add themselves to their company's list

**For admins** (`/admin/login`)
- Add, edit and delete companies, employees and products
- View all orders, filter them by date, and change or remove items
- Export an Excel report with one sheet per company, showing each employee's drinks and total
- Delete orders older than 30 days

## Tech stack

| Part | Tech |
|---|---|
| Backend | Python, [FastAPI](https://fastapi.tiangolo.com/), Uvicorn |
| Database | [Supabase](https://supabase.com/) (Postgres) |
| Auth | JWT (`python-jose`) and bcrypt password hashing (`passlib`) for admin login |
| Reports | pandas + openpyxl (Excel export) |
| Frontend | React, TypeScript, [TanStack Start / Router](https://tanstack.com/), Vite |
| UI | Tailwind CSS, shadcn/ui (Radix UI), lucide icons |

## Folder structure

```
.
├── Backend/              FastAPI backend
│   ├── app/
│   │   ├── main.py       App entry point, CORS and router setup
│   │   ├── config.py     Reads settings from .env
│   │   ├── database.py   Supabase client
│   │   ├── auth/         JWT and password helpers
│   │   ├── middleware/   Auth middleware
│   │   ├── models/       Data models
│   │   ├── schemas/      Request/response schemas (Pydantic)
│   │   ├── routes/       API endpoints (/api/companies, /api/users, …)
│   │   └── services/     Database logic
│   └── requirements.txt
├── frontend/             React frontend
│   ├── src/
│   │   ├── routes/       Pages (home, employees, order, admin)
│   │   ├── components/   UI components
│   │   └── lib/api.ts    Calls to the backend
│   ├── public/           Images and company logos
│   └── package.json
└── start.bat             Starts backend and frontend together (Windows)
```

## Getting started

### Prerequisites

- Python 3.11 or newer
- Node.js 20 or newer (includes npm)
- A Supabase project with these tables: `companies`, `users`, `products`, `orders`, `order_items`, `admins`

### 1. Install dependencies

```bash
# Backend
pip install -r Backend/requirements.txt

# Frontend
cd frontend
npm install
```

### 2. Set up the `.env` files

Neither `.env` file is in the repo; you have to create both yourself. **Never commit them**, because they contain secret keys.

**`Backend/.env`**

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=your-supabase-service-role-key
JWT_SECRET=any-long-random-string
JWT_ALGORITHM=HS256
```

| Variable | What it is |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL (Supabase → Project Settings → API) |
| `SUPABASE_SERVICE_KEY` | The `service_role` key from the same page. Keep it on the backend only |
| `JWT_SECRET` | A secret used to sign admin login tokens. Use a long random string |
| `JWT_ALGORITHM` | The signing algorithm. `HS256` works |

**`frontend/.env`**

```env
VITE_API_BASE_URL=http://localhost:8000
```

| Variable | What it is |
|---|---|
| `VITE_API_BASE_URL` | The address of the backend. `start.bat` fills this in automatically with your computer's IP address |

### 3. Create an admin account

Admins log in with an email and password stored in the `admins` table. Store passwords as bcrypt hashes, never as plain text. To create a hash:

```bash
python -c "from passlib.context import CryptContext; print(CryptContext(schemes=['bcrypt']).hash('your-password'))"
```

Then add a row to the `admins` table with your `email` and the hash in the `password` column.

### 4. Run it

**On Windows**, double-click `start.bat` or run it from a terminal. It:
1. Finds your computer's Wi-Fi IP address and writes it to `frontend/.env`
2. Starts the backend on port `8000`
3. Starts the frontend on port `8080`
4. Prints the addresses to open, which work from any device on the same Wi-Fi, such as a tablet:
   - App: `http://<your-ip>:8080`
   - Admin: `http://<your-ip>:8080/admin/login`

**Manually**, or on macOS or Linux, use two terminals:

```bash
# Terminal 1 – backend
cd Backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 – frontend
cd frontend
npm run dev -- --host
```

Then open http://localhost:8080. Interactive API docs are at http://localhost:8000/docs.

## Team

- Jevin
- Namra
- Kshitij
- Jeel
- Milan
- Tushar
