# SQL Injection Virtual Lab

A small local Docker lab that demonstrates **SQL Injection** using a fake login application with two modes:

- **Vulnerable mode** — user input is directly joined into the SQL query.
- **Secure mode** — user input is sent as parameters, so it is treated as data rather than SQL.

The lab uses dummy users and is intended only for classroom demonstration on your own computer.

## Demo video

**Demo video link here:**
`https://drive.google.com/file/d/1AXiO35sZlNHqNraOVhy9C6n_ynSSWrdf/view?`

The video should show:

1. Cloning the GitHub repository.
2. Starting Docker.
3. Running the project with Docker Compose.
4. Opening `http://localhost:3000`.
5. Performing a normal login, an SQL injection in Vulnerable mode, and the same input in Secure mode.

## Requirements

Install these before running the project:

- Git
- Docker Desktop
- A modern web browser such as Chrome or Edge
- Internet connection for the first Docker build

No Node.js or PostgreSQL installation is required on the host machine. They run inside Docker.

## Check whether requirements are already installed

Open PowerShell or the VS Code terminal and run:

```bash
git --version
docker --version
docker compose version
```

Each command should print a version number.

Also open **Docker Desktop** and wait until the Docker engine says it is running.

## Install Git

Skip this section if Git is already installed.

1. Download Git from:
   `https://git-scm.com/downloads`
2. Install it using the default options.
3. Close and reopen VS Code or the terminal.
4. Run:

```bash
git --version
```

## Install Docker Desktop

Skip this section if Docker Desktop is already installed.

1. Download Docker Desktop from:
   `https://www.docker.com/products/docker-desktop/`
2. Install the version for your computer.
3. On Windows, keep **Use WSL 2** enabled when offered.
4. Restart the computer if the installer asks.
5. Open Docker Desktop.
6. Wait until the Docker engine is running.
7. Run:

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

## Clone the repository

```bash
git clone https://github.com/Kenrich64/Css_sql_injection.git
cd Css_sql_injection
```

#### Video for cloning the repository

`https://drive.google.com/file/d/12gJgYIRN3EXSLObrrrUCLijSS6k47Ipy/view?`

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

Open your browser and go to:

```text
http://localhost:3000
```

Do not use VS Code Live Server.

#### Video for Running the project

`https://drive.google.com/file/d/17JSwxw-x0ciAVQ4IkvJTHGipeF8ct9FM/view?`

## What the Docker command does

`docker compose up --build`:

1. Builds the application image.
2. Starts the PostgreSQL database container.
3. Starts the web/backend container.
4. Connects the application to the database.
5. Serves the frontend at port `3000`.

The database contains only dummy lab users.

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

The `-v` option removes the lab's Docker volume, so the next clean run starts with fresh lab data.

## Main lab features

### 4 Sections in the website

1. **Login** — Here the student enters a username and password and performs the login experiment.
2. **Result** — Displays the outcome of the most recent login attempt.
3. **Query visualizer** — Provides a step-by-step view of what happens during a login attempt.
4. **Activity log** — Records the login attempts performed during the experiment.

### Vulnerable mode

The server builds SQL by joining the username and password directly into the query.

Example normal query:

```sql
SELECT * FROM users WHERE username='admin' AND password='Adm!n@123'
```

Because input becomes part of the SQL syntax, specially crafted input can change the meaning of the query.

### Secure mode

The SQL stays fixed and the input is supplied separately:

```sql
SELECT * FROM users WHERE username=$1 AND password=$2
```

The username and password are treated as data. SQL characters inside the input do not become SQL syntax.

## Query visualizer

The Query visualizer shows four stages:

1. **Input** — what the student entered.
2. **SQL sent** — the query sent by the real backend.
3. **Database** — what the database matched or rejected.
4. **Result** — the final login result and explanation.

The visualizer uses the response from the real backend. It does not create fake login results.

## Activity log

The Activity log records login attempts returned by the backend.

It shows information such as:

- Time
- Mode
- Username
- Outcome
- Status
- SQL

The log can be refreshed from the backend and is cleared when **Reset lab** is used.

## Dummy users

The lab uses dummy accounts for demonstration, including:

- `Normal login         Username:admin   Password:Adm!n@123`
- `Wrong password       Username:admin   Password:wrong`
- `SQL Injection 1      Username:admin'--    Password:anything`
- `SQL Injection 2      Username:' OR 1=1--  Password:anything`

## Troubleshooting

| Problem                                      | Fix                                                                |
| -------------------------------------------- | ------------------------------------------------------------------ |
| `docker` is not recognized                   | Install Docker Desktop, then restart VS Code/PowerShell            |
| Cannot connect to Docker daemon              | Open Docker Desktop and wait for the engine to start               |
| Page does not open                           | Check that the terminal shows the server is listening on port 3000 |
| Port 3000 is already allocated               | Stop the old container/process, then run the project again         |
| Page looks unchanged after a frontend change | Run `docker compose up --build` and press `Ctrl+F5`                |
| `Cannot GET /` appears                       | Stop the containers and run `docker compose up --build` again      |
| Database-related error on a fresh run        | Run `docker compose down -v` and rebuild                           |
| Docker build is taking a long time           | The first build downloads images/packages; wait for it to finish   |

## Project structure

The important parts of the project are:

```text
Css_sql_injection/
├── backend/
│   ├── server.js
│   ├── db.js
│   ├── Dockerfile
│   ├── package.json
│   ├── package-lock.json
│   └── curl-tests.md
├── frontend/
│   ├── index.html
│   ├── app.js
│   ├── style.css
│   └── visualizer/
│       ├── visualizer.js
│       ├── log.js
│       └── visualizer.css
├── test/
│   └── .gitkeep
├── .dockerignore
├── .gitignore
├── README.md
└── GUIDANCE.md
```

## Safety

This is a controlled educational lab.

- Use only the dummy application supplied with the project.
- Do not test SQL injection against websites, databases or accounts that you do not own or have permission to test.
- The lab is designed to run locally in Docker.
