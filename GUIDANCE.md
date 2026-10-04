# Guidance: Demonstrate SQL Injection

## Experiment

**Title:** Demonstrate SQL Injection

## Aim

To demonstrate how SQL Injection can occur when user input is directly included in an SQL query, and to show how parameterized queries prevent the same input from changing SQL logic.

## Objectives

After completing this lab, you should be able to:

- Explain SQL Injection.
- Identify the difference between Vulnerable and Secure mode.
- Observe how an injected input changes an SQL query.
- Explain why `admin'--` can bypass the password condition in the vulnerable lab.
- Explain why `' OR 1=1--` can return multiple rows.
- Explain how parameterized queries treat the same input as plain text.
- Use the Query visualizer and Activity log to observe the request flow.

> **Safety:** This is a local lab with dummy data. Do not use these techniques against systems that you do not own or have permission to test.

---

# Task 1: Start the lab

1. Open Docker Desktop.
2. Wait until the Docker engine is running.
3. Open the project in VS Code.
4. Open the terminal.
5. Make sure you are in the right folder.
6. Run:

```bash
docker compose up --build
```

6. Wait until the server is listening on port `3000`.
7. Open:

```text
http://localhost:3000
```

### Expected result

The **SQL injection: login** page opens.

---

# Task 2: Perform a Normal Login

<img width="922" height="912" alt="image" src="https://github.com/user-attachments/assets/f9490b41-564c-4a28-b023-ed5ce46441aa" />


1. Select **Vulnerable mode**.
2. Click **Normal login**.
3. Click **Log in**.

### Expected result

You should see:

- **Login successful**
- Logged in as `admin`
- **1 row**

The SQL should look like:

```sql
SELECT * FROM users WHERE username='admin' AND password='Adm!n@123'
```

### What happened?

The username and password were placed directly into the SQL query. Because they are normal values, the query checks for the matching user and password.

---

# Task 3: Bypass the login with `admin'--`

<img width="942" height="906" alt="image" src="https://github.com/user-attachments/assets/e8694b27-a8c3-4830-97c7-e4f79321bfd0" />

1. Stay in **Vulnerable mode**.
2. Click **admin'--**.
3. Click **Log in**.

### Expected result

You should see:

- **Login successful**
- Logged in as `admin`
- Red **Injection worked** badge
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

The quote closes the username string early.

The input also contains:

```text
--
```

In this lab, that marks the rest of the SQL line as a comment.

Therefore, the password condition is no longer used.

The database effectively checks the username condition without requiring the original password.

---

# Task 4: Return multiple users with `' OR 1=1--`

<img width="932" height="902" alt="image" src="https://github.com/user-attachments/assets/e5db42c1-3907-4cb1-81f8-e4d53700aa37" />


1. Stay in **Vulnerable mode**.
2. Click **' OR 1=1--**.
3. Click **Log in**.

### Expected result

You should see:

- **Login successful**
- Red **Injection worked** badge
- **3 rows**
- The rows correspond to the dummy users in the lab.

### What happened?

The important part is:

```text
OR 1=1
```

The condition `1=1` is always true.

The comment marker removes the remaining password check from the query.

Because the condition becomes true for the available rows, multiple users can be returned.

---

# Task 5: Observe a SQL syntax error

<img width="946" height="906" alt="image" src="https://github.com/user-attachments/assets/14ddecfc-75e9-4764-a291-8f6e6c9ec971" />


1. Stay in **Vulnerable mode**.
2. Enter only:

```text
'
```

as the username. 
3. Enter any value as the password. 
4. Click **Log in**.

### Expected result

The database should reject the malformed SQL and the page should show an error.

### What happened?

The single quote changes the structure of the SQL string but does not provide a complete valid query.

This demonstrates that directly inserting user input can allow the user to interfere with SQL syntax.

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
- Green/teal **Input treated as plain text** indication
- SQL containing:

```sql
SELECT * FROM users WHERE username=$1 AND password=$2
```

The values are displayed separately as `$1` and `$2`.

### What happened?

Secure mode does not join the username and password into the SQL text.

Instead, the SQL remains fixed:

```sql
SELECT * FROM users WHERE username=$1 AND password=$2
```

The input is supplied separately as data.

Therefore:

```text
admin'--
```

is treated as a username containing characters such as `'` and `--`.

Those characters do not become SQL syntax.

---

## Test `' OR 1=1--`

1. Stay in **Secure mode**.
2. Click **' OR 1=1--**.
3. Click **Log in**.

### Expected result

You should see:

- **Login failed**
- **0 rows**
- Input treated as plain text
- `$1` and `$2` in the SQL

### What happened?

The input is treated as an ordinary username value.

The text `OR 1=1` is not interpreted as part of the SQL command.

This demonstrates why parameterized queries are used to prevent SQL Injection.

---

# Task 7: Observe the safety guard
<img width="917" height="907" alt="image" src="https://github.com/user-attachments/assets/30b89c81-1de4-4b12-a9e4-d69c4f5cbde5" />


Use this test only in the supplied local lab.

1. Select **Vulnerable mode**.
2. Enter:

```text
'; DROP TABLE users;--
```

as the username. 
3. Enter any value as the password. 
4. Click **Log in**.

### Expected result

The lab's safety guard should block the request before the destructive SQL is executed.

The page should indicate that the query was not run.

5. Immediately click **Normal login** and log in again.

### Expected result

Normal login should still work.

### What does this demonstrate?

The lab contains a safety guard to prevent stacked/destructive statements from destroying the demonstration database.

> The safety guard is a protection built into this educational application. It is not the main SQL Injection defense being demonstrated. The main defense is parameterized SQL in Secure mode.

---

# Task 8: Observe the Query visualizer

After performing a login attempt, look at **Query visualizer**.

<img width="935" height="387" alt="image" src="https://github.com/user-attachments/assets/203788a1-7c69-48a7-aaaf-ee1c4eb23b73" />


It contains four stages:

### 1. Your input

Shows the username and password entered by the student.

### 2. SQL sent

Shows the actual SQL information returned by the backend.

In Vulnerable mode, injected text can appear as part of the SQL.

In Secure mode, the SQL remains fixed and the values are shown separately as `$1` and `$2`.

### 3. Database

Shows how many rows matched and explains what happened at the database stage.

### 4. Result

Shows whether the login succeeded or failed and explains why.

### Expected result

For a successful vulnerable injection, the visualizer should clearly show the change from:

**Input → SQL → Database → Successful login**

For Secure mode, it should show:

**Input → Fixed parameterized SQL → 0 rows → Login failed**

---

# Task 9: Check the Activity log

After several login attempts, look at **Activity log**.

<img width="921" height="552" alt="image" src="https://github.com/user-attachments/assets/72c6bb01-ca00-4923-9526-94d7a773d719" />


The log records attempts such as:

- Time
- Mode
- Username
- Outcome
- Status
- SQL

### Expected result

The newest attempt appears in the log.

Refresh the page.

### Expected result

The previous attempts remain available because the log is loaded from the backend.

This confirms that the activity log is connected to the real backend rather than displaying hard-coded sample results.

---

# Task 10: Reset the lab

1. Click **Reset lab**.

<img width="962" height="885" alt="image" src="https://github.com/user-attachments/assets/3c5edd0f-baa4-426e-9705-0fbbccf4030c" />


### Expected result

- The Query visualizer returns to its initial empty state.
- The Activity log returns to **No attempts yet**.
- You can perform a normal login again.

---

# Observation / Comparison

| Feature                 | Vulnerable mode                        | Secure mode                                      |
| ----------------------- | -------------------------------------- | ------------------------------------------------ |
| How input is handled    | Joined into SQL                        | Sent as parameters                               |
| SQL structure           | Changes when input contains SQL syntax | Remains fixed                                    |
| `admin'--`              | Can bypass the password check          | Treated as plain text                            |
| `' OR 1=1--`            | Can make the condition true            | Treated as plain text                            |
| SQL shown               | User text appears inside SQL           | `$1` and `$2` parameters                         |
| Login result for attack | Can succeed                            | Fails                                            |
| Main lesson             | Direct string concatenation is unsafe  | Parameterized queries prevent SQL interpretation |

# Conclusion

SQL Injection occurs when untrusted user input is inserted directly into an SQL statement and is allowed to affect the structure or logic of that statement.

In Vulnerable mode, inputs such as `admin'--` and `' OR 1=1--` change the SQL query and can bypass the intended password check.

In Secure mode, parameterized queries keep the SQL command separate from the user data. The same inputs are therefore treated as ordinary text and do not change the SQL logic.

The Query visualizer and Activity log make this difference visible during the experiment.

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

# Quick troubleshooting

| Problem | What to
do |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Page does not open | Make sure Docker is running and the server is listening on port 3000 |
| Changes are not visible | Run `docker compose up --build` and press `Ctrl+F5` |
| Secure mode still shows the safety guard for the semicolon test | Make sure the backend semicolon-guard fix has been merged and rebuild Docker |
| Activity log is empty after refresh | Check that the backend is running and that `/api/logs` is reachable |
