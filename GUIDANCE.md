# Guidance: Demonstrate SQL Injection

## Experiment

**Title:** Demonstrate SQL Injection

## Aim

To demonstrate how SQL Injection can occur when user input is directly concatenated into SQL queries across both authentication routines and business logic filters, and to show how parameterized queries prevent user input from modifying SQL structure or logic.

## Objectives

After completing this lab, you should be able to:

- Explain what SQL Injection is and why it occurs.
- Identify the structural and security differences between Vulnerable mode and Secure mode.
- Observe how injected user input alters the logical syntax of an SQL query.
- Explain why `admin'--` bypasses the password condition in an authentication query.
- Explain why `' OR 1=1--` can return all rows in both user and product queries.
- Explain how the comment token (`--`) truncates business logic conditions such as `AND released = 1`, leaking unreleased prototype products.
- Compare targeted WHERE clause manipulation (`' OR category = 'Gifts'--`) with global tautology attacks.
- Explain how parameterized queries treat user input strictly as plain data ($1, $2) rather than executable SQL code.
- Use the Query visualizer, Activity log, and Store product cards to inspect and verify database request flows.

> **Safety:** This is a local educational lab running dummy data in Docker. Do not use these techniques against systems, websites, or databases that you do not own or do not have explicit authorization to test.

---

# Part 1: Authentication Bypass Lab (Login)

---

# Task 1: Start the lab

1. Open Docker Desktop.
2. Wait until the Docker engine is running.
3. Open the project in VS Code.
4. Open the terminal.
5. Make sure you are in the project folder:
   ```bash
   cd Css_sql_injection
   ```
6. Run:

```bash
docker compose up --build
```

7. Wait until the server outputs:
   ```text
   Server listening on http://0.0.0.0:3000
   ```
8. Open your browser and navigate to:

```text
http://localhost:3000
```

### Expected result

The **SQL injection: login** page opens.

---

# Task 2: Perform a Normal Login

<img width="922" height="912" alt="image" src="https://github.com/user-attachments/assets/f9490b41-564c-4a28-b023-ed5ce46441aa" />

1. Select **Vulnerable mode**.
2. Click **Normal login** (fills `Username: admin` and `Password: Adm!n@123`).
3. Click **Log in**.

### Expected result

You should see:

- **Login successful**
- Logged in as `admin` (`admin`)
- **1 row**
- Green **Normal behaviour** badge
- An **Enter Shop Now →** button appears to access the shop lab.

The SQL should look like:

```sql
SELECT * FROM users WHERE username='admin' AND password='Adm!n@123'
```

### What happened?

The username and password were placed directly into the SQL query string. Because they are legitimate values, the query checks the database for a row matching both the username and password.

---

# Task 3: Bypass the login with `admin'--`

<img width="942" height="906" alt="image" src="https://github.com/user-attachments/assets/e8694b27-a8c3-4830-97c7-e4f79321bfd0" />

1. Stay in **Vulnerable mode**.
2. Click **admin'--** (fills `Username: admin'--` and `Password: anything`).
3. Click **Log in**.

### Expected result

You should see:

- **Login successful**
- Logged in as `admin`
- Red **Injection worked: bypassed password** badge
- **1 row**

The query should look similar to:

```sql
SELECT * FROM users WHERE username='admin'--' AND password='anything'
```

### What happened?

The input contains:

```text
'
```

The single quote closes the username string literal early.

The input also contains:

```text
--
```

In SQL, `--` marks the remainder of the line as a comment. Therefore, the password condition `AND password='anything'` is completely ignored by the database engine. The database checks only `WHERE username='admin'`, allowing an authentication bypass without the correct password.

---

# Task 4: Return multiple users with `' OR 1=1--`

<img width="932" height="902" alt="image" src="https://github.com/user-attachments/assets/e5db42c1-3907-4cb1-81f8-e4d53700aa37" />

1. Stay in **Vulnerable mode**.
2. Click **' OR 1=1--** (fills `Username: ' OR 1=1--` and `Password: anything`).
3. Click **Log in**.

### Expected result

You should see:

- **Login successful**
- Red **Injection worked: bypassed password** badge
- **3 rows** (displays `admin (admin), student1 (student), student2 (student)`)

The query should look similar to:

```sql
SELECT * FROM users WHERE username='' OR 1=1--' AND password='anything'
```

### What happened?

The condition `1=1` is a mathematical tautology (always evaluates to `TRUE`). The comment token `--` strips out the remaining password check. Because the `WHERE` clause evaluates to `TRUE` for every row, all user records in the table are returned.

---

# Task 5: Observe a SQL syntax error

<img width="946" height="906" alt="image" src="https://github.com/user-attachments/assets/14ddecfc-75e9-4764-a291-8f6e6c9ec971" />

1. Stay in **Vulnerable mode**.
2. Enter only a single quote:

```text
'
```

as the username. 3. Enter any value as the password. 4. Click **Log in**.

### Expected result

The database rejects the malformed SQL and the page shows an error message.

### What happened?

The single quote broke the SQL syntax by leaving an unclosed string literal. Because user input was concatenated directly into executable code, an unmatched quote breaks the parser. This proves that user input directly alters query syntax.

---

# Task 6: Repeat the attack in Secure mode

<img width="941" height="905" alt="image" src="https://github.com/user-attachments/assets/569314ba-8b09-4561-894a-ec28326fb4c8" />

## Test `admin'--`

1. Select **Secure mode**.
2. Click **admin'--**.
3. Click **Log in**.

### Expected result

You should see:

- **Login failed**
- **0 rows**
- Teal **Input treated as plain text** badge
- SQL query displayed as:

```sql
SELECT * FROM users WHERE username=$1 AND password=$2
```

The values are displayed separately as parameters `$1` and `$2`.

### What happened?

Secure mode does not join user input into the SQL command text. The SQL query structure remains fixed with placeholders (`$1`, `$2`). The database engine treats `admin'--` strictly as literal string characters, searching for a user whose literal username contains single quotes and dashes. Since no such user exists, login fails safely.

---

## Test `' OR 1=1--`

1. Stay in **Secure mode**.
2. Click **' OR 1=1--**.
3. Click **Log in**.

### Expected result

- **Login failed**
- **0 rows**
- Input treated as plain text badge
- Values bound as parameters `$1` and `$2`

### What happened?

The entire string `' OR 1=1--` is treated as a literal username. The keywords `OR` and symbols `'` and `--` have no syntactic power, demonstrating why parameterized queries provide complete immunity against SQL injection.

---

# Task 7: Observe the safety guard

<img width="917" height="907" alt="image" src="https://github.com/user-attachments/assets/30b89c81-1de4-4b12-a9e4-d69c4f5cbde5" />

1. Select **Vulnerable mode**.
2. Enter:

```text
'; DROP TABLE users;--
```

as the username. 3. Enter any value as the password. 4. Click **Log in**.

### Expected result

The lab's safety guard intercepts the request and blocks it before execution because stacked queries (semicolons) are disallowed.

5. Immediately click **Normal login** and log in again to confirm the database remains intact.

---

# Task 8: Observe the Query visualizer

<img width="935" height="387" alt="image" src="https://github.com/user-attachments/assets/203788a1-7c69-48a7-aaaf-ee1c4eb23b73" />

Look at the **Query visualizer** below the login form:

1. **Your input** — displays the exact characters typed.
2. **SQL sent** — displays the query constructed by the backend.
3. **Database** — displays row matching and database-level evaluation.
4. **Result** — provides a clear pedagogical explanation of the outcome.

---

# Task 9: Check the Activity log

<img width="921" height="552" alt="image" src="https://github.com/user-attachments/assets/72c6bb01-ca00-4923-9526-94d7a773d719" />

1. Scroll down to the **Activity log**.
2. Observe the chronological records of all login attempts with timestamps, modes, usernames, and executed SQL.
3. Refresh the browser page (`Ctrl+F5`) to verify that log history persists from the server.

---

# Task 10: Reset the Login Lab

<img width="962" height="885" alt="image" src="https://github.com/user-attachments/assets/3c5edd0f-baa4-426e-9705-0fbbccf4030c" />

1. Click **Reset lab**.
2. Confirm that the visualizer returns to its empty state and the activity log resets.

---

# Part 2: Product Category Filter Lab (Shop)

This module demonstrates how SQL injection can bypass business logic filters (`WHERE released = 1`) to reveal confidential, unreleased prototype products.

---

# Task 11: Navigate to the Shop and Browse Normally

1. Perform a successful login on `http://localhost:3000` (e.g. using `admin` / `Adm!n@123` or `admin'--`).
2. Click the **Enter Shop Now →** button (or navigate to `http://localhost:3000/shop.html`).
3. Verify that **Vulnerable mode** is selected.
4. Click the **🎁 Gifts** quick category button (or type `Gifts` into the category input) and click **Filter**.

### Expected result

- **Header:** Logged in as: **admin (admin)**.
- **Filter result & SQL panel:**
  - Status: **Query executed successfully**
  - Badge: **Normal behaviour**
  - Filter input: `Gifts`
  - Products returned: **2 products (0 unreleased)**
- **Query sent to database:**
  ```sql
  SELECT * FROM products WHERE category = 'Gifts' AND released = 1
  ```
- **Query analysis & mechanics:**
  - _Standard Category Filter:_ Executing `category = 'Gifts' AND released = 1`.
  - _Hidden Items Protected:_ Unreleased prototypes in Gifts remain hidden.
- **Store products grid:**
  - _Novelty Hacker Mug_ ($14.99) — Released
  - _Cybersecurity Sticker Pack_ ($6.50) — Released

---

# Task 12: Leak Hidden Category Prototype with `Gifts'--`

1. Stay in **Vulnerable mode**.
2. In the "Example injection inputs" section, click the **`Gifts'--`** button.
3. The URL parameter field updates to:
   ```text
   /filter?category= Gifts'--
   ```
4. Click **Filter** (or press Enter).

### Expected result

- **Filter result & SQL panel:**
  - Headline: **Injection successful: unreleased items leaked!**
  - Badge: **Injection worked: unreleased products revealed**
  - Products returned: **3 products (1 unreleased)**
- **Warning Banner above Store products:**
  ```text
  ⚠️ SQL INJECTION WARNING: 1 hidden/unreleased prototype product(s) are visible because the query logic was bypassed!
  ```
- **Query sent to database:**
  ```sql
  SELECT * FROM products WHERE category = 'Gifts'--' AND released = 1
  ```
- **Query analysis & mechanics:**
  - _Query Logic Bypassed:_ User input was concatenated directly into executable SQL text.
  - _Release Filter Truncated:_ The SQL comment token (`--`) truncated `AND released = 1`, exposing 1 unreleased prototype.
  - _Active Scope: Gifts:_ Results are scoped to category Gifts.
- **Store products grid:**
  - Novelty Hacker Mug ($14.99) [Released]
  - Cybersecurity Sticker Pack ($6.50) [Released]
  - **Encrypted Hardware Vault (Prototype)** ($89.00) — displayed in a pink container with a red dashed border, lock icon, and badge **UNRELEASED (Hidden)**.

### What happened?

In Vulnerable mode, the backend constructs:

```javascript
const sql = `SELECT * FROM products WHERE category = '${category}' AND released = 1`;
```

By submitting `Gifts'--`, the query executed by PostgreSQL becomes:

```sql
SELECT * FROM products WHERE category = 'Gifts'--' AND released = 1
```

The quote (`'`) terminates the literal category value, and the comment (`--`) instructs PostgreSQL to ignore the rest of the command line. The condition `AND released = 1` is discarded, allowing unreleased prototypes with `released = 0` to be retrieved.

---

# Task 13: Solve the Lab with `' OR category = 'Gifts'--`

1. Stay in **Vulnerable mode**.
2. Click the example injection button:
   ```text
   ' OR category = 'Gifts'--
   ```
3. Click **Filter**.

### Expected result

- **PortSwigger-Style Lab Solved Celebration Banner:**
  > **SOLVED — Congratulations, you solved the lab!** You successfully retrieved unreleased product data using SQL injection.
- **Headline:** Injection successful: unreleased items leaked!
- **Products returned:** **3 products (1 unreleased)**
- **Query sent to database:**
  ```sql
  SELECT * FROM products WHERE category = '' OR category = 'Gifts'--' AND released = 1
  ```
- **Store products grid:** Leaks the _Encrypted Hardware Vault (Prototype)_.

### What happened?

This payload demonstrates targeted logic injection. The first quote closes the initial empty category filter (`category = ''`), followed by an alternate condition `OR category = 'Gifts'`. The comment `--` removes the `AND released = 1` filter. The database returns all items matching the category `Gifts` regardless of whether they have been released to the public.

---

# Task 14: Global Tautology Bypass with `' OR 1=1--`

1. Stay in **Vulnerable mode**.
2. Click the example injection button:
   ```text
   ' OR 1=1--
   ```
3. Click **Filter**.

### Expected result

- **Warning Banner above Store products:**
  ```text
  ⚠️ SQL INJECTION WARNING: 4 hidden/unreleased prototype product(s) are visible because the query logic was bypassed!
  ```
- **Headline:** Injection successful: unreleased items leaked!
- **Products returned:** **12 products (4 unreleased)**
- **Query sent to database:**
  ```sql
  SELECT * FROM products WHERE category = '' OR 1=1--' AND released = 1
  ```
- **Store products grid:**
  All products across all 4 categories are dumped, exposing all 4 confidential unreleased prototypes:
  1. _Gifts:_ **Encrypted Hardware Vault (Prototype)** ($89.00)
  2. _Clothing:_ **Stealth Bomber Jacket (Internal Staff)** ($129.00)
  3. _Tech:_ **Zero-Day Hardware Debugger (Classified)** ($299.99)
  4. _Books:_ **Advanced Kernel Exploitation (Early Draft)** ($59.00)

### What happened?

The injection `' OR 1=1--` forms a tautology (`1=1` is always TRUE) and comments out the release requirement. The `WHERE` clause evaluates to TRUE for every single row in the `products` table, allowing a complete data dump of both public and confidential merchandise.

---

# Task 15: Repeat Category Attack in Secure Mode

1. Switch the security toggle at the top of the card to **Secure mode**.
2. Notice the top strip turns teal: _"The server sends your text as data, separate from the SQL."_
3. Click the example injection button **`Gifts'--`**.
4. Click **Filter**.

### Expected result

- **Filter result & SQL panel:**
  - Status: Query executed successfully
  - Badge: Teal **Input treated as plain text**
  - Products returned: **0 products**
  - Message: _"In Secure mode your input is sent to the database as data ($1), not as SQL, so quotes and comments had no special meaning."_
- **Query sent to database:**
  ```sql
  SELECT * FROM products WHERE category = $1 AND released = 1
  ```
  _(Sent separately as data: `$1 = Gifts'--`)_
- **Store products grid:** No products returned, and no confidential prototypes leaked.

5. Test the payload **`' OR 1=1--`** in Secure mode and click **Filter**.
   - Result: **0 products returned**.

### What happened?

In Secure mode, the backend uses parameterized SQL:

```javascript
const sql = "SELECT * FROM products WHERE category = $1 AND released = 1";
await db.query(sql, [category]);
```

The database precompiles the query structure. The input `Gifts'--` is treated as a literal search query string. Because no product category literally equals `"Gifts'--"`, the query returns zero rows without executing the comment or quote characters.

---

# Task 16: Reset the Shop Lab

1. Click **Reset lab** in the URL simulator bar.

### Expected result

- The lab restores the database to its clean seeded state.
- Security mode resets to **Vulnerable mode**.
- Category input resets to **Gifts** with 2 released products displayed.
- All alert banners and celebration banners are cleared.

---

# Observation / Comparison

| Feature                         | Vulnerable mode                                       | Secure mode                                               |
| :------------------------------ | :---------------------------------------------------- | :-------------------------------------------------------- |
| **Input Handling**              | Joined directly into SQL text string                  | Sent separately as parameterized data (`$1`, `$2`)        |
| **SQL Structure**               | Dynamic — modified by user-supplied SQL syntax        | Static — query syntax precompiled and immutable           |
| **Login Attack (`admin'--`)**   | Comments out password check; authentication succeeds  | Treated as literal string; authentication fails           |
| **Login Attack (`' OR 1=1--`)** | Makes WHERE clause always TRUE; returns all accounts  | Treated as literal string; authentication fails           |
| **Shop Attack (`Gifts'--`)**    | Truncates `AND released = 1`; leaks hidden prototype  | Searches for literal name `Gifts'--`; returns 0 rows      |
| **Shop Attack (`' OR 1=1--`)**  | Dumps all 12 products across all categories           | Searches for literal string; returns 0 rows               |
| **SQL Syntax Error (`'`)**      | Malformed query causes database syntax error          | Safe execution; quote treated as plain string data        |
| **Core Vulnerability**          | Direct string concatenation breaks code/data boundary | Parameterization safely isolates code from untrusted data |

---

# Conclusion

SQL Injection occurs when untrusted user input is directly concatenated into an SQL statement, allowing user data to be interpreted as executable SQL syntax.

- In **Authentication routines** (Login), SQL injection allows attackers to bypass password verifications and hijack administrative accounts using comment tokens (`--`) or tautologies (`' OR 1=1--`).
- In **Business logic queries** (Shop Category Filter), SQL injection allows attackers to strip out restriction clauses (`AND released = 1`), leaking unreleased prototypes and proprietary inventory.

In **Secure mode**, parameterized queries (prepared statements) ensure that user data is handled strictly as values, never as executable code. Special characters like `'`, `--`, and `OR` retain no syntactic power, completely mitigating SQL injection vulnerabilities.

---

# Cleanup

When the experiment is complete:

1. Return to the terminal where Docker is running.
2. Press:
   ```text
   Ctrl+C
   ```
3. Run:
   ```bash
   docker compose down -v
   ```

This stops the containers and removes the lab database volume.

---

# Quick troubleshooting

| Problem                          | What to do                                                                                         |
| :------------------------------- | :------------------------------------------------------------------------------------------------- |
| Page does not open               | Make sure Docker Desktop is running and terminal shows server listening on port 3000               |
| Changes are not visible          | Run `docker compose up --build` and hard refresh browser with `Ctrl+F5`                            |
| Semicolon test blocked           | The lab contains an intentional safety guard to prevent stacked destructive queries (`DROP TABLE`) |
| Activity log empty after refresh | Check that backend is running and `/api/logs` is reachable                                         |
| Shop redirects to Login          | Session expired or not authenticated. Perform a login at `index.html` first                        |
