# User Management Service


![CI](https://github.com/tabari86/user-management-service/actions/workflows/test.yml/badge.svg)
![Node.js](https://img.shields.io/badge/Node.js-22-green?logo=nodedotjs)
![Express](https://img.shields.io/badge/Express-API-black?logo=express)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-green?logo=mongodb)
![JWT](https://img.shields.io/badge/JWT-Authentication-orange)
![bcrypt](https://img.shields.io/badge/bcrypt-Password_Hashing-blue)
![Swagger](https://img.shields.io/badge/OpenAPI-3.0-brightgreen)
![REST API](https://img.shields.io/badge/REST-API-red)
![Jest](https://img.shields.io/badge/Jest-Testing-red?logo=jest)
![Supertest](https://img.shields.io/badge/Supertest-API_Tests-lightgrey)
![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-CI-blue?logo=githubactions)


--- 

A lightweight REST API for user registration, login, JWT authentication, protected profile management, admin user management and password reset workflows.


---

## About the Project

User Management Service is a backend service built with Node.js, Express, MongoDB and JWT.

The project demonstrates a realistic user management API with registration, login, password hashing, JWT-based authentication, protected profile routes, admin user management, account status handling and password reset workflows.

It follows a modular backend structure using controllers, routes, middleware, services, utilities and Mongoose models.

---

## Live Deployment

The API is deployed on Render and can be accessed here:

```text
https://user-management-service-1jgc.onrender.com
```

Health check:

```text
https://user-management-service-1jgc.onrender.com/health
```

Swagger API documentation:

```text
https://user-management-service-1jgc.onrender.com/api-docs
```

Note: The service is hosted on Render's free tier. The first request after a period of inactivity may take a little longer because the service can spin down when idle.

---

## Swagger Documentation

Swagger UI is available after starting the application:

```text
http://localhost:3000/api-docs
```

### Swagger Preview

![Swagger UI](docs/swagger-ui.png)

---

## Features

| Feature                | Description                                                    |
| ---------------------- | -------------------------------------------------------------- |
| User Registration      | Create a new user account with strong password validation      |
| Password Hashing       | Passwords are hashed with bcrypt                               |
| Login                  | Authenticate user credentials and return a JWT token           |
| JWT Authentication     | Protect API routes with Bearer Token authentication            |
| User Profile           | Get and update the current authenticated user profile          |
| Password Change        | Change the current user's password after password verification |
| Forgot Password        | Request a password reset link by email                         |
| Reset Password         | Reset password with a time-limited reset token                 |
| Password Policy        | Enforce strong passwords for registration, change and reset    |
| Rate Limiting          | Limit repeated requests to public authentication endpoints     |
| Admin User Management  | List users with pagination and filters                         |
| Account Status Control | Activate or disable user accounts                              |
| MongoDB                | Store user data persistently                                   |
| Swagger/OpenAPI        | Interactive API documentation                                  |
| Automated Tests        | API testing with Jest and Supertest                            |
| Docker Support         | Containerized application and database                         |
| CI/CD Pipeline         | Automated test execution with GitHub Actions                   |


---

## Tech Stack

* Node.js
* Express.js
* MongoDB
* Mongoose
* JWT
* bcrypt
* Nodemailer
* express-rate-limit
* Swagger / OpenAPI
* Jest
* Supertest
* Docker
* Docker Compose
* dotenv   
* GitHub Actions


---


## API Endpoints

| Method | Endpoint                | Description                             | Auth         |
| ------ | ----------------------- | --------------------------------------- | ------------ |
| GET    | `/health`               | Check API service status                | No           |
| POST   | `/auth/register`        | Register a new user                     | No           |
| POST   | `/auth/login`           | Login and receive JWT token             | No           |
| POST   | `/auth/forgot-password` | Request a password reset email          | No           |
| POST   | `/auth/reset-password`  | Reset password with a valid reset token | No           |
| GET    | `/users/me`             | Get current user profile                | Bearer Token |
| PUT    | `/users/me`             | Update current user profile             | Bearer Token |
| PATCH  | `/users/me/password`    | Change current user password            | Bearer Token |
| GET    | `/users`                | List users with pagination and filters  | Admin only   |
| PATCH  | `/users/:id/status`     | Activate or disable a user account      | Admin only   |

---

## Admin User List Query Parameters

The admin user list endpoint supports pagination and simple filtering.

```text
GET /users?page=1&limit=10
GET /users?status=active
GET /users?status=disabled
GET /users?role=user
GET /users?role=admin
GET /users?page=2&limit=5&status=active&role=user
```

Supported query parameters:

| Parameter | Description                    | Default | Allowed values       |
| --------- | ------------------------------ | ------- | -------------------- |
| `page`    | Page number                    | `1`     | Minimum `1`          |
| `limit`   | Number of users per page       | `10`    | `1` to `50`          |
| `status`  | Filter users by account status | -       | `active`, `disabled` |
| `role`    | Filter users by role           | -       | `user`, `admin`      |

The response includes a `pagination` object with the current page, limit, total number of matching users and total pages.

---

## Security and Account Status Behavior

Protected endpoints require a valid Bearer token.

For every protected request, the API checks the current user record in the database. This means that user roles and account status are evaluated from the latest database state, not only from the JWT payload.

Disabled users cannot access protected endpoints, even if they still have an older valid token. This applies to regular users and admins.

If a user account no longer exists, protected requests return `404 Benutzer nicht gefunden`.

This behavior prevents outdated tokens from keeping access after an account has been disabled, deleted, or downgraded.

---

## Password Reset Behavior

The API supports a backend-only password reset flow.

A user can request a password reset link with `POST /auth/forgot-password`. If the email belongs to an active account, the API creates a reset token and sends a reset link by email.

For security reasons, the raw reset token is never stored in the database. Only a SHA-256 hash of the token is stored together with an expiration timestamp.

Password reset tokens expire after 15 minutes by default. The expiry time can be configured with `PASSWORD_RESET_TOKEN_EXPIRY_MINUTES`.

The API returns a generic response for unknown email addresses. This helps prevent user enumeration.

Disabled users cannot request or use password reset tokens.

After a successful password reset, the stored reset token hash and expiration timestamp are cleared so the same token cannot be reused.

---

## Password Policy

The same strong password policy is applied to:

* User registration
* Password change
* Password reset

Passwords must:

* Be between 12 and 128 characters long
* Include at least one lowercase letter
* Include at least one uppercase letter
* Include at least one number
* Include at least one special character

Whitespace does not count as a special character.

---

## Rate Limiting

Public authentication endpoints are protected with request rate limiting.

Protected endpoints:

```text
POST /auth/register
POST /auth/login
POST /auth/forgot-password
POST /auth/reset-password
```

Current limits:

| Endpoint group                     | Limit                             |
| ---------------------------------- | --------------------------------- |
| Register, login and reset password | 20 requests per 15 minutes per IP |
| Forgot password                    | 5 requests per 15 minutes per IP  |

When the limit is exceeded, the API returns:

```json
{
  "message": "Zu viele Anfragen. Bitte versuchen Sie es spaeter erneut."
}
```

The current implementation uses the default in-memory store, which is suitable for this single-instance Render deployment. For multi-instance deployments, a shared store such as Redis should be used.

---

## Project Structure

```text
user-management-service/
├── .github/
│   └── workflows/
│       └── test.yml
├── controllers/
│   ├── authController.js
│   └── userController.js
├── docs/
│   └── swagger-ui.png
├── middleware/
│   ├── authMiddleware.js
│   └── rateLimiters.js
├── models/
│   └── user.js
├── routes/
│   ├── authRoutes.js
│   └── userRoutes.js
├── services/
│   └── emailService.js
├── swagger/
│   └── userSwagger.js
├── tests/
│   ├── admin.api.test.js
│   ├── auth.api.test.js
│   ├── health.test.js
│   └── rateLimit.api.test.js
├── utils/
│   └── passwordPolicy.js
├── .dockerignore  
├── .env.example
├── .gitignore
├── app.js
├── docker-compose.yml
├── Dockerfile
├── index.js
├── package.json
├── package-lock.json
└── README.md
```

---

## Environment Variables

Create a local `.env` file based on `.env.example`.

```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/user-management
JWT_SECRET=your_jwt_secret_here

APP_BASE_URL=http://localhost:3000

SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your_mailtrap_username
SMTP_PASS=your_mailtrap_password
SMTP_FROM="User Management Service <no-reply@example.com>"

PASSWORD_RESET_TOKEN_EXPIRY_MINUTES=15
```

For local email testing, Mailtrap Email Sandbox can be used as an SMTP provider. Real SMTP credentials must be configured in the local `.env` file or in the Render environment settings. Secrets are not committed to the repository.


---

## Installation

```bash
git clone https://github.com/tabari86/user-management-service.git
cd user-management-service
npm install
```

---

## Run the Application

Make sure MongoDB is running locally.

```bash
npm start
```

Server:

```text
http://localhost:3000
```

Swagger UI:

```text
http://localhost:3000/api-docs
```
---

## Docker

Run the complete application stack:

```bash
docker compose up --build
```
For the first startup, Docker will automatically:

- Build the Node.js application image
- Pull the MongoDB image
- Create the required containers
- Create a persistent MongoDB volume

Services:

* Node.js application
* MongoDB database

The API will be available at:

```text
http://localhost:3000
```

Swagger UI:

```text
http://localhost:3000/api-docs
```

Stop the containers:

```bash
docker compose down
```
---


## Continuous Integration (CI)

This project uses GitHub Actions to automatically run the test suite on every push and pull request to the main branch.

Workflow steps:

* Checkout repository
* Setup Node.js
* Install dependencies
* Start MongoDB service
* Run Jest and Supertest tests

This helps ensure that new changes do not break existing functionality.

---

## Current Status

Implemented:

* User registration
* Login
* JWT authentication
* Protected profile route
* Profile update route
* MongoDB connection
* Swagger documentation
* Automated tests with Jest and Supertest
* Dockerfile
* Docker Compose setup
* GitHub Actions CI workflow
* Admin user management
* Admin user list pagination and filtering
* Account activation and disabling
* Password change endpoint
* Forgot password flow
* Reset password flow
* Strong password policy
* Rate limiting for public authentication endpoints
* Mailtrap SMTP integration for password reset emails

Planned improvements:
- Metrics endpoint
- Refresh token flow

---

## Example Requests

### Register

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Test User\",\"email\":\"testuser@example.com\",\"password\":\"TestPassword123!\"}"
```

### Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"testuser@example.com\",\"password\":\"TestPassword123!\"}"
```

### Get Current User

```bash
curl http://localhost:3000/users/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Authentication Flow

1. A user registers with email, password and name.
2. The password is hashed with bcrypt.
3. The user logs in with email and password.
4. The API returns a JWT token.
5. Protected routes require:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## Security Notes

* Passwords are never stored as plain text.
* Passwords are hashed with bcrypt.
* Strong password validation is applied to registration, password change and password reset.
* Public authentication endpoints are protected with rate limiting.
* Password reset tokens are not stored as plain text.
* Password reset tokens are stored as SHA-256 hashes with an expiration timestamp.
* Reset tokens are cleared after successful password reset.
* Protected routes require a valid JWT token.
* Protected routes check the current user status from the database.
* Secret values are stored in `.env`.
* Only `.env.example` is committed to the repository.

---


## Author

**Moj Tabari**

Website:
https://mtintelligence.ai

GitHub:
https://github.com/tabari86

LinkedIn:
https://www.linkedin.com/in/mojtaba-tabari
