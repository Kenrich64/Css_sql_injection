# ASSIGNMENT: MCQ QUIZ

Choose exactly one correct answer for each question.

---

### **Question 1**
**What is the root cause of SQL Injection in vulnerable web applications?**
* **A.** The database engine is configured in debug mode.
* **B.** User-supplied input is directly concatenated into the SQL command string, blending code with data.
* **C.** The web server does not use HTTPS/SSL encryption.
* **D.** PostgreSQL does not support authentication controls.

* **Correct Option:** **B**
* **Explanation:** Concatenating untrusted strings directly into queries mixes code with data, allowing attacker inputs to redefine SQL syntax.

---

### **Question 2**
**In the login bypass payload `admin'--`, what is the exact function of the `--` sequence?**
* **A.** It decrements the login attempt counter.
* **B.** It marks the remainder of the SQL statement as a comment, causing the database to ignore the password condition.
* **C.** It escapes the single quote so the database treats it as text.
* **D.** It acts as an SQL wildcard to match any user in the table.

* **Correct Option:** **B**
* **Explanation:** In SQL, `--` denotes the start of an inline comment. Everything after `--` on that line is discarded by the parser, neutralizing the password check.

---

### **Question 3**
**In the shop lab, how does the application normally ensure unreleased prototype items remain confidential?**
* **A.** Unreleased products are stored in a separate, encrypted database.
* **B.** By enforcing the server-side query condition `WHERE category = '...' AND released = 1`.
* **C.** By using JavaScript in the browser to hide cards where `released == 0`.
* **D.** Products with `released = 0` are automatically deleted upon insertion.

* **Correct Option:** **B**
* **Explanation:** The business rule is enforced by adding `AND released = 1` to the SQL query so unreleased prototype items (`released = 0`) are filtered out.

---

### **Question 4**
**When an attacker submits `Gifts'--` in the vulnerable category filter, why do unreleased products appear?**
* **A.** The payload alters the database table schema permanently.
* **B.** The single quote closes `'Gifts'` and `--` discards `AND released = 1`, returning all gifts regardless of their release status.
* **C.** The query forces the database to update `released = 0` to `released = 1`.
* **D.** The `--` switches the database connection from student to administrator.

* **Correct Option:** **B**
* **Explanation:** The quote terminates the string `'Gifts'`, and `--` comments out the subsequent `AND released = 1` check, instructing the database to fetch every product where `category = 'Gifts'`.

---

### **Question 5**
**What is the evaluation logic when the targeted payload `' OR category = 'Gifts'--` is injected into the vulnerable shop query?**
* **A.** It tests `WHERE category = '' OR category = 'Gifts'` while commenting out `AND released = 1`, returning all released and unreleased items in `Gifts`.
* **B.** It creates a new category named `Gifts` in the database.
* **C.** It causes an SQL syntax error because of duplicate column names.
* **D.** It causes the database to perform a `UNION SELECT` on the users table.

* **Correct Option:** **A**
* **Explanation:** It creates an expression where either the empty string or `Gifts` matches, while commenting out the release flag filter, cleanly dumping all items in the target category.

---

### **Question 6**
**Why does the payload `' OR 1=1--` expose products across every category in the shop?**
* **A.** `1=1` is an always-true boolean tautology, and `--` removes the `released = 1` constraint, matching every row in the `products` table.
* **B.** `1=1` triggers an administrative debug mode in PostgreSQL.
* **C.** The browser repeats the request once for each category.
* **D.** `1=1` instructs the database to bypass all row-level permissions.

* **Correct Option:** **A**
* **Explanation:** Because `1=1` evaluates to true for every single row and the remaining conditions are commented out, the query returns all records regardless of category or release status.

---

### **Question 7**
**In Secure mode, the shop query runs as:**  
`SELECT * FROM products WHERE category = $1 AND released = 1`  
**Why does the injection input `Gifts'--` fail to expose unreleased products?**
* **A.** The database automatically deletes the characters `'` and `--` before running the query.
* **B.** The placeholder `$1` treats the entire input literally as data, looking for a category named `"Gifts'--"`, while strictly preserving `AND released = 1`.
* **C.** The backend intercepts the input and redirects the user to the login page.
* **D.** Secure mode only permits numbers as category parameters.

* **Correct Option:** **B**
* **Explanation:** In prepared statements (`$1`), parameter values are sent over a separate protocol channel. Quotes and dashes have no syntactic meaning, and the `AND released = 1` clause remains untouched.

---

### **Question 8**
**What happens when an attacker submits only a single quote (`'`) in Vulnerable mode versus Secure mode?**
* **A.** Both modes crash the database server.
* **B.** Both modes log the user in as admin.
* **C.** Vulnerable mode triggers a SQL syntax error (unmatched quote), whereas Secure mode safely binds `'` as a string parameter and returns 0 rows.
* **D.** Vulnerable mode returns 0 rows, whereas Secure mode crashes.

* **Correct Option:** **C**
* **Explanation:** In Vulnerable mode, the lone quote breaks SQL string boundaries, leaving an unclosed literal. In Secure mode, the quote is safely handled as a one-character literal value.

---

### **Question 9**
**What is the purpose of the safety guard implemented in this lab when an input containing a semicolon (`;`) is submitted?**
* **A.** To prevent stacked queries (such as `; DROP TABLE users;`) from destroying demonstration tables during student exercises.
* **B.** It is the primary security defense against all SQL injection attacks in production.
* **C.** Semicolons are illegal characters in standard HTTP requests.
* **D.** To format the response as JSON.

* **Correct Option:** **A**
* **Explanation:** The lab blocks semicolons to prevent students from inadvertently running stacked commands like `DROP TABLE` that would wipe the local database container.

---

### **Question 10**
**Why are parameterized queries (prepared statements) considered the gold standard defense against SQL Injection?**
* **A.** They automatically encrypt the database columns on disk.
* **B.** They rely on regex filters to block dangerous words like `SELECT` and `OR`.
* **C.** They pre-compile the SQL structure so untrusted input is strictly bound as data values and cannot alter command logic.
* **D.** They prevent users from viewing the web application source code.

* **Correct Option:** **C**
* **Explanation:** Parameterized queries separate the query compilation phase from data transmission, ensuring data can never be interpreted as executable SQL commands.
