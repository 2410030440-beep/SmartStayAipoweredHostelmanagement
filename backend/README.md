# SmartStay Backend

Phase 1 backend for SmartStay, built with FastAPI, SQLAlchemy, PostgreSQL, JWT authentication, and CORS.

## Project structure

- `app/main.py`: Creates the FastAPI app, configures CORS, registers routers, and exposes health endpoints.
- `app/core/config.py`: Loads settings from `.env`.
- `app/core/security.py`: Hashes passwords and creates/validates JWT access tokens.
- `app/database/connection.py`: Creates the SQLAlchemy engine and database-session dependency.
- `app/database/base.py`: Defines the SQLAlchemy declarative base.
- `app/models/user.py`: Defines the `users` table and `STUDENT`/`ADMIN` roles.
- `app/schemas/user.py`: Validates API request and response data.
- `app/services/auth_service.py`: Contains user lookup, registration, and login logic.
- `app/routers/auth.py`: Defines register, login, and current-user endpoints.

## Windows setup

Open PowerShell in the `backend` directory.

### 1. Create and activate a virtual environment

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
```

If PowerShell blocks activation, run this once in the same user account:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Command Prompt activation:

```bat
.venv\Scripts\activate
```

### 2. Install dependencies

```powershell
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### 3. Configure `.env`

Update `DATABASE_URL` with your PostgreSQL username, password, host, port, and database name. Replace `SECRET_KEY` with a long random value. The included `.env` is a local-development template and is ignored by Git.

Example:

```env
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/smartstay
SECRET_KEY=use-a-long-random-secret-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
FRONTEND_URL=http://localhost:5173
```

### 4. Create the PostgreSQL database

Make sure PostgreSQL is running, then use `psql`:

```powershell
psql -U postgres
```

Run:

```sql
CREATE DATABASE smartstay;
\q
```

You can also create it with a GUI such as pgAdmin. The database must match the name in `DATABASE_URL`.

### 5. Start FastAPI

```powershell
uvicorn app.main:app --reload
```

The API runs at `http://127.0.0.1:8000`.

Swagger documentation: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

## Phase 1 API testing

### Health endpoints

- `GET /` returns `{ "message": "SmartStay Backend is running" }`.
- `GET /api/health` returns `{ "status": "healthy" }`.

### Register

Use `POST /api/auth/register` with JSON:

```json
{
  "name": "Asha Student",
  "email": "asha@example.com",
  "password": "password123"
}
```

Public registration always creates a `STUDENT`. Use the explicit development admin seed command below for an admin account.

### Login

Use `POST /api/auth/login` as a form request. In Swagger, enter the email in the `username` field and enter the password in the `password` field. The response contains `access_token`, `token_type`, and basic user information.

### Current user

Call `GET /api/auth/me` with the login token. In Swagger, click **Authorize**, enter `Bearer <access_token>` when requested, and execute `/api/auth/me`.

## Real-time notifications

Notifications are persisted in PostgreSQL and delivered through the authenticated `/api/notifications/ws` WebSocket. The in-process connection manager is suitable for local development and a single Uvicorn worker. Deployments using multiple backend workers need shared messaging infrastructure such as Redis Pub/Sub so an event committed by one worker reaches connections owned by another worker.

## Development admin account

Public registration creates student accounts. To create one development admin account explicitly, open PowerShell in the `backend` directory and set the credentials for the current shell:

```powershell
$env:SMARTSTAY_ADMIN_EMAIL="admin@example.com"
$env:SMARTSTAY_ADMIN_PASSWORD="use-a-long-development-password"
python -m scripts.seed_admin
```

The command validates both variables, hashes the password with the existing authentication implementation, and creates the account with the `ADMIN` role. It never prints the password. If an account already exists for the email, it reports that no changes were made and does not create a duplicate or change the existing account.

No Kafka, AI/ML, payment gateway, Docker configuration, or future feature modules are included in this phase.
