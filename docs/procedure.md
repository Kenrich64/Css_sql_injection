# PROCEDURE

* **Step 1: Start the Lab**
  * Open **Docker Desktop** and verify the Docker engine is running.
  * In the project terminal, execute:
    ```bash
    docker compose up --build
    ```
  * Navigate in your browser to: `http://localhost:3000`.

* **Step 2: Normal Login Test**
  * Select **Vulnerable mode**.
  * Enter valid dummy credentials: **Username:** `admin` | **Password:** `Adm!n@123`.
  * Click **Log in** &rarr; Verify **Login successful** and **1 row** returned.
  * Try an incorrect password &rarr; Verify normal authentication failure (**0 rows** returned).

* **Step 3: Login Bypass Test (`admin'--`)**
  * In **Vulnerable mode**, enter `admin'--` as the username and type any arbitrary password.
  * Click **Log in** &rarr; Verify **Login successful** as `admin`, confirming the password clause was commented out.

* **Step 4: Tautology Injection Test (`' OR 1=1--`)**
  * In **Vulnerable mode**, enter `' OR 1=1--` with any password.
  * Click **Log in** &rarr; Verify that all dummy database users are returned.

* **Step 5: Syntax Error Test (`'`)**
  * In **Vulnerable mode**, enter only a single quote (`'`) as the username.
  * Click **Log in** &rarr; Observe the database SQL syntax error resulting from an unclosed string literal.

* **Step 6: Navigate to Shop Page**
  * After any successful login, observe the green confirmation card: **"🎉 Login Verified! Access Granted"**.
  * Click **Enter Shop Now →** to open the product catalog (`shop.html`).

* **Step 7: Normal Category Lookup**
  * In **Vulnerable mode**, select **Gifts** (URL: `/filter?category=Gifts`).
  * Click **Filter** &rarr; Verify that only public, released products (`WHERE released = 1`) appear.

* **Step 8: Expose Hidden Products (`Gifts'--`)**
  * In **Vulnerable mode**, enter `Gifts'--` in the category bar and click **Filter**.
  * Observe the green **"Solved"** banner and note the confidential unreleased item (**Encrypted Hardware Vault Prototype**) displayed with an **UNRELEASED** badge.

* **Step 9: Target Category Filter (`' OR category = 'Gifts'--`)**
  * In **Vulnerable mode**, enter `' OR category = 'Gifts'--` and click **Filter**.
  * Verify that both released and hidden items for the `Gifts` category are successfully retrieved.

* **Step 10: Global Product Dump (`' OR 1=1--`)**
  * In **Vulnerable mode**, enter `' OR 1=1--` and click **Filter**.
  * Verify that all products across all categories (both released and unreleased) are dumped on screen.

* **Step 11: Secure Mode Verification**
  * Switch to **Secure mode** on both Login and Shop pages.
  * Re-run the injection payloads (`admin'--`, `Gifts'--`, `' OR 1=1--`).
  * Verify that all attacks are blocked and inputs are treated as literal parameter values (`$1`, `$2`).

* **Step 12: Review and Cleanup**
  * Inspect the **Query Visualizer** and **Activity Log** to confirm backend telemetry.
  * Click **Reset lab** to restore dummy tables to their default state.
  * In the terminal, press `Ctrl + C` and clean up containers with:
    ```bash
    docker compose down -v
    ```
