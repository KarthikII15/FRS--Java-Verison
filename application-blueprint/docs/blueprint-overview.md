# Schema-Driven Application Blueprint

## Overview
This folder contains a comprehensive, technology-independent logical blueprint of the **Attendance Intelligence Platform**.

The purpose of this blueprint is to serve as a **single source of truth** for the system's architecture, data models, API contracts, RBAC structure, UI layout, and business logic. It provides all necessary context to regenerate the application from scratch in any modern technology stack (e.g., Node/Express, Python/FastAPI, Java/Spring Boot, React, Angular).

## Folder Structure

```
application-blueprint/
├── schemas/
│   # JSON Schema files defining the shape and validation rules for blueprint files
├── blueprint/
│   # Populated JSON files containing the actual logical data of the application
├── docs/
│   # Explanations and documentation for the blueprint
└── generators/
    # Target directory for future code generation scripts
```

## How It Works

1. **Schemas define validation rules:** Every file in `blueprint/` has a corresponding file in `schemas/` (e.g., `blueprint/models.json` is validated by `schemas/models.schema.json`).
2. **Blueprints describe reality:** The `blueprint/` files contain the pure logical essence of the application abstracted from React or Node.js.
3. **Generators build the app:** In the future, a code generation pipeline (located in `generators/`) will read the validated `blueprint/` files and emit standard source code templates based on the chosen technology stack.

## Getting Started

- To understand the shape of the data, read `docs/schema-explanation.md`.
- To see how the system is logically connected, explore the JSON files sequentially, starting with `blueprint/application.json`, then `modules.json`, `models.json`, and `apis.json`.
