# THEORY

## 1. What is SQL Injection?
* **Definition:** **SQL Injection (SQLi)** is a critical web security vulnerability listed under Injection (**A03:2021**) in the **OWASP Top 10**.
* **Root Cause:** It occurs when untrusted user input is directly concatenated or joined into an SQL statement rather than separating **code** from **data**.
* **Mechanics:** Because the database interpreter cannot distinguish between the developer's SQL commands and user-supplied data, special characters such as single quotes (`'`) and comment dashes (`--`) alter the syntax and execution flow of the underlying query.

---

## 2. Scenario A: Login Authentication Bypass

In the login lab, the database is designed to authenticate users by validating both the **username** and **password**.

### A. Vulnerable Mode (Direct Concatenation)
The server directly glues user input into the SQL string:

* **Normal Login (Valid Credentials):**
  ```sql
  SELECT * FROM users WHERE username='admin' AND password='Adm!n@123'
  ```
  * **Result:** **Login successful**, returns **1 row**. The query checks for a matching username and password.

* **Failed Login (Wrong Password):**
  ```sql
  SELECT * FROM users WHERE username='admin' AND password='wrongpassword'
  ```
  * **Result:** **Login failed**, returns **0 rows**. Standard authentication behavior when credentials do not match.

* **Bypass with `admin'--` (Comment Bypass):**
  ```sql
  SELECT * FROM users WHERE username='admin'--' AND password='anything'
  ```
  * **Mechanism:** The single quote (`'`) closes the username literal early. The `--` marks the rest of the query as a comment, completely discarding the password verification clause.
  * **Result:** **Login successful as admin** without requiring the real password.

* **Bypass with `' OR 1=1--` (Tautology Bypass):**
  ```sql
  SELECT * FROM users WHERE username='' OR 1=1--' AND password='anything'
  ```
  * **Mechanism:** The expression `1=1` is an always-true boolean tautology. Combined with `--`, the password check is eliminated.
  * **Result:** **Login successful**, returns **every user row** stored in the database table.

### B. Secure Mode (Parameterized Queries)
* **Pre-compiled Query:**
  ```sql
  SELECT * FROM users WHERE username=$1 AND password=$2
  ```
* **Mechanism:** Placeholders (`$1`, `$2`) keep SQL commands pre-compiled and immutable. Attack strings like `admin'--` are bound strictly as **literal string values** rather than executable instructions.
* **Result:** Attack fails and login is safely denied (**0 rows**).

---

## 3. Scenario B: Hidden & Unreleased Products (Shop Filter)

In the shop catalog, the application enforces a business rule: standard customers should only see public, released products (`released = 1`). Confidential items with `released = 0` must remain hidden.

### A. Vulnerable Mode (Direct Concatenation)
The server concatenates the selected category directly into the SQL query:

* **Normal Category Filter (`Gifts`):**
  ```sql
  SELECT * FROM products WHERE category = 'Gifts' AND released = 1
  ```
  * **Result:** Only released public gifts appear on the page.

* **Bypass with `Gifts'--` (Comment Bypass):**
  ```sql
  SELECT * FROM products WHERE category = 'Gifts'--' AND released = 1
  ```
  * **Mechanism:** The quote closes `'Gifts'` and `--` comments out `AND released = 1`.
  * **Result:** **Confidential, unreleased prototype products** (`released = 0`) are displayed, triggering the **"Lab Solved"** banner!

* **Targeted Bypass with `' OR category = 'Gifts'--`:**
  ```sql
  SELECT * FROM products WHERE category = '' OR category = 'Gifts'--' AND released = 1
  ```
  * **Mechanism:** Injects an explicit boolean `OR` condition for `Gifts` while removing the `released = 1` condition.
  * **Result:** Exposes all hidden and unreleased items specific to the Gifts category.

* **Global Dump with `' OR 1=1--` (All Products Bypass):**
  ```sql
  SELECT * FROM products WHERE category = '' OR 1=1--' AND released = 1
  ```
  * **Mechanism:** The condition `1=1` evaluates to true for every database record, while `--` strips away the release restriction.
  * **Result:** Exposes **every single product** (both released and unreleased) across all store categories.

### B. Secure Mode (Parameterized Queries)
* **Pre-compiled Query:**
  ```sql
  SELECT * FROM products WHERE category = $1 AND released = 1
  ```
* **Mechanism:** The placeholder (`$1`) treats the input strictly as data. The database checks for a literal category named `"Gifts'--"`, finds no match, and the rule `released = 1` remains strictly intact.
* **Result:** Attack fails, 0 products returned, and hidden items remain completely protected.

---

## 4. Summary of Defense
* **Vulnerable Approach (Concatenation):** Blends code and data together, allowing user input to hijack query logic.
* **Secure Approach (Parameterization):** Strictly enforces separation between code and data, making SQL injection impossible regardless of input characters.
