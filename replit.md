# SourDough Scout - Pizza Restaurant Finder

## Overview

SourDough Scout is a comprehensive full-stack web application that helps users discover authentic sourdough pizza restaurants across America. The application features an interactive map, search functionality, and detailed restaurant information, making it perfect for travelers seeking naturally leavened pizza on the road.

**Current Status**: Enhanced comprehensive discovery system with two-phase search strategy. Implemented user-suggested improvement: Phase 1 finds ALL pizza restaurants via broad searches, Phase 2 verifies sourdough claims, Phase 3 performs targeted sourdough searches. Enhanced keyword matching now catches hyphenated variations like "sourdough-crust". Currently verified 7 authentic sourdough establishments in San Francisco with 100% authentic data sources.

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
The application features a comprehensive restaurant discovery system focused exclusively on restaurant-controlled content:

#### 1. Google Maps Scraper (`google-maps-scraper.ts`)
- **Google Maps Integration**: Uses Puppeteer to find ALL pizza restaurants from Google Maps search results
- **Business Profile Analysis**: Extracts and analyzes Google Business profile descriptions for sourdough keywords
- **Restaurant Website Analysis**: Analyzes each restaurant's own website for authentic sourdough claims
- **Comprehensive Coverage**: Designed to find every pizza restaurant in a city and verify sourdough through official sources only

#### 2. Reliable Restaurant Scraper (`reliable-restaurant-scraper.ts`)
- **Business Directory Discovery**: Searches business directories and local listings for pizza restaurants
- **Pattern-Based Discovery**: Tests common restaurant website naming patterns (e.g., cityname + pizza.com)
- **Restaurant-Only Content**: Analyzes only restaurant websites and Google Business profiles, never blogs or reviews
- **Portland Success**: Discovered 15+ authentic Portland pizza restaurants including Portland House of Pizza, Antonio's Flying Pizza, and 48 North Pizzeria

#### 3. Google Business Scraper (`google-business-scraper.ts`)
- **Targeted Business Search**: Finds pizza restaurants through targeted Google Business searches
- **Website Verification**: Analyzes discovered restaurant websites for sourdough keywords
- **Dual Source Analysis**: Combines Google Business profile descriptions with restaurant website content
- **Quality Assurance**: Only adds restaurants with verified sourdough claims from official sources

#### 4. Comprehensive Pizza Scraper (`comprehensive-pizza-scraper.ts`)
- **Google Maps Category Search**: Uses Google Maps "Pizza" category filter to find ALL pizza restaurants
- **Complete Coverage**: Scrolls through all results, not limited to top 20 restaurants
- **Name-Independent Discovery**: Finds restaurants without "pizza" in the name using category filtering
- **Dual Verification**: Analyzes both Google Business profiles AND restaurant websites for sourdough keywords
- **Enhanced Data Collection**: Extracts phone numbers, websites, and detailed descriptions

#### 5. Nationwide Discovery System (`execute-nationwide-discovery.ts`)
- **Strategic City Targeting**: 99 cities covering 50 most populated + 50 top tourist destinations
- **Tier-Based Execution**: Prioritizes highest sourdough likelihood markets first
- **API Integration**: Uses Outscraper API for comprehensive restaurant discovery
- **Complete Coverage**: 7,300+ total pizza restaurants across all major US markets
- **Free Implementation**: Operates within 100 free API requests, costing $0.099 total

#### 4. Sourdough Verification Process
All scrapers use strict restaurant-controlled content verification:
- **Keywords**: ONLY 4 approved terms: "sourdough", "naturally leavened", "wild yeast", "naturally fermented"
- **Sources**: Only restaurant websites and Google Business profiles (never blogs, reviews, or third-party content)  
- **Keyword Enforcement**: System rejects any other fermentation terms to maintain sourdough specificity
- **Authenticity**: Ensures all sourdough claims come directly from restaurants themselves using precise terminology

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