## User Management Service

Ein leichtgewichtiger, modular aufgebauter REST-Service für Benutzerverwaltung, Authentifizierung und Autorisierung.
Der Service wurde mit Node.js, Express, MongoDB und JWT entwickelt und bietet eine klare Struktur aus Models, Controllers, Routes und Middleware.

Die API eignet sich als Basiskomponente für größere Backend-Projekte, Microservices oder als Lernprojekt zur Vertiefung moderner Backend-Architektur.

## Features

Registrierung neuer Benutzer (mit Passwort-Hashing via bcrypt)
Sicheres Login mit JWT-Token-Generierung
Authentifizierung per Bearer Token (JWT)
Geschützte Routen wie /users/me
Benutzer-Update (nur eigene Daten)
Klare Projektstruktur (controllers/models/routes/middleware)
Verbindung zu MongoDB (lokal oder Atlas)

## Technologien

Node.js
Express
MongoDB / Mongoose
bcrypt für Passwort-Hashing
jsonwebtoken für Authentifizierung
dotenv für Umgebungskonfiguration

## Projektstruktur

user-management-service/
│── controllers/
│   ├── authController.js
│   └── userController.js
│
│── middleware/
│   └── authMiddleware.js
│
│── models/
│   └── user.js
│
│── routes/
│   ├── authRoutes.js
│   └── userRoutes.js
│
│── .env
│── index.js
│── package.json
│── README.md


##  .env Beispiel

PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/user-management
JWT_SECRET=supergeheimesJWTpasswort123

 ## Beispiel-Requests (Postman)    
# Registrieren
POST http://localhost:3000/auth/register
{
  "name": "Test User",
  "email": "test@example.com",
  "password": "meinpasswort123"
}

# Login
POST http://localhost:3000/auth/login
{
  "email": "test@example.com",
  "password": "meinpasswort123"
}

# Response:
{
  "token": "JWT_TOKEN_HIER...",
  "user": {
    "_id": "...",
    "email": "test@example.com",
    "name": "Test User",
    "role": "user"
  }
}

# Eigene Daten abrufen
GET http://localhost:3000/users/me
Header:
Authorization: Bearer <JWT_TOKEN>




#  # User Management Service (EN)

A lightweight and modular REST service for user registration, authentication and authorization.
Built with Node.js, Express, MongoDB, and JWT, the service provides a clean architecture following the Controller–Model–Route pattern.

This project can be used as a standalone microservice, a backend learning project, or a foundational user authentication layer for larger systems.


## Features

User registration with bcrypt password hashing
Secure login with JWT token generation
Authentication via Bearer Token
Protected routes like /users/me
Update own user profile
Clean folder structure (controllers/models/routes/middleware)
MongoDB connection (local or Atlas)

## Tech Stack
Node.js
Express
MongoDB / Mongoose
bcrypt
jsonwebtoken
dotenv

 ## Example Requests

# Register
POST /auth/register
{
  "name": "Test User",
  "email": "test@example.com",
  "password": "12345678"
}

# Login
POST /auth/login
{
  "email": "test@example.com",
  "password": "12345678"
}

# Get Current User
Authorization: Bearer <token>














