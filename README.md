# 🏦 Loan Underwriting Memo API

[Python](https://img.shields.io/badge/Python-3.9%2B-blue?logo=python)
[FastAPI](https://img.shields.io/badge/FastAPI-0.100%2B-009688?logo=fastapi)
[LLaMA](https://img.shields.io/badge/LLM-LLaMA%203.1-purple)
[Groq](https://img.shields.io/badge/Inference-Groq-orange)
[License](https://img.shields.io/badge/License-MIT-green)

> A microservice component of the Credit Lending Platform — generates AI-powered underwriting memos for loan applications using CIBIL scores, FOIR analysis, and openai/gpt-oss-20b via Groq.

\---

## 📌 Table of Contents

* [Overview](#overview)
* [Where This Fits in the Larger System](#where-this-fits-in-the-larger-system)
* [Features](#features)
* [Project Structure](#project-structure)
* [Dataset Description](#dataset-description)
* [How It Works](#how-it-works)
* [Risk Scoring Logic](#risk-scoring-logic)
* [Quick Start](#quick-start)
* [Documentation](#documentation)
* [Contributing](#contributing)
* [License](#license)

\---

## Overview

The **Loan Underwriting Memo API** automates the generation of structured credit underwriting memos for loan applications. It merges applicant profile data with credit bureau data, computes a deterministic risk score, and uses Groq-hosted LLaMA 3.1 to generate three professional underwriting reasons — all returned as a structured JSON memo in under one second.

Built for Indian fintech and NBFC workflows where speed, consistency, and explainable credit decisions are critical.

\---

## Where This Fits in the Larger System

This service is a **standalone backend microservice** within a broader credit lending platform. It exposes a single REST endpoint consumed by:

* **Frontend dashboards** — credit officers reviewing loan applications
* **CreditSentinel** — external credit scoring API (integrated, non-fatal fallback)
* **Orchestration layer** — upstream services that pass `application\\\\\\\_id` and consume the memo JSON

```

\\\\\\\[ Loan Application Portal ]

\&#x20;         │

\&#x20;         ▼

\\\\\\\[ Orchestration / Backend Gateway ]

\&#x20;         │

\&#x20;         ├──▶ \\\\\\\[ CreditSentinel Score API ]  ← external (optional)

\&#x20;         │

\&#x20;         └──▶ \\\\\\\[ Loan Underwriting Memo API ]  ← this service

\&#x20;                       │

\&#x20;                       ▼

\&#x20;              \\\\\\\[ Credit Officer Dashboard ]

```

\---

## Features

* ⚡ **Sub-second memo generation** — powered by Groq's `llama-3.1-8b-instant`
* 🧮 **Deterministic risk scoring** — weighted CIBIL + FOIR formula, no randomness in decisions
* 📋 **Structured 6-section output** — profile, risk assessment, credit history, repayment capacity, risk factors, recommendation
* 🔗 **Graceful external API integration** — CreditSentinel fallback, never crashes memo generation
* 🛡️ **CORS-enabled** — ready for any frontend or cross-origin integration
* 🔐 **Secure by default** — API key loaded from environment, never hardcoded
* 🗂️ **15,000+ loan records** — pre-loaded datasets across diverse Indian applicant profiles

\---

## Project Structure

```

loan-underwriting-memo-api/

│

├── memo\\\\\\\_api.py              # Main FastAPI application (fixed \\\\\\\& production-ready)

├── loan\\\\\\\_applications.csv    # Applicant profile dataset (15,000 records)

├── bureau\\\\\\\_data.csv          # Credit bureau dataset (CIBIL, debt, inquiries)

├── requirements.txt         # All Python dependencies

├── .env.example             # Environment variable template — copy to .env

├── .gitignore               # Excludes secrets, cache, virtual env from Git

├── LICENSE                  # MIT License

├── README.md                # This file

│

└── docs/

\&#x20;   ├── API\\\\\\\_DOCUMENTATION.md # Full endpoint reference, schemas, error codes

\&#x20;   └── RUNBOOK.md           # Setup, deployment, configuration, troubleshooting

```

\---

## Dataset Description

### `loan\\\\\\\_applications.csv`

Applicant-level loan application data — **15,000 records, 24 columns**.

|Column|Description|
|-|-|
|`application\\\\\\\_id`|Unique application ID (e.g. `APP-000001`)|
|`applicant\\\\\\\_name`|Full name of the applicant|
|`gender`|Male / Female|
|`age`|Age in years|
|`education`|Highest education level|
|`marital\\\\\\\_status`|Single / Married / Divorced|
|`dependents`|Number of financial dependents|
|`city` / `city\\\\\\\_tier`|City name and tier (Tier 1 / 2 / 3)|
|`employment\\\\\\\_type`|Salaried / Self-Employed / Business|
|`employer\\\\\\\_name`|Employer name or "Self-Employed"|
|`employment\\\\\\\_years`|Years of continuous work experience|
|`monthly\\\\\\\_income`|Gross monthly income (₹)|
|`existing\\\\\\\_monthly\\\\\\\_emi`|Current total EMI obligations (₹)|
|`num\\\\\\\_existing\\\\\\\_loans`|Number of active loans|
|`requested\\\\\\\_loan\\\\\\\_amount`|Loan amount requested (₹)|
|`requested\\\\\\\_tenure\\\\\\\_months`|Repayment period in months|
|`requested\\\\\\\_emi`|Proposed monthly EMI (₹)|
|`loan\\\\\\\_purpose`|Purpose (Home Renovation, Medical, Travel, etc.)|
|`foir`|Fixed Obligation to Income Ratio (%)|
|`application\\\\\\\_date`|Date application was submitted|
|`application\\\\\\\_hour`|Hour of submission (0–23)|
|`is\\\\\\\_night\\\\\\\_application`|1 if submitted between 10 PM–6 AM|
|`loan\\\\\\\_to\\\\\\\_income\\\\\\\_ratio`|Requested loan amount ÷ monthly income|

\---

### `bureau\\\\\\\_data.csv`

Credit bureau records per applicant — joined on `application\\\\\\\_id`.

|Column|Description|
|-|-|
|`application\\\\\\\_id`|Matches loan application record|
|`cibil\\\\\\\_score`|CIBIL credit score (300–900)|
|`num\\\\\\\_active\\\\\\\_loans`|Active loans reported at bureau level|
|`total\\\\\\\_outstanding\\\\\\\_debt`|Total outstanding debt (₹)|
|`credit\\\\\\\_utilization\\\\\\\_pct`|Credit utilisation percentage|
|`num\\\\\\\_credit\\\\\\\_inquiries\\\\\\\_30d`|Hard inquiries in the last 30 days|
|`num\\\\\\\_credit\\\\\\\_inquiries\\\\\\\_90d`|Hard inquiries in the last 90 days|
|`has\\\\\\\_previous\\\\\\\_default`|1 = has a recorded default|
|`days\\\\\\\_since\\\\\\\_last\\\\\\\_default`|Days since most recent default (0 if none)|
|`credit\\\\\\\_age\\\\\\\_months`|Age of oldest credit account in months|
|`num\\\\\\\_credit\\\\\\\_cards`|Number of credit cards held|

\---

## How It Works

```

POST /api/memo  →  { "application\\\\\\\_id": "APP-000001" }

\&#x20;       │

\&#x20;       ▼

\&#x20;  Merge loan\\\\\\\_applications + bureau\\\\\\\_data on application\\\\\\\_id

\&#x20;       │

\&#x20;       ▼

\&#x20;  Compute Risk Score  →  (CIBIL × 0.55 + FOIR × 0.45) × 0.72

\&#x20;       │

\&#x20;       ▼

\&#x20;  Classify Risk Level  →  LOW / MEDIUM / HIGH

\&#x20;       │

\&#x20;       ▼

\&#x20;  Build prompt  →  Call Groq LLaMA 3.1  →  Parse 3 underwriting reasons

\&#x20;       │

\&#x20;       ▼

\&#x20;  (Optional) Call CreditSentinel API  →  non-fatal fallback on failure

\&#x20;       │

\&#x20;       ▼

\&#x20;  Return structured 6-section memo JSON + decision

```

\---

## Risk Scoring Logic

```python

cibil\\\\\\\_component = (cibil\\\\\\\_score - 300) / 600      # Normalised 0–1

foir\\\\\\\_component  = (100 - foir) / 100              # Normalised 0–1



risk\\\\\\\_score = (cibil\\\\\\\_component \\\\\\\* 0.55 + foir\\\\\\\_component \\\\\\\* 0.45) \\\\\\\* 0.72

```

|Risk Score|Risk Level|Decision|
|-|-|-|
|≥ 0.70|🟢 LOW|APPROVE|
|0.50 – 0.69|🟡 MEDIUM|APPROVE WITH CONDITIONS|
|< 0.50|🔴 HIGH|REJECT|

\---

## Quick Start

```bash

\\# 1. Clone the repo

git clone https://github.com/<skillvancetechnologies-code>/loan-underwriting-memo-api.git

cd loan-underwriting-memo-api



\\# 2. Create and activate virtual environment

python -m venv venv

source venv/bin/activate          # macOS/Linux

venv\\\\\\\\Scripts\\\\\\\\activate             # Windows



\\# 3. Install all dependencies

pip install -r requirements.txt



\\# 4. Set up environment variables

cp .env.example .env

\\# Open .env and replace the placeholder with your actual Groq API key



\\# 5. Start the server

uvicorn memo\\\_api:app --reload

```

|URL|Purpose|
|-|-|
|`https://creditsentinel-kkg7.onrender.com`|API root|
|`https://creditsentinel-kkg7.onrender.com/docs`|Swagger interactive docs|
|`https://creditsentinel-kkg7.onrender.com/redoc`|ReDoc documentation|

\---

## Documentation

|Document|Description|
|-|-|
|[`docs/API\\\\\\\_DOCUMENTATION.md`](docs/API_DOCUMENTATION.md)|Full endpoint reference, request/response schemas, error codes, code examples|
|[`docs/RUNBOOK.md`](docs/RUNBOOK.md)|Installation, configuration, deployment (Render/Railway/VPS), troubleshooting|

\---

## Contributing

Pull requests are welcome. For major changes, please open an issue first.

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

\---

## License

This project is licensed under the [MIT License](LICENSE).

\---

> Part of the Credit Lending Platform · Built with FastAPI, Groq, and LLaMA 3.1
