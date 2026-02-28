# Schema Explanations

The `schemas/` directory contains JSON Schema (Draft 7) files. These dictate the required properties, data types, and allowed values for the logical blueprint.

### Core Schemas

#### 1. `application.schema.json`
Defines the highest-level metadata about the system (name, version, domain, multi-tenant ability).

#### 2. `modules.schema.json`
Defines high-level domain compartments like `deviceManagement` or `attendance`. Each module lists the roles that have access and its core features.

#### 3. `models.schema.json` & `relationships.schema.json`
The **Object Relational Maps** of the system. 
- Models define entities (`Employee`, `Device`) and their fields.
- Relationships map foreign key associations (`many-to-one`, `one-to-one`).

#### 4. `apis.schema.json`
The logical contracts for communication. Groups REST/RPC endpoints, HTTP verbs, paths, request bodies, and expected response shapes.

#### 5. `roles.schema.json`
Defines standard RBAC (Role-Based Access Control) roles (`admin`, `hr`) and maps them to logical permission identifiers (`user:create`, `device:command`).

### Auxiliary Schemas

#### 6. `events.schema.json` & `realtime.schema.json`
Defines async and pub/sub data flows. Events define payloads (e.g., an `AttendanceEvent` triggered by a camera). Realtime Defines the channels (e.g., `attendance_events`) where these events are broadcast over WebSockets or SSE.

#### 7. `facility.schema.json`
A specialized hierarchy schema to map physical Buildings → Floors → Areas → Cameras.

#### 8. `ui.schema.json`
Defines the logical views (pages) and widgets (components) that the frontend must render, without caring about whether it is built in React, Vue, or Angular.

#### 9. `structure.schema.json`
Defines the standard architectural layer folders (e.g., `controllers`, `services`, `repositories`) required in the generated target project.

---

### How to use Schemas

To validate a newly edited blueprint file:
You can use any standard JSON Schema validator. For example, using `ajv-cli` via Node.js:
```bash
npx ajv-cli validate -s schemas/models.schema.json -d blueprint/models.json
```
