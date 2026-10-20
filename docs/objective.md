# OBJECTIVES

After completing this lab, you will be able to:

* **Understand SQL Injection:** Explain what **SQL Injection (SQLi)** is and why unsafe string concatenation introduces severe security flaws.
* **Demonstrate Authentication Bypass:** Show how an attacker can bypass a login form using comment payloads like `admin'--` without knowing the legitimate password.
* **Reveal Hidden & Unreleased Data:** Demonstrate how category filter inputs like `Gifts'--` comment out the `AND released = 1` condition, exposing confidential and unreleased prototype products.
* **Analyze SQL Injection Mechanics:**
  * **Quote Injection:** Understand how a single quote (`'`) escapes the data literal boundary.
  * **Comment Injection:** Understand how comment markers (`--`) instruct the SQL engine to ignore remaining query clauses.
  * **Tautology Injection:** Understand how boolean tautologies like `' OR 1=1--` force conditional logic to always evaluate to `TRUE`.
* **Demonstrate Secure Coding:** Prove that identical attack payloads fail completely when **parameterized queries** (`$1`, `$2`) are implemented in **Secure mode**.
* **Inspect Request & Execution Flow:** Utilize the **Query Visualizer** and **Activity Log** to observe how queries are constructed, sent over the network, and executed by PostgreSQL in both modes.
