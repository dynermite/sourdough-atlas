# SourDough Scout - Pizza Restaurant Finder

## Overview

SourDough Scout is a full-stack web application that helps users discover authentic sourdough pizza restaurants across America. The application features an interactive map, search functionality, and detailed restaurant information, making it perfect for travelers seeking naturally leavened pizza on the road.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The client is built using **React 18** with TypeScript, utilizing a modern component-based architecture:
- **Routing**: Uses `wouter` for lightweight client-side routing with support for dynamic routes (`/restaurant/:id`)
- **State Management**: Leverages React Query (`@tanstack/react-query`) for server state management and caching
- **UI Framework**: Built with Radix UI components and Tailwind CSS for consistent, accessible design
- **Component Library**: Uses shadcn/ui component system with customizable variants
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
The server follows a RESTful API pattern built with **Express.js**:
- **Framework**: Express.js with TypeScript for type safety
- **API Structure**: RESTful endpoints under `/api` namespace for restaurant operations
- **Request Handling**: JSON and URL-encoded request parsing with comprehensive error handling
- **Development Integration**: Vite middleware integration for seamless development experience

### Data Storage Solutions
The application uses a **PostgreSQL** database with Drizzle ORM:
- **ORM**: Drizzle ORM for type-safe database operations and migrations
- **Schema Management**: Centralized schema definitions in `shared/schema.ts` using Drizzle's table definitions
- **Database Provider**: Neon Database (@neondatabase/serverless) for serverless PostgreSQL
- **Development Storage**: In-memory storage implementation for development/testing purposes
- **Migration System**: Drizzle Kit for database migrations and schema changes

### Authentication and Authorization
Currently implements a basic user system foundation:
- User creation and retrieval methods defined in storage interface
- Session-based authentication preparation with `connect-pg-simple` for PostgreSQL session storage
- Authentication hooks ready for implementation

### API Design
RESTful API with the following endpoints:
- `GET /api/restaurants` - Retrieve all restaurants
- `GET /api/restaurants/:id` - Get specific restaurant details
- `GET /api/restaurants/search/:query` - Search restaurants by query
- `GET /api/restaurants/city/:city` - Filter restaurants by city
- `GET /api/restaurants/state/:state` - Filter restaurants by state
- `POST /api/restaurants` - Create new restaurant (endpoint structure ready)

The API follows consistent JSON response patterns with proper HTTP status codes and error handling.

## External Dependencies

### Database Services
- **Neon Database**: Serverless PostgreSQL hosting for production data storage
- **Drizzle ORM**: Type-safe ORM for database operations and schema management

### UI and Design
- **Radix UI**: Comprehensive set of accessible, unstyled UI components
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **Font Awesome**: Icon library for consistent iconography
- **Google Fonts**: Inter font family for typography
- **shadcn/ui**: Pre-built component library built on Radix UI

### Development and Build Tools
- **Vite**: Fast build tool and development server
- **React Query**: Server state management and caching
- **Wouter**: Lightweight React router
- **ESBuild**: Fast JavaScript bundler for production builds

### Maps and Location Services
- **Google Maps**: Integration for directions and location services (via window.open to maps.google.com)
- **Geographic Data**: Restaurant locations stored with latitude/longitude coordinates for mapping

The application is structured as a monorepo with shared TypeScript types and schemas, enabling type safety across the full stack while maintaining clear separation of concerns between client, server, and shared code.