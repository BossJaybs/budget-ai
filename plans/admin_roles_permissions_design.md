# Admin Roles and Permissions Database Schema Design

## Overview
This design adds role-based access control (RBAC) to the existing Prisma schema to support admin features. It introduces a `Role` enum for basic user types and a `Permission` model for granular permissions, enabling flexible authentication and authorization.

## Current Schema Analysis
The existing `User` model includes basic authentication fields (id, email, name, image) and relations to transactions, accounts, and sessions. No role or permission system exists currently.

## Proposed Schema Changes

### 1. Role Enum
```prisma
enum Role {
  USER
  ADMIN
}
```

### 2. Updated User Model
Add a `role` field with a default value of `USER`:
```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String?
  image     String?
  role      Role     @default(USER)  // New field
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  transactions Transaction[]
  accounts     Account[]
  sessions     Session[]
}
```

### 3. Permission Model
A new model to define specific permissions:
```prisma
model Permission {
  id          String           @id @default(uuid())
  name        String           @unique
  description String?
  roles       RolePermission[]

  @@map("permissions")
}
```

### 4. RolePermission Junction Table
Many-to-many relationship between roles and permissions:
```prisma
model RolePermission {
  role         Role
  permissionId String
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@id([role, permissionId])
  @@map("role_permissions")
}
```

## Design Decisions

### Role-Based Access Control (RBAC)
- **Roles**: Simple enum with `USER` and `ADMIN` for basic access levels. `ADMIN` implies elevated privileges.
- **Permissions**: Granular capabilities (e.g., "manage_users", "view_reports") assigned to roles for fine-tuned control.
- **Default Role**: New users default to `USER` role, requiring explicit promotion to `ADMIN`.

### Why Additional Tables for Permissions?
- Roles alone suffice for basic admin/non-admin distinction.
- Permissions provide scalability for future features requiring specific capabilities (e.g., read-only admin, moderator roles).
- The junction table `RolePermission` allows flexible assignment of permissions to roles without modifying the enum.

### Authentication and Authorization Support
- **Authentication**: Remains unchanged; users authenticate via existing email/password or OAuth.
- **Authorization**: 
  - Check `user.role` for basic admin access (e.g., `if (user.role === 'ADMIN')`).
  - For granular control, query user's role permissions (e.g., `user.role` → `RolePermission` → `Permission.name`).
  - Implement middleware in API routes to enforce permissions before executing admin operations.
- **Migration**: Existing users will be assigned `USER` role via default. Admin users can be updated via database migration or admin interface.

### Security Considerations
- Permissions are checked server-side only; never rely on client-side role checks.
- Use database constraints and Prisma relations to maintain data integrity.
- Consider audit logging for role/permission changes.

## Full Updated Schema Snippet
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  USER
  ADMIN
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String?
  image     String?
  role      Role     @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  transactions Transaction[]
  accounts     Account[]
  sessions     Session[]
}

model Account {
  id                String  @id @default(uuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(uuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Transaction {
  id          String   @id @default(uuid())
  userId      String
  amount      Float
  description String
  category    String
  type        String   // 'income' or 'expense'
  date        DateTime @default(now())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

model EmailVerification {
  id        String   @id @default(uuid())
  email     String   @unique
  code      String
  password  String   // Temporary storage for signup
  expires_at DateTime
  createdAt DateTime @default(now())

  @@map("email_verifications")
}

model Permission {
  id          String           @id @default(uuid())
  name        String           @unique
  description String?
  roles       RolePermission[]

  @@map("permissions")
}

model RolePermission {
  role         Role
  permissionId String
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@id([role, permissionId])
  @@map("role_permissions")
}
```

## Next Steps
- Review and approve this design.
- Implement the schema changes using Prisma migrations.
- Update application code to enforce role/permission checks in relevant API routes and UI components.
- Seed initial permissions and assign them to the `ADMIN` role.