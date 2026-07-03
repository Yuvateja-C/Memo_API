# 📄 API Documentation — Loan Underwriting Memo API

**Version:** 1.0.0
**Base URL (local):** `http://127.0.0.1:8000`
**Base URL (production):** `https://<YOUR-DEPLOYMENT-URL>`
**Protocol:** HTTP / HTTPS
**Format:** JSON

---

## 📌 Table of Contents

- [Authentication](#authentication)
- [Base URL & Headers](#base-url--headers)
- [Endpoints](#endpoints)
  - [GET / — Health Check](#1-get----health-check)
  - [POST /api/memo — Generate Memo](#2-post-apimemo--generate-underwriting-memo)
- [Response Field Reference](#response-field-reference)
- [Error Responses](#error-responses)
- [HTTP Status Codes](#http-status-codes)
- [Risk Scoring Reference](#risk-scoring-reference)
- [Decision Logic Reference](#decision-logic-reference)
- [Rate Limiting](#rate-limiting)
- [Code Examples](#code-examples)
- [Example Scenarios](#example-scenarios)

---

## Authentication

This API currently does **not require authentication**. All endpoints are publicly accessible.

> ⚠️ Before exposing this service externally in production, add API key-based authentication or JWT middleware to the FastAPI app.

---

## Base URL & Headers

### Required Headers (all POST requests)

| Header | Value |
|---|---|
| `Content-Type` | `application/json` |

### CORS Policy

CORS is enabled for all origins (`*`). All HTTP methods and headers are permitted. This is intentional for development — restrict origins in production.

---

## Endpoints

---

### 1. `GET /` — Health Check

Verifies the API server is running and reachable.

**Request**

```http
GET /
```

**Response — 200 OK**

```json
{
  "message": "API Working"
}
```

**cURL**

```bash
curl http://127.0.0.1:8000/
```

---

### 2. `POST /api/memo` — Generate Underwriting Memo

The core endpoint. Accepts a loan `application_id`, merges applicant profile data with bureau data, computes a deterministic risk score, classifies the risk level, and uses LLaMA 3.1 via Groq to produce three professional underwriting reasons. Returns a complete structured memo JSON.

---

#### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| `application_id` | `string` | ✅ Yes | Application ID — format `APP-XXXXXX` (e.g. `APP-000001`). Valid range: `APP-000001` to `APP-015000`. |

**Example**

```json
{
  "application_id": "APP-000001"
}
```

---

#### Response — 200 OK

```json
{
  "application_id": "APP-000001",
  "applicant_name": "Rahul Yadav",
  "risk_level": "LOW",
  "risk_tier": "LOW",
  "risk_score": 0.6412,
  "decision": "APPROVE",
  "profile": "Applicant Rahul Yadav applied for a loan of ₹390000. Monthly income is ₹55107. Employment history shows 1.0 years of work experience.",
  "risk_assessment": "Overall application risk is classified as LOW. The evaluated risk score is 0.6412.",
  "credit_history": "Applicant has a CIBIL score of 706. Credit behavior analysis was included in underwriting evaluation.",
  "repayment_capacity": "FOIR recorded is 26.48. Income and obligation levels were evaluated to determine repayment capacity.",
  "risk_factors": "1. Strong CIBIL score indicates reliable credit repayment history. 2. Low FOIR suggests comfortable debt servicing capacity. 3. Stable income supports loan eligibility.",
  "recommendation": "Final underwriting recommendation: APPROVE",
  "generation_time_seconds": 0.843
}
```

---

## Response Field Reference

| Field | Type | Description |
|---|---|---|
| `application_id` | `string` | The application ID that was queried |
| `applicant_name` | `string` | Full name of the loan applicant |
| `risk_level` | `string` | Risk classification: `LOW`, `MEDIUM`, or `HIGH` |
| `risk_tier` | `string` | Alias of `risk_level` — retained for frontend compatibility |
| `risk_score` | `float` | Computed risk score (0.0–1.0). Higher score = lower risk |
| `decision` | `string` | Underwriting decision: `APPROVE`, `APPROVE WITH CONDITIONS`, or `REJECT` |
| `profile` | `string` | Narrative summary: loan amount, monthly income, employment experience |
| `risk_assessment` | `string` | Risk level classification and score summary |
| `credit_history` | `string` | CIBIL score and credit behaviour summary |
| `repayment_capacity` | `string` | FOIR and income obligation analysis summary |
| `risk_factors` | `string` | Three LLM-generated underwriting reasons (numbered 1–3 in a single string) |
| `recommendation` | `string` | Final recommendation sentence |
| `generation_time_seconds` | `float` | Groq LLM call duration in seconds (excludes data lookup time) |

---

## Error Responses

All application-level errors return HTTP `200` with an `"error"` key. This is by current design to maintain frontend compatibility.

### Application ID Not Found

```json
{
  "error": "Application ID 'APP-999999' not found"
}
```

### Internal Server Error (unhandled exception)

```json
{
  "error": "<exception message string>"
}
```

### Validation Error — 422 Unprocessable Entity

Returned automatically by FastAPI when the request body is malformed or missing required fields.

```json
{
  "detail": [
    {
      "loc": ["body", "application_id"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

---

## HTTP Status Codes

| Code | Meaning | When It Occurs |
|---|---|---|
| `200 OK` | Success | Memo generated, or application-level error returned in body |
| `422 Unprocessable Entity` | Validation error | Request body is missing required fields or has wrong types |
| `500 Internal Server Error` | Server crash | Unhandled exception outside the try/except block |

> **Note:** The Groq API key being missing or invalid will cause a `500` at server startup — the service will not start at all. This is intentional fail-fast behaviour.

---

## Risk Scoring Reference

Risk score formula (deterministic — no randomness):

```
cibil_component = (cibil_score - 300) / 600        # Normalised 0.0–1.0
foir_component  = (100 - foir) / 100                # Normalised 0.0–1.0

risk_score = (cibil_component × 0.55 + foir_component × 0.45) × 0.72
```

| Risk Score Range | Risk Level | Meaning |
|---|---|---|
| ≥ 0.70 | `LOW` | Strong applicant profile — low credit and income risk |
| 0.50 – 0.69 | `MEDIUM` | Acceptable profile with reservations |
| < 0.50 | `HIGH` | Significant credit or income risk |

---

## Decision Logic Reference

| Risk Level | Decision |
|---|---|
| `LOW` | `APPROVE` |
| `MEDIUM` | `APPROVE WITH CONDITIONS` |
| `HIGH` | `REJECT` |

---

## Rate Limiting

No rate limiting is enforced at the API level.

> ⚠️ Groq enforces rate limits based on your account plan. If you receive `429 Too Many Requests` from the LLM, refer to [Groq rate limit documentation](https://console.groq.com/docs/rate-limits). The free tier supports high enough throughput for development use.

---

## Code Examples

### cURL

```bash
curl -X POST http://127.0.0.1:8000/api/memo \
  -H "Content-Type: application/json" \
  -d '{"application_id": "APP-000001"}'
```

---

### Python (requests)

```python
import requests

response = requests.post(
    "http://127.0.0.1:8000/api/memo",
    json={"application_id": "APP-000001"}
)

data = response.json()
print(data["decision"])               # APPROVE
print(data["risk_level"])             # LOW
print(data["risk_score"])             # 0.6412
print(data["risk_factors"])           # 1. ... 2. ... 3. ...
```

---

### JavaScript (fetch)

```javascript
const response = await fetch("http://127.0.0.1:8000/api/memo", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ application_id: "APP-000001" })
});

const data = await response.json();
console.log(data.decision);           // APPROVE
console.log(data.risk_level);         // LOW
console.log(data.risk_score);         // 0.6412
```

---

### Axios (React / Node.js)

```javascript
import axios from "axios";

const { data } = await axios.post("http://127.0.0.1:8000/api/memo", {
  application_id: "APP-000001"
});

console.log(data.decision);           // APPROVE
```

---

## Example Scenarios

### Scenario 1 — APPROVE (Low Risk)

```bash
curl -X POST http://127.0.0.1:8000/api/memo \
  -H "Content-Type: application/json" \
  -d '{"application_id": "APP-000001"}'
```

```json
{
  "risk_level": "LOW",
  "risk_score": 0.6412,
  "decision": "APPROVE"
}
```

---

### Scenario 2 — REJECT (High Risk)

```bash
curl -X POST http://127.0.0.1:8000/api/memo \
  -H "Content-Type: application/json" \
  -d '{"application_id": "APP-000004"}'
```

```json
{
  "risk_level": "HIGH",
  "risk_score": 0.3891,
  "decision": "REJECT"
}
```

---

### Scenario 3 — Application ID Not Found

```bash
curl -X POST http://127.0.0.1:8000/api/memo \
  -H "Content-Type: application/json" \
  -d '{"application_id": "APP-999999"}'
```

```json
{
  "error": "Application ID 'APP-999999' not found"
}
```

---

### Scenario 4 — Missing Field (422)

```bash
curl -X POST http://127.0.0.1:8000/api/memo \
  -H "Content-Type: application/json" \
  -d '{}'
```

```json
{
  "detail": [
    {
      "loc": ["body", "application_id"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

---

*For setup, deployment, and configuration — see [RUNBOOK.md](RUNBOOK.md).*
