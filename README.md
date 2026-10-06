# Kanban

A real-time Kanban workspace for organising projects, tasks and collaboration.

Kanban provides a simple workspace for creating boards, organising tasks into columns, and keeping changes synchronised in real time. It includes account management, email confirmation, password recovery and profile customisation alongside the core board functionality.

## Try it out

**Live application:** https://kanban-d6zv.onrender.com

> **Note:** The backend runs on a small Render instance and may need a short period to wake up after inactivity. The application sends a background request when public pages are opened so the server can begin starting while the site is being viewed.

---

## Features

### Workspaces and boards

- Create and manage workspaces
- Create boards within workspaces
- Organise boards into columns
- Create, edit and move tasks
- Keep board changes synchronised in real time

### Accounts

- Register with a username, email and password
- Confirm an account through email
- Log in using account credentials
- Request a password reset
- Set a new password through a reset link
- Maintain a user profile with a profile image and biography

### Real-time updates

Board operations use **SignalR** to maintain a persistent connection between the client and server.

Changes made to a board can therefore be propagated to connected clients without requiring the application to repeatedly poll the server.

---

## How it works

The application is split into three main areas:

```text
┌──────────────────────────┐
│      Expo / React        │
│        Frontend          │
│                          │
│  Authentication          │
│  Workspaces              │
│  Boards                  │
│  Tasks                   │
│  User profiles           │
└────────────┬─────────────┘
             │
             │ Real-time communication
             │
┌────────────▼─────────────┐
│       ASP.NET Core       │
│         Backend          │
│                          │
│  Authentication          │
│  Application logic       │
│  Data access             │
└────────────┬─────────────┘
             │
             │
┌────────────▼─────────────┐
│       PostgreSQL         │
│                          │
│  Application data        │
└──────────────────────────┘
```

The frontend provides the application interface, while the backend handles application logic and communication with the database.

Real-time communication keeps connected clients up to date as changes are made.

---

## Technology

| Area | Technology |
|---|---|
| Frontend | React Native / Expo |
| Frontend language | TypeScript |
| Routing | Expo Router |
| Styling | NativeWind |
| Backend | ASP.NET Core 8 |
| Backend language | C# |
| Real-time communication | SignalR |
| ORM | Entity Framework Core |
| Database | PostgreSQL |
| Authentication | JWT |
| Email | MailKit / MimeKit |
| Image storage | Cloudinary |
| Containers | Docker |
| CI | GitHub Actions |
| Backend hosting | Render |
| Database hosting | Neon |

---

## Requirements

To run the project locally, you will need:

- **Node.js** with npm
- **.NET 8 SDK**
- **PostgreSQL database**
- **Git**
- A development environment capable of running an Expo application

Docker can also be used for the backend.

You will additionally need to provide the required environment variables for the backend and frontend.

---

## Running locally

### 1. Clone the repository

```bash
git clone https://github.com/louis3588/kanban.git
cd kanban
```

### 2. Backend

Move into the backend directory:

```bash
cd kanbanBackend
```

Restore the dependencies:

```bash
dotnet restore
```

Create the required environment configuration using the provided `.env.example` file.

The backend can then be started with:

```bash
dotnet run
```

### 3. Frontend

Open another terminal and move into the frontend:

```bash
cd kanbanFrontend
```

Install dependencies:

```bash
npm install
```

Create the required frontend environment configuration using the provided `.env.example` file.

Then start the Expo development server:

```bash
npm start
```

For web development:

```bash
npm run web
```

The frontend can then be opened through the Expo development server.

---

## Environment configuration

The application keeps environment-specific configuration outside of the source code.

Both the frontend and backend include `.env.example` files which show the names of the required environment variables without containing any sensitive values.

Copy the relevant example file into your local environment and provide the appropriate values.

Sensitive values should always be supplied through environment variables rather than committed to the repository.

If you have any issues configuring the local environment, feel free to get in touch.

---

## Testing

The frontend uses Jest and React Native Testing Library.

Run the frontend test suite with:

```bash
npm test
```

The backend contains a separate test project.

From the repository root:

```bash
dotnet test
```

The test suite is also executed through the project's CI pipeline.

---

## Project structure

```text
.
├── kanbanBackend/
│   ├── Controllers/
│   ├── Hubs/
│   ├── Models/
│   ├── Services/
│   ├── Data/
│   └── ...
│
├── kanbanBackend.Tests/
│   └── ...
│
├── kanbanFrontend/
│   ├── src/
│   │   ├── app/
│   │   ├── client/
│   │   ├── components/
│   │   └── ...
│   ├── tests/
│   └── ...
│
├── .github/
│   └── workflows/
│
└── README.md
```

The backend and frontend are intentionally kept as separate applications so that they can be developed, tested and deployed independently.

---

## Deployment

The backend is containerised using Docker and deployed to Render.

The PostgreSQL database is hosted using Neon.

The frontend is built as a web application and deployed separately.

Environment variables are supplied by the hosting platforms so that deployment-specific configuration is kept outside of the source code.
