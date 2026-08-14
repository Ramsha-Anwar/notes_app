# Notes App

A backend service for creating, organizing, and managing notes, built with **TypeScript**, **TypeORM**, and **PostgreSQL** (hosted on **Supabase**). The project uses PostgreSQL in a hybrid way — combining **relational** tables for structured, related data with **schemaless (JSONB)** storage for flexible, unstructured note content.

## Features

- RESTful API for managing notes
- **Relational data model** — structured entities (e.g., users, notes, tags) with defined relationships via TypeORM
- **Schemaless data storage** — flexible JSONB-based fields for note content that doesn't fit a rigid schema
- PostgreSQL database hosted on Supabase
- Environment-based configuration for local and production use

## Tech Stack

| Layer          | Technology            |
|----------------|------------------------|
| Language       | TypeScript / Node.js   |
| ORM            | TypeORM                |
| Database       | PostgreSQL (Supabase)  |
| Data Modeling  | Relational + JSONB (schemaless) |
| API            | REST                   |

## Why Both Relational and Schemaless?

This project takes a hybrid approach to data modeling:

- **Relational tables** handle data with clear, fixed structure and relationships — e.g., users, note ownership, tags, and shared access.
- **Schemaless (JSONB) columns** handle note content itself, which can vary widely in shape (checklists, rich text blocks, attachments, custom metadata) without requiring schema migrations for every new content type.

This gives the app the integrity and query power of a relational schema where structure matters, and the flexibility of a document-style store where it doesn't.

## Project Structure

```
notes_app/
├── src/
│   ├── entities/       # TypeORM entities (relational models)
│   ├── controllers/    # Route handlers
│   ├── routes/         # API route definitions
│   ├── config/         # Database and app configuration
│   └── index.ts        # App entry point
├── .env.example         # Sample environment variables
├── package.json
└── README.md
```

## Getting Started

### Prerequisites

- Node.js (v18+)
- A Supabase project (or any PostgreSQL instance)
- npm or yarn

### Installation

```bash
git clone https://github.com/Ramsha-Anwar/notes_app.git
cd notes_app
npm install
```

### Environment Setup

Create a `.env` file in the project root based on `.env.example`:

```env
POSTGRES_URL=paste-your-supabase-url-here
```

This should be your Supabase Postgres connection string, found in your Supabase project under **Project Settings → Database → Connection string**.

### Running the App

```bash
npm run dev
```

The server will start on the port defined in your environment configuration (default: `3000`).

## Database

This project uses **TypeORM** to connect to a **PostgreSQL** database hosted on **Supabase**:

- Structured entities (users, notes, tags, and their relationships) are modeled relationally.
- Note content itself is stored in **JSONB** columns, allowing schemaless, flexible data without rigid migrations.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes
4. Open a Pull Request against `main`

## License

This project is licensed under the MIT License.