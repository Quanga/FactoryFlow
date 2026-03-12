# AECE Checkpoint - Worker Portal

## Overview

AECE Checkpoint is an employee leave management and attendance tracking system designed for factory workers and administrators. Built for AEC Electronics (Pty) Ltd. The application provides a dual-interface system: a simplified worker portal for factory employees to manage leave requests and clock in/out, and an administrative dashboard for managers to oversee operations, approve leave requests, and manage employee data.

The system emphasizes ease of use for workers (many of whom may have limited technical experience) by offering ID-based login with facial recognition verification, while providing administrators with comprehensive management tools including employee CRUD operations, department management, and system settings configuration.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Full-Stack Architecture Pattern

**Monorepo Structure with Separated Client/Server**
- The application follows a monorepo pattern with clear separation between client (`client/`), server (`server/`), and shared code (`shared/`)
- TypeScript is used throughout the entire stack for type safety
- The build process bundles both client (Vite) and server (esbuild) into a production-ready distribution

**Rationale**: This architecture allows for code sharing (especially schema definitions and types) between frontend and backend while maintaining clear boundaries. The shared schema ensures type consistency across the full stack.

### Frontend Architecture

**React with TypeScript**
- Framework: React 18 with TypeScript
- Build Tool: Vite for fast development and optimized production builds
- Routing: Wouter (lightweight routing library)
- UI Components: shadcn/ui component library (Radix UI primitives + Tailwind CSS)
- Styling: Tailwind CSS with custom design tokens for industrial/factory aesthetic

**State Management & Data Fetching**
- TanStack Query (React Query) for server state management, caching, and synchronization
- Context API for authentication state (`AuthProvider`)
- Local storage for session persistence

**Design System**
- Industrial-themed design with custom fonts (Inter for body, Oswald for headings)
- Neutral color scheme with custom CSS variables
- Responsive design with mobile-first approach
- Accessibility-focused components from Radix UI

**Rationale**: The combination of Vite, React, and TanStack Query provides excellent developer experience and performance. shadcn/ui components offer a consistent, accessible design system that can be customized. The industrial theme matches the factory context of the application.

### Backend Architecture

**Express.js REST API**
- Framework: Express.js for HTTP server
- Runtime: Node.js with ES modules
- Development: tsx for TypeScript execution in development
- Production: Compiled to CommonJS bundle for deployment

**API Design**
- RESTful endpoints organized by domain (`/api/auth`, `/api/users`, `/api/leave-requests`, etc.)
- Middleware for JSON parsing and request logging
- Standardized error handling and response formats

**Rationale**: Express.js provides a mature, well-understood foundation for building REST APIs. The simple architecture is easy to maintain and scale as needed.

### Database Layer

**PostgreSQL with Drizzle ORM**
- Database: PostgreSQL (configured via `DATABASE_URL` environment variable)
- ORM: Drizzle ORM for type-safe database queries
- Schema: Defined in `shared/schema.ts` using Drizzle's schema builder
- Migrations: Managed through `drizzle-kit` (migrations stored in `migrations/`)

**Schema Design**
- **Users**: Stores both workers and managers with role-based differentiation
  - Fields: id, firstName, surname, nickname, email, mobile, homeAddress, gender, role, departmentId, userGroupId (for admins), faceDescriptor, password (hashed, for admins), managerId, secondManagerId, orgPositionId
  - Workers: ID-based authentication (no email/password required), assigned to departments
  - Managers: Email/password authentication, assigned to user groups
  - Dual manager support: Workers can report to two managers via managerId and secondManagerId (for shared department oversight)
- **User Groups**: Organizational units for admin/manager users (similar to departments for workers)
  - Fields: id, name, description
- **Departments**: Organizational units for worker categorization
- **Leave Balances**: Tracks leave allowances per user and type
- **Leave Requests**: Manages leave applications with approval workflow
- **Attendance Records**: Clock in/out records with photo verification
- **Settings**: System-wide configuration (e.g., admin email for notifications, sender email, timezone)
- **Public Holidays**: Calendar of public holidays for leave calculation exclusions
  - Fields: id, name, date, isRecurring (for annual holidays), description
- **Org Positions**: Defines position-based org chart hierarchy (position names and structure only)
  - Fields: id, title, department, parentPositionId, sortOrder
  - Employees are assigned to positions via users.orgPositionId (set on the employee edit page)
  - When positions exist, the org chart uses position hierarchy; otherwise falls back to manager-based tree
- **Notifications**: User notification system for alerts and updates
  - Fields: id, userId, type, title, message, isRead, createdAt

### Backup & Restore System
- Export: Downloads complete JSON backup of all tables including base64 encoded images
- Import: Restores data from backup file, skips existing records to avoid duplicates
- Validate: Checks backup file format and provides record counts before import
- Note: Backup is best used for full restores to empty databases; partial imports may have ID conflicts

**Data Access Pattern**
- Storage abstraction layer (`server/storage.ts`) implements `IStorage` interface
- All database operations go through this interface
- Foreign key relationships with cascade deletes ensure data integrity

**Rationale**: PostgreSQL offers reliability and strong consistency. Drizzle ORM provides type-safe queries that integrate seamlessly with TypeScript, reducing runtime errors. The schema is normalized with proper relationships while maintaining simplicity.

### Authentication & Authorization

**Dual Authentication Modes**
1. **Worker Authentication**: 
   - ID number input
   - Webcam facial verification (simulated in current implementation)
   - No password required for ease of use
   
2. **Admin Authentication**:
   - Email and password credentials
   - Passwords hashed with bcrypt (10 rounds); legacy plaintext passwords auto-upgrade on first login
   - Role verification (must be 'manager' or 'maintainer')

**Password Reset**
- Reset tokens stored in `password_reset_tokens` database table (persistent across restarts)
- Tokens expire after 1 hour; single-use with automatic cleanup

**Session Management**
- Client-side session using localStorage
- User object stored and persisted across page refreshes
- Context API provides auth state to all components

**Rationale**: The dual authentication approach recognizes that factory workers may not have email addresses and need a simpler login method. The ID + face verification provides adequate security while remaining accessible. Administrators require traditional credential-based authentication with bcrypt-hashed passwords for strong security.

### File Upload & Media Handling

**Webcam Integration**
- `react-webcam` library for browser-based photo capture
- Used for attendance clock-in/out verification
- Base64 image encoding for simplicity

**Rationale**: Browser-based webcam capture eliminates the need for mobile apps while providing photo verification. Base64 encoding simplifies storage and transmission (though production might prefer cloud storage URLs).

### Development & Build Pipeline

**Development Workflow**
- Vite dev server on port 5000 with HMR
- Express server runs separately in development
- TypeScript compilation checking via `tsc`

**Production Build**
- Client: Vite builds to `dist/public`
- Server: esbuild bundles to `dist/index.cjs`
- Selected dependencies bundled to reduce syscalls (improved cold start)
- Static files served by Express in production

**Rationale**: Separate dev servers provide the best development experience. The production build optimizes for deployment on platforms like Replit by reducing file system operations.

## External Dependencies

### UI Component Libraries
- **@radix-ui/***: Unstyled, accessible UI primitives (accordion, dialog, dropdown, etc.)
- **shadcn/ui**: Pre-built component recipes using Radix UI + Tailwind CSS
- **lucide-react**: Icon library for consistent iconography
- **react-webcam**: Browser webcam access for photo capture
- **embla-carousel-react**: Carousel/slider functionality

### State Management & Data Fetching
- **@tanstack/react-query**: Server state management, caching, and synchronization
- **wouter**: Lightweight client-side routing (~1.5KB)

### Form Handling & Validation
- **react-hook-form**: Performant form management
- **@hookform/resolvers**: Integration with validation libraries
- **zod**: Runtime type validation and schema definition
- **drizzle-zod**: Generates Zod schemas from Drizzle database schemas

### Styling
- **tailwindcss**: Utility-first CSS framework
- **@tailwindcss/vite**: Vite plugin for Tailwind v4
- **class-variance-authority**: Type-safe component variants
- **tailwind-merge**: Utility for merging Tailwind classes
- **clsx**: Conditional class name construction

### Backend & Database
- **express**: Web application framework
- **drizzle-orm**: TypeScript ORM for PostgreSQL
- **pg**: PostgreSQL client for Node.js
- **drizzle-kit**: CLI tools for migrations and schema management

### Date & Time
- **date-fns**: Modern date utility library

### Development Tools
- **vite**: Build tool and dev server
- **@vitejs/plugin-react**: React support for Vite
- **tsx**: TypeScript execution for Node.js
- **esbuild**: Fast JavaScript bundler (for production server)
- **@replit/vite-plugin-***: Replit-specific development enhancements

### Utilities
- **nanoid**: Unique ID generation
- **cmdk**: Command menu component (for search/navigation)

### Notable Architecture Decisions

1. **No External Authentication Service**: Authentication is implemented in-app rather than using services like Auth0 or Firebase Auth, keeping the stack simple and self-contained.

2. **Base64 Image Storage**: Photos are stored as base64 strings rather than uploaded to cloud storage (S3, Cloudinary), prioritizing simplicity over optimization.

3. **No Real-time Features**: The application uses polling via React Query rather than WebSockets, appropriate for the use case where real-time updates aren't critical.

4. **Bundled Dependencies**: Selected server dependencies are bundled in production to reduce file system operations, optimizing for serverless/container deployment platforms.

5. **Shared Schema Definition**: Database schemas are defined once in TypeScript and used across frontend validation (via Zod) and backend ORM (via Drizzle), ensuring type consistency.