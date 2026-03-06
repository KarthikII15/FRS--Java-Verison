# Code Generators

This directory is reserved for future code generation pipelines and templates.

## The Goal
The end goal is to achieve **One-Click Regeneration**. 
A CLI tool residing here will parse the `../blueprint/*.json` files and dynamically generate a full functional codebase in a target language.

## Planned Generator Flow
1. **Validation Phase:** Load all `../blueprint/*.json` files and validate them against `../schemas/*.schema.json`.
2. **Resolution Phase:** Resolve all reference ID pointers (e.g., connecting a `refereCreate a new folder named application-blueprint/ at the root of the project.

Inside this folder, generate a complete schema-driven blueprint for the existing application so that the entire system can be regenerated in the future regardless of tech stack (JavaScript, TypeScript, Python, Java, etc.).

The blueprint must be technology-independent and describe the logical architecture, not implementation details.

The goal is to create a Schema-Driven Application Skeleton that can rebuild the entire application quickly.

🔷 Folder Structure

Create this structure:

application-blueprint/

  schemas/
    application.schema.json
    modules.schema.json
    models.schema.json
    apis.schema.json
    roles.schema.json
    events.schema.json
    facility.schema.json
    ui.schema.json
    realtime.schema.json
    structure.schema.json

  blueprint/

    application.json
    modules.json
    models.json
    relationships.json
    apis.json
    roles.json
    events.json
    facility.json
    ui-pages.json
    components.json
    realtime.json
    structure.json
    business-rules.json

  docs/
    blueprint-overview.md
    schema-explanation.md

  generators/
    README.md
🔷 Requirements

The blueprint must represent the current system including:

Modules

Include modules:

Authentication

Device Management

Facility Intelligence

Floor Mapping

Employee Management

Attendance

Presence Monitoring

Admin Panel

HR Panel

🔷 Application Schema

Create:

schemas/application.schema.json

Define:

application name

version

modules

roles

multi-tenant support

Example structure:

application
version
domain
roles
modules
multiTenant
🔷 Modules Schema

Create:

schemas/modules.schema.json

Each module must include:

name

description

roles

features

Modules must include:

DeviceManagement

FacilityIntelligence

FloorMapping

Attendance

PresenceMonitoring

EmployeeManagement

🔷 Models Schema

Create:

schemas/models.schema.json

Define models:

Employee

Device

Building

Floor

Area

AttendanceEvent

PresenceSession

Shift

Department

User

Each model must include:

fields

type

primary key

required

description

🔷 Relationships Schema

Create:

blueprint/relationships.json

Define relationships:

Employee → Department
Employee → Shift
Device → Floor
Floor → Building
Area → Floor
AttendanceEvent → Employee
AttendanceEvent → Device

🔷 API Schema

Create:

schemas/apis.schema.json

Define APIs:

Employee APIs

GET /employees
POST /employees
PUT /employees/{id}
DELETE /employees/{id}

Device APIs

GET /devices
POST /devices
PUT /devices/{id}
DELETE /devices/{id}

Attendance APIs

GET /attendance
POST /attendance/events

Presence APIs

GET /presence
🔷 Roles Schema

Create:

schemas/roles.schema.json

Define roles:

Admin:

Manage devices

Manage facility

Configure system

HR:

Manage employees

Manage shifts

View attendance

🔷 Events Schema

Create:

schemas/events.schema.json

Define device events:

AttendanceEvent

Fields:

employee_id

device_id

event_type

timestamp

confidence_score

Event types:

ENTRY

EXIT

🔷 Facility Schema

Create:

schemas/facility.schema.json

Define:

Buildings
Floors
Areas
Cameras

Each must include:

id

name

description

🔷 UI Schema

Create:

schemas/ui.schema.json

Define pages:

Admin Pages:

Device Dashboard

Facility Console

Floor Controller

HR Pages:

Attendance Dashboard

Presence Monitor

Employee Management

Each page must include:

module

roles

components

🔷 Realtime Schema

Create:

schemas/realtime.schema.json

Define channels:

device_status

attendance_events

alerts

🔷 Folder Structure Schema

Create:

schemas/structure.schema.json

Define logical structure:

Frontend:

pages

components

services

Backend:

controllers

services

models

🔷 Blueprint Files

Generate realistic blueprint files inside:

blueprint/

Populate them with meaningful sample data.

Do not leave empty.

🔷 Documentation

Create:

docs/blueprint-overview.md

Explain:

Purpose of blueprint

How it helps regenerate application

Folder explanations

Create:

docs/schema-explanation.md

Explain:

Each schema file

How to use schemas

How to extend schemas

🔷 Generator README

Create:

generators/README.md

Explain:

Future goal:

Blueprint → Generated application

🔷 Important Constraints

The blueprint must:

Be technology-independent

Not include React-specific code

Not include Node-specific code

Not include TypeScript syntax

It must describe:

Logical system only.nce` field in a model to its target model).
3. **Emission Phase:**
   - Loop through `modules.json` to create domain folders.
   - Loop through `models.json` and generate ORM classes (e.g., Prisma, TypeORM, SQLAlchemy).
   - Loop through `apis.json` and generate Controller/Route boilerplate.
   - Loop through `ui-pages.json` and generate frontend routing tables.

## Example Target Stacks
- **Backend:** Node.js + Express + Prisma + PostgreSQL
- **Backend:** Python + FastAPI + SQLAlchemy
- **Frontend:** React + Vite + Tailwind 

*Generators will be implemented in future iterations.*
