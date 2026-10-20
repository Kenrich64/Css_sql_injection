# AIM

To demonstrate how **SQL Injection** allows an attacker to **bypass login authentication** and **view hidden, unreleased products** when user input is concatenated directly into a database query, and to show how **parameterized queries** treat that input strictly as **plain text** to keep the application secure.

---

### Core Focus Points:
* **Vulnerable Concatenation:** How user-supplied input can break SQL syntax, bypass password checks, and comment out table filters (`WHERE released = 1`).
* **Secure Parameterization:** How prepared statements with placeholders (`$1`, `$2`) completely neutralize injection by separating executable code from untrusted data.
