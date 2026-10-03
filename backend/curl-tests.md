# SQL Injection Lab: Login - Curl Tests

This document contains curl commands to verify the endpoints of the SQL Injection Lab backend.

Base URL: `http://localhost:3000`

---

### Test 1: Valid credentials (vulnerable mode)
- **Input**: `admin` + `Adm!n@123` (`mode: "vulnerable"`)
- **Expected Result**: `success: true`, `status: "normal"`, `rows: 1`

```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Adm!n@123","mode":"vulnerable"}'
```

**Expected JSON Response:**
```json
{
  "success": true,
  "sql": "SELECT * FROM users WHERE username='admin' AND password='Adm!n@123'",
  "rows": [
    {
      "id": 1,
      "username": "admin",
      "role": "admin"
    }
  ],
  "status": "normal",
  "message": "Logged in as admin"
}
```

---

### Test 2: Invalid credentials (vulnerable mode)
- **Input**: `admin` + `wrong` (`mode: "vulnerable"`)
- **Expected Result**: `success: false`, `status: "normal"`, `rows: 0`

```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"wrong","mode":"vulnerable"}'
```

**Expected JSON Response:**
```json
{
  "success": false,
  "sql": "SELECT * FROM users WHERE username='admin' AND password='wrong'",
  "rows": [],
  "status": "normal",
  "message": "Invalid credentials"
}
```

---

### Test 3: SQL Injection - Authentication Bypass with Specific User (vulnerable mode)
- **Input**: `admin'--` + `anything` (`mode: "vulnerable"`)
- **Expected Result**: `success: true`, `status: "vulnerable-bypass"`, `rows: 1`


```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"admin'--\",\"password\":\"anything\",\"mode\":\"vulnerable\"}"
```

**Expected JSON Response:**
```json
{
  "success": true,
  "sql": "SELECT * FROM users WHERE username='admin'--' AND password='anything'",
  "rows": [
    {
      "id": 1,
      "username": "admin",
      "role": "admin"
    }
  ],
  "status": "vulnerable-bypass",
  "message": "Logged in as admin"
}
```

---

### Test 4: SQL Injection - Tautology Bypass (vulnerable mode)
- **Input**: `' OR 1=1--` + `anything` (`mode: "vulnerable"`)
- **Expected Result**: `success: true`, `status: "vulnerable-bypass"`, `rows: 3`

```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"' OR 1=1--\",\"password\":\"anything\",\"mode\":\"vulnerable\"}"
```

**Expected JSON Response:**
```json
{
  "success": true,
  "sql": "SELECT * FROM users WHERE username='' OR 1=1--' AND password='anything'",
  "rows": [
    {
      "id": 1,
      "username": "admin",
      "role": "admin"
    },
    {
      "id": 2,
      "username": "student1",
      "role": "student"
    },
    {
      "id": 3,
      "username": "student2",
      "role": "student"
    }
  ],
  "status": "vulnerable-bypass",
  "message": "Logged in as admin"
}
```

---

### Test 5: SQL Syntax Error via Single Quote (vulnerable mode)
- **Input**: `'` + `password` (`mode: "vulnerable"`)
- **Expected Result**: `success: false`, `status: "error"`

```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"'\",\"password\":\"anything\",\"mode\":\"vulnerable\"}"
```

**Expected JSON Response:**
```json
{
  "success": false,
  "sql": "SELECT * FROM users WHERE username='' AND password='anything'",
  "rows": [],
  "status": "error",
  "message": "syntax error at or near \"anything\""
}
```

---

### Test 6: SQL Injection Attempt on Secure Mode (Blocked)
- **Input**: `admin'--` + `anything` (`mode: "secure"`)
- **Expected Result**: `success: false`, `status: "blocked"`, `rows: 0`

```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"admin'--\",\"password\":\"anything\",\"mode\":\"secure\"}"
```

**Expected JSON Response:**
```json
{
  "success": false,
  "sql": "SELECT * FROM users WHERE username=$1 AND password=$2",
  "rows": [],
  "status": "blocked",
  "message": "Invalid credentials"
}
```

---

### Test 7: Tautology Attempt on Secure Mode (Blocked)
- **Input**: `' OR 1=1--` + `anything` (`mode: "secure"`)
- **Expected Result**: `success: false`, `status: "blocked"`, `rows: 0`

```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"' OR 1=1--\",\"password\":\"anything\",\"mode\":\"secure\"}"
```

**Expected JSON Response:**
```json
{
  "success": false,
  "sql": "SELECT * FROM users WHERE username=$1 AND password=$2",
  "rows": [],
  "status": "blocked",
  "message": "Invalid credentials"
}
```

---

### Test 8: Valid credentials (secure mode)
- **Input**: `admin` + `Adm!n@123` (`mode: "secure"`)
- **Expected Result**: `success: true`, `status: "normal"`, `rows: 1`

```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Adm!n@123","mode":"secure"}'
```

**Expected JSON Response:**
```json
{
  "success": true,
  "sql": "SELECT * FROM users WHERE username=$1 AND password=$2",
  "rows": [
    {
      "id": 1,
      "username": "admin",
      "role": "admin"
    }
  ],
  "status": "normal",
  "message": "Logged in as admin"
}
```

---

### Test 9: Activity Logs and Lab Reset
- **Step A**: Retrieve activity logs with `GET /api/logs`
- **Step B**: Reset database and activity logs with `POST /api/reset`
- **Step C**: Retrieve activity logs again to verify they are empty `[]`

```bash
# Step A: View activity logs
curl -X GET http://localhost:3000/api/logs

# Step B: Reset lab database and in-memory logs
curl -X POST http://localhost:3000/api/reset

# Step C: Verify activity logs are now empty
curl -X GET http://localhost:3000/api/logs
```

**Expected Step B Response:**
```json
{
  "message": "Lab reset"
}
```

**Expected Step C Response:**
```json
[]
```
