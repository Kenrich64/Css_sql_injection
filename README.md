# SQL Injection Virtual Lab

A local Docker lab demonstrating **SQL Injection** with two interactive educational modules:

- **Module 1: Authentication Bypass Lab (Login)** — demonstrates how SQL injection in user authentication queries allows an attacker to bypass password verification and log in as administrative accounts.
- **Module 2: Product Category Filter Lab (Shop)** — demonstrates how SQL injection in business logic queries (`WHERE released = 1`) allows an attacker to bypass release filters and retrieve confidential, unreleased prototype products.

Both modules feature two distinct execution modes:

- **Vulnerable mode** — user input is directly concatenated into the SQL query string.
- **Secure mode** — user input is sent separately as parameterized values (`$1`, `$2`), treating all input strictly as literal data rather than executable SQL code.

The lab uses dummy data and is intended solely for educational demonstration on your own computer.

---

## Demo video

**Demo video link:**
`https://drive.google.com/file/d/1affHEhmXPrilCntJyfiOj_LQ_TyyTF3q/view?usp=sharing`

The demo video illustrates:

1. Starting Docker and building the containers (`docker compose up --build`).
2. Opening `http://localhost:3000` to access the Login Lab.
3. Performing a normal login and an SQL injection bypass using `admin'--`.
4. Navigating to the **Product Category Filter Lab** (`shop.html`) upon successful login.
5. Testing normal category filtering (`Gifts`) to view released products.
6. Executing category SQL injection attacks:
   - `Gifts'--` — truncates the release filter and leaks the unreleased prototype product (_Encrypted Hardware Vault_).
   - `' OR category = 'Gifts'--` — triggers the celebration banner: **SOLVED: Congratulations, you solved the lab!**
   - `' OR 1=1--` — global tautology dumping all 12 products across all categories (leaking all 4 confidential prototypes).
7. Switching to **Secure mode** and verifying that parameterized queries treat injection syntax as literal text, returning zero rows and preventing data leaks.

---

## Requirements

Install these before running the project:

- Git
- Docker Desktop
- A modern web browser such as Chrome or Edge
- Internet connection for the first Docker build

No Node.js or PostgreSQL installation is required on the host machine. They run completely inside Docker containers.

---

## Check whether requirements are already installed

Open PowerShell or the VS Code terminal and run:

```bash
git --version
docker --version
docker compose version
```

Each command should print a version number.

Also open **Docker Desktop** and wait until the Docker engine indicates that it is running.

---

## Install Git

Skip this section if Git is already installed.

1. Download Git from:
   `https://git-scm.com/downloads`
2. Install it using the default options.
3. Close and reopen VS Code or the terminal.
4. Verify by running:

```bash
git --version
```

---

## Install Docker Desktop

Skip this section if Docker Desktop is already installed.

1. Download Docker Desktop from:
   `https://www.docker.com/products/docker-desktop/`
2. Install the version for your computer.
3. On Windows, keep **Use WSL 2** enabled when offered.
4. Restart the computer if the installer asks.
5. Open Docker Desktop.
6. Wait until the Docker engine is running.
7. Verify by running:

```bash
docker --version
docker compose version
docker info
```

# Video showing Docker Installation

`https://drive.google.com/file/d/1gzeKCpc5zLdmWBbcMkGosENxQqUoxTpT/view?`

### Note

For most Intel/AMD Windows laptops, choose **Windows - AMD64**.

For Windows on ARM, choose **Windows - ARM64**.

---

## Clone the repository

```bash
git clone https://github.com/Kenrich64/Css_sql_injection.git
cd Css_sql_injection
```

#### Video for cloning the repository

`https://drive.google.com/file/d/12gJgYIRN3EXSLObrrrUCLijSS6k47Ipy/view?`

---

## Run the project

Make sure Docker Desktop is running.

Run:

```bash
docker compose up --build
```

The first build can take several minutes because Docker downloads the required images and packages.

Wait until the terminal shows a message similar to:

```text
Server listening on http://0.0.0.0:3000
```

Keep this terminal open while using the lab.

Open your browser and navigate to:

```text
http://localhost:3000
```

> **Note:** Do not use VS Code Live Server. The application requires the Docker backend and database.

#### Video for Running the project

`https://drive.google.com/file/d/17JSwxw-x0ciAVQ4IkvJTHGipeF8ct9FM/view?`

---

## What the Docker command does

`docker compose up --build`:

1. Builds the application backend image.
2. Starts the PostgreSQL database container.
3. Seeds the database with dummy users and store products from `database/init.sql`.
4. Connects the Node.js backend to the database container.
5. Serves both the Login and Shop frontend interfaces at port `3000`.

---

## Stop the project

When finished, press:

```text
Ctrl+C
```

Then run:

```bash
docker compose down -v
```

#### Video for Project termination

`https://drive.google.com/file/d/1Q__2RdDHze6esBLcCvmMBF7sudtIGQ4u/view?`

The `-v` option removes the lab's Docker volume, ensuring the next run starts with fresh, unmodified lab data.

---

## Main lab features

The lab is split into two educational sections:

### 1. Authentication Lab (`/index.html`)

- **Login form** — Enter credentials manually or use quick-fill payload buttons.
- **Result panel** — Displays authentication outcome, returned rows, and provides an "Enter Shop Now →" link upon success.
- **Query visualizer** — Shows 4 clear stages:
  1. _Input_ — what the user entered.
  2. _SQL sent_ — the real query generated by the backend.
  3. _Database_ — row matching and database-level evaluation.
  4. _Result_ — student-friendly explanation of why authentication succeeded or failed.
- **Activity log** — Persistently logs real-time login attempts from the backend with timestamps, modes, usernames, and executed SQL.

### 2. Product Category Filter Lab (`/shop.html`)

- **URL parameter simulation** — Interactive address bar (`/filter?category=...`) reflecting real-world web application behavior.
- **Quick category buttons** — Filter by `Gifts`, `Clothing`, `Tech`, or `Books`.
- **Example injection buttons** — Pre-configured attack payloads contextual to the selected category.
- **Filter result & SQL panel** — Live breakdown of the executed SQL query, unreleased item count, and query mechanics analysis.
- **Store products grid** — Displays product cards. Confidential unreleased prototypes are highlighted with a pink background, red dashed border, lock icon, and `UNRELEASED (Hidden)` badge.
- **PortSwigger-style Solved banner** — Congratulatory banner triggered when unreleased items are successfully exposed.

---

## SQL Queries Demonstrated

### Authentication Query (Login)

- **Vulnerable mode:**
  The server concatenates input directly into the query string:

  ```sql
  SELECT * FROM users WHERE username='${username}' AND password='${password}'
  ```

  _Example normal query:_

  ```sql
  SELECT * FROM users WHERE username='admin' AND password='Adm!n@123'
  ```

- **Secure mode:**
  The server uses parameterized queries, binding input safely:
  ```sql
  SELECT * FROM users WHERE username=$1 AND password=$2
  ```

### Product Category Query (Shop)

- **Vulnerable mode:**
  The server concatenates the category parameter directly:

  ```sql
  SELECT * FROM products WHERE category = '${category}' AND released = 1
  ```

  _Example attack query (`Gifts'--`):_

  ```sql
  SELECT * FROM products WHERE category = 'Gifts'--' AND released = 1
  ```

  The comment (`--`) truncates `AND released = 1`, leaking unreleased prototype products.

- **Secure mode:**
  The server binds the category parameter safely as data:
  ```sql
  SELECT * FROM products WHERE category = $1 AND released = 1
  ```
  Characters like `'` and `--` are treated as literal characters in the string `$1`.

---

## Demonstration Payloads & Test Cases

### Login Module

| Case                | Username                 | Password    | Expected Vulnerable Result                          |
| :------------------ | :----------------------- | :---------- | :-------------------------------------------------- |
| **Normal login**    | `admin`                  | `Adm!n@123` | Login successful (1 row)                            |
| **Wrong password**  | `admin`                  | `wrong`     | Login failed (0 rows)                               |
| **SQL Injection 1** | `admin'--`               | `anything`  | Login successful (Password check commented out)     |
| **SQL Injection 2** | `' OR 1=1--`             | `anything`  | Login successful (Returns all 3 user records)       |
| **Syntax Error**    | `'`                      | `anything`  | Database rejects malformed query syntax             |
| **Safety Guard**    | `'; DROP TABLE users;--` | `anything`  | Blocked by lab safety guard (no stacked statements) |

### Shop Category Filter Module

| Case                  | Category Parameter          | Expected Vulnerable Result                                                     |
| :-------------------- | :-------------------------- | :----------------------------------------------------------------------------- |
| **Normal category**   | `Gifts`                     | 2 released products returned; unreleased items hidden                          |
| **Comment bypass**    | `Gifts'--`                  | 3 products returned; leaks 1 unreleased prototype (_Encrypted Hardware Vault_) |
| **Targeted OR query** | `' OR category = 'Gifts'--` | Solves the lab; leaks unreleased gift prototype                                |
| **Global tautology**  | `' OR 1=1--`                | 12 products returned across all categories (all 4 prototypes leaked)           |
| **Secure mode test**  | `Gifts'--` or `' OR 1=1--`  | 0 products returned; treated strictly as literal string                        |

---

## Troubleshooting

| Problem                                      | Fix                                                                |
| :------------------------------------------- | :----------------------------------------------------------------- |
| `docker` is not recognized                   | Install Docker Desktop, then restart VS Code/PowerShell            |
| Cannot connect to Docker daemon              | Open Docker Desktop and wait for the engine to start               |
| Page does not open                           | Check that the terminal shows the server is listening on port 3000 |
| Port 3000 is already allocated               | Stop the old container/process, then run the project again         |
| Page looks unchanged after a frontend change | Run `docker compose up --build` and press `Ctrl+F5`                |
| `Cannot GET /` appears                       | Stop the containers and run `docker compose up --build` again      |
| Database-related error on a fresh run        | Run `docker compose down -v` and rebuild                           |
| Docker build is taking a long time           | The first build downloads images/packages; wait for it to finish   |

---

## Project structure

The important parts of the project are:

```text
Css_sql_injection/
├── backend/
│   ├── curl-tests.md
│   ├── db.js
│   ├── Dockerfile
│   ├── package.json
│   ├── package-lock.json
│   └── server.js
├── database/
│   └── init.sql
├── docs/
│   ├── aim.md
│   ├── assignment.md
│   ├── objective.md
│   ├── procedure.md
│   ├── references.md
│   └── theory.md
├── frontend/
│   ├── visualizer/
│   │   ├── log.js
│   │   ├── visualizer.css
│   │   └── visualizer.js
│   ├── app.js
│   ├── index.html
│   ├── shop.html
│   ├── shop.js
│   └── style.css
├── tests/
├── .dockerignore
├── .gitignore
├── docker-compose.yml
├── GUIDANCE.md
└── README.md
```

---

## Safety

This is a controlled educational lab.

- Use only the dummy application supplied with the project.
- Do not test SQL injection against websites, databases, or accounts that you do not own or have explicit permission to test.
- The lab is designed to run locally in isolated Docker containers.
