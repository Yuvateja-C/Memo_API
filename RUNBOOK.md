# 📘 Runbook — Loan Underwriting Memo API

**Version:** 1.0.0
**Stack:** Python 3.9+ · FastAPI · Groq (LLaMA 3.1) · Pandas
**Last Updated:** May 2025

\---

## 📌 Table of Contents

* [Prerequisites](#prerequisites)
* [Local Setup](#local-setup)
* [Environment Variables](#environment-variables)
* [Running the Server](#running-the-server)
* [Production Deployment](#production-deployment)

  * [Deploy on Render](#deploy-on-render)
  * [Deploy on Railway](#deploy-on-railway)
  * [Deploy on Linux VPS / EC2](#deploy-on-linux-vps--ec2)
* [Updating Datasets](#updating-datasets)
* [Common Errors \& Fixes](#common-errors--fixes)
* [Health Check Procedure](#health-check-procedure)
* [Dependency Reference](#dependency-reference)

\---

## Prerequisites

|Tool|Minimum Version|How to Check|
|-|-|-|
|Python|3.9+|`python --version`|
|pip|21+|`pip --version`|
|Git|Any|`git --version`|
|Groq API Key|—|[console.groq.com](https://console.groq.com)|

\---

## Local Setup

### Step 1 — Clone the Repository

```bash
git clone https://github.com/<skillvancetechnologies-code>/loan-underwriting-memo-api.git
cd loan-underwriting-memo-api
```

\---

### Step 2 — Create a Virtual Environment

**macOS / Linux:**

```bash
python3 -m venv venv
source venv/bin/activate
```

**Windows:**

```bash
python -m venv venv
venv\\\\Scripts\\\\activate
```

You will see `(venv)` in your terminal prompt when the environment is active.

\---

### Step 3 — Install Dependencies

```bash
pip install -r requirements.txt
```

All required packages — including `python-dotenv` and `requests` — are listed in `requirements.txt`. A single command is all you need.

\---

### Step 4 — Set Up Environment Variables

```bash
cp .env.example .env
```

Open `.env` and replace the placeholder with your actual Groq API key:

```env
GROQ\\\_API\\\_KEY=your\\\_actual\\\_groq\\\_api\\\_key\\\_here
```

> 🔑 Get your free API key at \\\[console.groq.com](https://console.groq.com)
> ⚠️ `.env` is listed in `.gitignore` — it will never be committed to Git.

\---

### Step 5 — Verify Data Files Are Present

```bash
ls -lh \\\*.csv
```

Expected:

```
bureau\\\_data.csv
loan\\\_applications.csv
```

Both CSV files must be in the same directory as `memo\\\_api.py`. The application loads them at startup.

\---

## Environment Variables

|Variable|Required|Description|
|-|-|-|
|`GROQ\\\_API\\\_KEY`|✅ Yes|Groq cloud API key for LLaMA 3.1 inference|

> The application will \\\*\\\*refuse to start\\\*\\\* if `GROQ\\\_API\\\_KEY` is missing or empty. This is intentional fail-fast behaviour — it prevents silent failures during memo generation.

\---

## Running the Server

### Development (auto-reload on file changes)

```bash
uvicorn memo\\\_api:app --reload
```

|URL|Purpose|
|-|-|
|`http://127.0.0.1:8000`|API root (health check)|
|`http://127.0.0.1:8000/docs`|Swagger interactive documentation|
|`http://127.0.0.1:8000/redoc`|ReDoc documentation|

\---

### Custom Port

```bash
uvicorn memo\\\_api:app --reload --port 8080
```

\---

### Production Mode (multiple workers, no reload)

```bash
uvicorn memo\\\_api:app --host 0.0.0.0 --port 8000 --workers 2
```

\---

### Changing the LLM Model

Default model: `llama-3.1-8b-instant` (fastest, lowest latency, free tier).

To switch to a more capable model, update this line in `memo\\\_api.py`:

```python
model="llama-3.1-8b-instant",          # ← current (fast)
# model="llama-3.1-70b-versatile",     # ← higher quality, slower
```

> All available Groq models: \\\[console.groq.com/docs/models](https://console.groq.com/docs/models)

\---

### Changing Max Output Tokens

Default is `400` tokens. Increase for longer, more detailed underwriting reasons:

```python
max\\\_tokens=400,    # ← increase to 600–800 for longer memos
```

\---

## Production Deployment

### Deploy on Render

1. Push your repository to GitHub
2. Go to [render.com](https://render.com) → **New Web Service**
3. Connect your GitHub repository
4. Configure:

|Setting|Value|
|-|-|
|**Environment**|Python|
|**Build Command**|`pip install -r requirements.txt`|
|**Start Command**|`uvicorn memo\\\_api:app --host 0.0.0.0 --port 10000`|

5. Under **Environment Variables**, add `GROQ\\\_API\\\_KEY` with your actual key
6. Click **Deploy**

> ⚠️ Free tier spins down after inactivity. The first request after idle may take 30–60 seconds (cold start). Paid tier keeps it always-on.

\---

### Deploy on Railway

```bash
npm i -g @railway/cli
railway login
railway init
railway variables set GROQ\\\_API\\\_KEY=your\\\_key\\\_here
railway up
```

Railway auto-detects the Python runtime and runs `uvicorn` based on your start command.

\---

### Deploy on Linux VPS / EC2

```bash
# SSH into your server
ssh user@your-server-ip

# Clone the repo
git clone https://github.com/<YOUR-GITHUB-USERNAME>/loan-underwriting-memo-api.git
cd loan-underwriting-memo-api

# Install dependencies
pip3 install -r requirements.txt

# Create .env
cp .env.example .env
nano .env   # add your GROQ\\\_API\\\_KEY

# Run with gunicorn (production-grade ASGI server)
pip3 install gunicorn
gunicorn memo\\\_api:app -w 2 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

**Keep running after disconnect (use screen):**

```bash
screen -S memo\\\_api
gunicorn memo\\\_api:app -w 2 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
# Ctrl+A then D to detach
# screen -r memo\\\_api to reattach
```

\---

## Updating Datasets

The API loads both CSVs into memory at server startup. To update the data:

1. Replace the files in the project root — keep column names identical:

```bash
cp /path/to/new\\\_loan\\\_applications.csv ./loan\\\_applications.csv
cp /path/to/new\\\_bureau\\\_data.csv ./bureau\\\_data.csv
```

2. Restart the server:

```bash
# Stop current server (Ctrl+C), then:
uvicorn memo\\\_api:app --reload
```

> No database migration is required. Pandas loads both files fresh on every server start.

\---

## Common Errors \& Fixes

### ❌ `ValueError: GROQ\\\_API\\\_KEY is not set`

**Cause:** `.env` file is missing, empty, or `load\\\_dotenv()` is failing.

**Fix:**

1. Confirm `.env` exists in the project root: `ls -la .env`
2. Confirm it contains `GROQ\\\_API\\\_KEY=...` with no spaces around `=`
3. Confirm your virtual environment is active before running `uvicorn`

\---

### ❌ `AuthenticationError: Invalid API Key`

**Cause:** The Groq API key in `.env` is incorrect or revoked.

**Fix:**

1. Log in to [console.groq.com](https://console.groq.com) and generate a new key
2. Update `.env` with the new key
3. Restart the server

\---

### ❌ `Application ID 'APP-XXXXXX' not found`

**Cause:** The ID does not exist in the loaded CSV.

**Fix:**

* Valid IDs are `APP-000001` through `APP-015000`
* Check for leading/trailing spaces in the request body
* Confirm both CSV files loaded correctly at startup (check server logs)

\---

### ❌ `FileNotFoundError: loan\\\_applications.csv`

**Cause:** CSV files are not in the same directory as `memo\\\_api.py`.

**Fix:**

```bash
ls \\\*.csv   # confirm both CSVs exist in the project root
```

\---

### ❌ `ModuleNotFoundError: No module named 'dotenv'` or `'groq'`

**Cause:** Virtual environment is not active, or packages were not installed.

**Fix:**

```bash
source venv/bin/activate        # activate venv first
pip install -r requirements.txt
```

\---

### ❌ `uvicorn: command not found`

**Cause:** Uvicorn not installed or virtual environment not active.

**Fix:**

```bash
source venv/bin/activate
pip install uvicorn
```

\---

### ❌ External CreditSentinel API failing (console warning)

**Cause:** CreditSentinel service is down or unreachable.

**Impact:** Non-fatal. Memo generation continues without it. Console prints:

```
External score API failed (non-fatal): ...
```

**Action needed:** None. The API degrades gracefully by design.

\---

## Health Check Procedure

Run these four checks after every deployment or restart to confirm the service is fully operational:

### 1\. Server Reachable

```bash
curl http://127.0.0.1:8000/
# ✅ Expected: {"message":"API Working"}
```

### 2\. Low-Risk Application (APPROVE)

```bash
curl -X POST http://127.0.0.1:8000/api/memo \\\\
  -H "Content-Type: application/json" \\\\
  -d '{"application\\\_id": "APP-000001"}'
# ✅ Expected: risk\\\_level = "LOW", decision = "APPROVE"
```

### 3\. High-Risk Application (REJECT)

```bash
curl -X POST http://127.0.0.1:8000/api/memo \\\\
  -H "Content-Type: application/json" \\\\
  -d '{"application\\\_id": "APP-000004"}'
# ✅ Expected: risk\\\_level = "HIGH", decision = "REJECT"
```

### 4\. Invalid Application ID

```bash
curl -X POST http://127.0.0.1:8000/api/memo \\\\
  -H "Content-Type: application/json" \\\\
  -d '{"application\\\_id": "APP-999999"}'
# ✅ Expected: {"error": "Application ID 'APP-999999' not found"}
```

All four passing = service is healthy ✅

\---

## Dependency Reference

|Package|Version|Purpose|
|-|-|-|
|`fastapi`|Latest|REST API framework|
|`uvicorn`|Latest|ASGI server to run FastAPI|
|`pandas`|Latest|Load and merge CSV datasets at startup|
|`groq`|Latest|Groq Python SDK for LLaMA 3.1 inference|
|`python-multipart`|Latest|Required by FastAPI for form data support|
|`python-dotenv`|Latest|Loads `GROQ\\\_API\\\_KEY` from `.env` file|
|`requests`|Latest|HTTP client for CreditSentinel external API call|

\---

*For endpoint details, schemas, and code examples — see* [*API\_DOCUMENTATION.md*](API_DOCUMENTATION.md)*.*

