# Employee Manager

A full-stack app for managing employees:

- **Backend:** a Spring Boot REST API secured with JWT authentication.
- **Frontend:** a React app with login, registration and employee CRUD.
- **Database:** PostgreSQL.

Each part runs in its own Docker container.

**Tech stack:** Java 21, Spring Boot 3.5, Spring Security (OAuth2 Resource Server, JWT HS256), Spring Data JPA, PostgreSQL 17, springdoc-openapi (Swagger UI), React 19, Vite 6, nginx, Maven, Docker Compose.

## Architecture

```
Browser
   │  http://localhost:3000
   ▼
frontend container (employee-ui): nginx
   ├─ serves the built React app
   └─ /api/*  ──proxy──►  app container (employee-api): Spring Boot, port 8080
                             Security filter (validates JWT)
                             Controller → Service → Repository (Spring Data JPA)
                                  │  jdbc:postgresql://postgres:5432/employee_db
                                  ▼
                          postgres container (employee-postgres)
                             tables: employees, app_users
                             data kept in the postgres_data volume
```

nginx forwards `/api` requests to the backend, so the browser sees a single origin and no CORS configuration is needed.

## How JWT authentication works

1. The user signs in. The React app sends `POST /api/auth/login` with a username and password.
2. Spring Security checks the password against the BCrypt hash in `app_users`. If it matches, the API returns a signed JWT that is valid for 60 minutes by default.
3. The React app stores the token in `localStorage` and sends `Authorization: Bearer <token>` with every request.
4. Spring Security validates the token's signature and expiry on each request. A missing, invalid or expired token gets **401**, and the React app then returns to the login screen.

On first startup the backend creates a default admin account: **`admin` / `admin123`**. Users can also create their own accounts on the Register screen.

## Prerequisites

- Docker Desktop (or Docker Engine with the Compose plugin), and it must be running.

You don't need Java, Maven or Node on your machine: every part is built inside Docker.

## Quick start

From the project root:

```bash
docker compose up --build -d
docker compose ps
```

| What | URL |
|---|---|
| **React app** | http://localhost:3000 |
| Swagger UI | http://localhost:8080/swagger-ui.html |
| OpenAPI spec (JSON) | http://localhost:8080/v3/api-docs |
| API (direct) | http://localhost:8080/api |

On startup, Hibernate creates the `employees` and `app_users` tables automatically (`spring.jpa.hibernate.ddl-auto=update`).

## API endpoints

### Auth (public)

| Operation | Method | Endpoint | Body | Response |
|---|---|---|---|---|
| Log in | POST | `/api/auth/login` | `{"username","password"}` | 200 `{token, username, expiresIn}`; 401 if wrong |
| Register | POST | `/api/auth/register` | `{"username","password"}` | 201 `{token, username, expiresIn}`; 400 invalid; 409 taken |

Registration requires a username of at least 3 characters and a password of at least 6.

### Employees (requires `Authorization: Bearer <token>`)

| Operation | Method | Endpoint | Success response |
|---|---|---|---|
| Create employee | POST | `/api/employees` | 201 Created |
| Get all employees | GET | `/api/employees` | 200 OK |
| Get employee by ID | GET | `/api/employees/{id}` | 200 OK |
| Update employee | PUT | `/api/employees/{id}` | 200 OK |
| Delete employee | DELETE | `/api/employees/{id}` | 204 No Content |

The employee endpoints return **401** without a valid token. The get-by-ID, update and delete endpoints return **404** if the ID doesn't exist.

Example employee body:

```json
{ "name": "Lakshmi", "email": "lakshmi@example.com", "department": "Engineering" }
```

### Using Swagger UI

1. Open http://localhost:8080/swagger-ui.html.
2. Run `POST /api/auth/login` with `{"username":"admin","password":"admin123"}` and copy the `token` from the response.
3. Click **Authorize**, paste the token, then click **Authorize** again. Requests to the employee endpoints now include the token.

### Examples (bash / Git Bash)

```bash
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | sed 's/.*"token":"\([^"]*\)".*/\1/')

curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/employees

curl -i -X POST http://localhost:8080/api/employees \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Lakshmi","email":"lakshmi@example.com","department":"Engineering"}'
```

### Examples (Windows PowerShell)

```powershell
$auth = Invoke-RestMethod http://localhost:8080/api/auth/login -Method Post `
  -ContentType "application/json" -Body '{"username":"admin","password":"admin123"}'
$h = @{ Authorization = "Bearer $($auth.token)" }

Invoke-RestMethod http://localhost:8080/api/employees -Headers $h

Invoke-RestMethod http://localhost:8080/api/employees -Method Post -Headers $h `
  -ContentType "application/json" `
  -Body '{"name":"Lakshmi","email":"lakshmi@example.com","department":"Engineering"}'

Invoke-RestMethod http://localhost:8080/api/employees/1 -Method Delete -Headers $h
```

## Configuration

The backend reads these environment variables. The values in `compose.yaml` are for local use only.

| Variable | Default | Purpose |
|---|---|---|
| `DB_URL` | `jdbc:postgresql://localhost:5433/employee_db` | Database JDBC URL |
| `DB_USERNAME` / `DB_PASSWORD` | `postgres` / `postgres` | Database credentials |
| `JWT_SECRET` | dev value | HS256 signing key, **at least 32 bytes** |
| `JWT_EXPIRATION_MINUTES` | `60` | Token lifetime |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | `admin` / `admin123` | Default account, created only if it doesn't exist yet |

Changing `JWT_SECRET` invalidates all issued tokens, so users must log in again.

## Inspecting the database

```bash
docker exec -it employee-postgres psql -U postgres -d employee_db
```

```sql
SELECT * FROM employees;
SELECT id, username, role FROM app_users;   -- passwords are stored as BCrypt hashes
\q
```

To connect from a desktop tool such as DBeaver or pgAdmin, use host `localhost`, port **5433**, database `employee_db`, user `postgres`, password `postgres`.

> The database is published on host port **5433**, not the default 5432, so it doesn't clash with another PostgreSQL instance on this machine. Inside the Docker network it still listens on 5432.

## Local development (without Docker for the app)

**Backend** (requires JDK 21 and Maven):

```bash
docker compose up -d postgres
mvn spring-boot:run
```

**Frontend** (requires Node 20+):

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173, proxies /api to localhost:8080
```

> On Windows with Smart App Control enabled, Windows may block Vite's native Rollup binary (`An Application Control policy has blocked this file`). If that happens, use the Docker build (`docker compose up --build -d frontend`) instead.

## Useful Docker commands

| Task | Command |
|---|---|
| Start everything | `docker compose up -d` |
| Rebuild after code changes | `docker compose up --build -d` |
| Rebuild only one service | `docker compose up --build -d app` (or `frontend`) |
| Follow logs | `docker compose logs -f app` |
| Check running containers | `docker compose ps` |
| Stop containers | `docker compose stop` |
| Stop and remove containers (keeps data) | `docker compose down` |
| Remove containers **and delete all data** | `docker compose down -v` |

## Project structure

```
employee-api/
├── src/main/java/com/example/demo/
│   ├── EmployeeApiApplication.java
│   ├── config/OpenApiConfig.java              # Swagger "Authorize" (bearer JWT)
│   ├── controller/
│   │   ├── AuthController.java                # /api/auth/login, /api/auth/register
│   │   └── EmployeeController.java            # /api/employees CRUD
│   ├── dto/AuthRequest.java, AuthResponse.java
│   ├── entity/Employee.java, AppUser.java
│   ├── exception/EmployeeNotFoundException.java   # Returns 404
│   ├── repository/EmployeeRepository.java, AppUserRepository.java
│   ├── security/
│   │   ├── SecurityConfig.java                # Filter chain, JWT encoder/decoder, BCrypt
│   │   ├── JwtService.java                    # Issues signed tokens
│   │   ├── AppUserDetailsService.java         # Loads users from app_users
│   │   └── AdminUserInitializer.java          # Seeds the default admin
│   └── service/EmployeeService.java
├── src/main/resources/application.properties
├── frontend/
│   ├── src/
│   │   ├── api.js                             # fetch wrapper, token storage, 401 handling
│   │   ├── App.jsx                            # Shows login or employees page
│   │   ├── components/LoginPage.jsx           # Sign in / register
│   │   ├── components/EmployeesPage.jsx       # Table, search, delete
│   │   ├── components/EmployeeForm.jsx        # Create / edit form
│   │   └── index.css
│   ├── nginx.conf                             # Serves the SPA, proxies /api to the app
│   ├── Dockerfile                             # Node build → nginx
│   ├── vite.config.js
│   └── package.json
├── Dockerfile                                 # Maven build → JRE
├── compose.yaml                               # postgres + app + frontend
└── pom.xml
```

## Notes

- The credentials and JWT secret in this repo are for local development only. Use strong, secret values in any shared or production environment.
- The token is kept in `localStorage`, which is simple but readable by any script on the page. For production, consider short-lived tokens with refresh tokens, or httpOnly cookies.
- `ddl-auto=update` is convenient for learning. For production, use a migration tool such as Flyway or Liquibase.
- Possible next steps: role-based permissions (for example, only `ADMIN` can delete), request validation with DTOs, global exception handling with `@RestControllerAdvice`, and pagination.
