# SourDough Scout - Pizza Restaurant Finder

## Overview

SourDough Scout is a full-stack web application that helps users discover authentic sourdough pizza restaurants across America. The application features an interactive map, search functionality, and detailed restaurant information, making it perfect for travelers seeking naturally leavened pizza on the road.

## User Preferences

Preferred communication style: Simple, everyday language.

Key messaging: 
- Position sourdough pizza as "how to find the best pizza" rather than just a directory
- Emphasize that sourdough is a quality indicator - restaurants that choose the complexity of sourdough don't cut corners anywhere else
- Highlight the craftsmanship and expertise required for sourdough (starter maintenance, fermentation timing, expert baking knowledge)
- Explain that sourdough adds layers of complexity that most restaurants avoid, making it an excellent filter for exceptional pizzerias

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

### Advanced Web Scraping System
The application features a comprehensive multi-layer scraping system for discovering authentic sourdough pizza restaurants:

#### 1. Web Discovery Scraper (`web-discovery-scraper.ts`)
- **Comprehensive Restaurant Discovery**: Searches multiple web sources (DuckDuckGo, restaurant directories, food blogs) to discover ALL pizza restaurants in a city
- **Content Analysis**: Analyzes each discovered restaurant's website for sourdough keywords ("sourdough", "naturally leavened", "wild yeast", etc.)
- **Intelligence**: Successfully discovers 60+ pizza restaurants per city and verifies authentic sourdough claims
- **Real Results**: Found and verified The Turning Peel and other Portland restaurants missed by manual searches

#### 2. Restaurant-Focused Scraper (`restaurant-focused-scraper.ts`)
- **Food Guide Extraction**: Parses high-quality local food guides (Eater, OregonLive, Travel Portland) to extract restaurant websites
- **Direct Website Analysis**: Analyzes actual restaurant websites rather than review platforms
- **Portland Success**: Successfully extracted 323 restaurant websites from Portland food guides
- **Verification**: Confirms sourdough claims through direct website content analysis

#### 3. Enhanced Scraper (`enhanced-scraper.ts`)
- **Known Restaurant Database**: Maintains curated lists of potential sourdough restaurants across major cities
- **Website Content Analysis**: Deep analysis of restaurant websites for sourdough verification
- **Multi-City Support**: Includes restaurant leads for Portland, San Francisco, New York, Seattle, Chicago, and Austin

#### 4. Verification Process
All scrapers use consistent sourdough verification:
- **Keywords**: "sourdough", "naturally leavened", "wild yeast", "fermented dough", "starter", "long fermentation"
- **Confidence Scoring**: Weighted scoring based on keyword frequency and context
- **Content Sources**: Analyzes website titles, meta descriptions, body text, and menu sections
- **Quality Control**: Only adds restaurants with verified sourdough claims to database

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