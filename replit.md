# AI Safety Taxonomy Visualization Application

## Overview

This is a full-stack web application that visualizes AI safety taxonomy data through an interactive sunburst chart. The application provides comprehensive framework mapping for AI safety and security standards including OWASP, NIST, EU AI Act, US EO 14110, and UK AI Whitepaper. Built with React, TypeScript, Express, and D3.js for data visualization.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The application follows a modern full-stack architecture with clear separation between client and server code:

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **UI Library**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for lightweight client-side routing
- **Data Visualization**: D3.js for interactive sunburst charts
- **Build Tool**: Vite with hot module replacement

### Backend Architecture
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js with custom middleware
- **Database**: Drizzle ORM configured for PostgreSQL (using Neon serverless)
- **Data Storage**: Currently using in-memory storage with CSV parsing
- **API Design**: RESTful endpoints with JSON responses

### Data Processing
- CSV parsing for taxonomy data ingestion
- Type-safe schema validation using Zod
- Hierarchical data transformation for visualization

## Key Components

### Client-Side Components
1. **Visualization Layer**
   - `SunburstChart`: Interactive D3.js sunburst visualization
   - `DetailPanel`: Dynamic content display for selected taxonomy items
   - `FrameworkBadge`: Styled framework identification badges

2. **UI Components**
   - Comprehensive Shadcn/ui component library
   - Custom framework-specific styling and colors
   - Responsive design patterns with mobile support

3. **Data Management**
   - React Query for API state management
   - CSV parsing utilities for taxonomy data
   - Search and filtering capabilities

### Server-Side Components
1. **API Layer**
   - RESTful route handlers in `/server/routes.ts`
   - Taxonomy data endpoint with error handling
   - Request/response logging middleware

2. **Storage Layer**
   - Abstract storage interface (`IStorage`)
   - In-memory implementation (`MemStorage`)
   - File system integration for CSV data

3. **Development Tools**
   - Vite integration for development mode
   - Hot reload and error overlay support
   - Replit-specific development features

## Data Flow

1. **Data Ingestion**: CSV files containing taxonomy data are read from the file system
2. **Data Processing**: Raw CSV content is parsed and validated against Zod schemas
3. **API Serving**: Processed data is served via REST endpoints with caching
4. **Client Fetching**: React Query manages data fetching with error handling
5. **Visualization**: D3.js transforms hierarchical data into interactive sunburst charts
6. **User Interaction**: Click events update application state and detail panels

## External Dependencies

### Core Framework Dependencies
- **React Ecosystem**: React 18, React DOM, React Query
- **TypeScript**: Full TypeScript support with strict configuration
- **Express**: Web server framework with middleware support
- **D3.js**: Data visualization and DOM manipulation

### Database and ORM
- **Drizzle ORM**: Type-safe database interactions
- **Neon Database**: Serverless PostgreSQL database
- **Database Migrations**: Drizzle Kit for schema management

### UI and Styling
- **Radix UI**: Headless UI component primitives
- **Tailwind CSS**: Utility-first CSS framework
- **Class Variance Authority**: Component variant management
- **Lucide React**: Icon library

### Development Tools
- **Vite**: Fast build tool and development server
- **ESBuild**: Fast JavaScript bundling
- **PostCSS**: CSS processing with Tailwind integration
- **TSX**: TypeScript execution for development

## Deployment Strategy

### Build Process
1. **Client Build**: Vite compiles React application to static assets
2. **Server Build**: ESBuild bundles Express server for production
3. **Asset Generation**: Static files are output to `dist/public`
4. **Database Setup**: Drizzle migrations prepare PostgreSQL schema

### Environment Configuration
- **Development**: Hot reload with Vite middleware integration
- **Production**: Optimized static serving with Express
- **Database**: Environment-based connection string configuration
- **Replit Integration**: Platform-specific development features

### Key Architectural Decisions

1. **Monorepo Structure**: Shared types and schemas in `/shared` directory enable type safety across client and server
2. **In-Memory Caching**: Current storage strategy prioritizes simplicity over persistence, suitable for read-heavy taxonomy data
3. **Component Library**: Shadcn/ui provides consistent design system with Tailwind integration
4. **Data Visualization**: D3.js chosen for complex interactive charts that require precise control over SVG rendering
5. **Database Preparation**: Drizzle ORM configured for future PostgreSQL integration while maintaining current CSV-based workflow

The architecture balances developer experience, performance, and maintainability while providing a foundation for future enhancements such as user authentication, data persistence, and real-time updates.