# MEMETER - Memecoin Alpha Tracker

## Overview

This is a real-time monitoring dashboard for tracking Solana token migrations from Pump.fun to Raydium. The application monitors when tokens hit certain market cap thresholds and migrate to decentralized exchanges, providing analytics on migration patterns, risk assessment, and live tracking capabilities. Built with a modern full-stack architecture using React, Express, and PostgreSQL with real-time WebSocket updates.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **UI Components**: Shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens and dark theme support
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Real-time Updates**: Custom WebSocket hook for live data streaming

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Real-time Communication**: WebSocket server using 'ws' library for live updates
- **Development Server**: Vite integration for hot module replacement in development

### Database Schema Design
- **Tables**: 
  - `tokens`: Core token information including addresses, metadata, and social links
  - `migrations`: Migration events with timestamps, market caps, and transaction details
  - `token_metrics`: Real-time metrics like volume, holder count, and risk scores
  - `risk_analysis`: Comprehensive risk assessment data with multiple risk factors
  - `alerts`: System-generated alerts for threshold events
- **Relationships**: Proper foreign key relationships between tokens and their associated data
- **Data Types**: Decimal precision for financial data, JSONB for flexible metadata storage

### Risk Analysis System
- **Multi-factor Risk Assessment**: Evaluates holder distribution, liquidity, trading patterns, creator activity, and social presence
- **Real-time Risk Scoring**: Continuous risk calculation with scores from 1-10
- **Risk Categories**: Low (1-3), Medium (4-6), High (7-10) risk classifications
- **Alert Generation**: Automated alerts based on risk thresholds and migration events

### Real-time Data Pipeline
- **External Data Source**: Integration with Pump Portal WebSocket API for live token events and swap data
- **Event Processing**: Handles migration events, new token listings, and comprehensive trade/swap updates
- **Enhanced Swap Data**: Real-time tracking of account trades and token-specific transactions
- **Data Enrichment**: Automatic risk analysis and metrics calculation for incoming events
- **Client Broadcasting**: Real-time updates pushed to connected clients via WebSocket
- **Subscription Management**: Dynamic subscription to specific accounts and tokens for targeted monitoring

### API Architecture
- **RESTful Endpoints**: Standard CRUD operations for tokens, migrations, and analytics
- **Query Parameters**: Flexible filtering and search capabilities
- **Error Handling**: Centralized error handling with proper HTTP status codes
- **Request Logging**: Comprehensive request/response logging for debugging

## External Dependencies

### Database
- **Neon Database**: Serverless PostgreSQL database with connection pooling
- **Environment**: Requires `DATABASE_URL` environment variable for database connection

### Third-party Services
- **Pump Portal API**: WebSocket connection to `wss://pumpportal.fun/api/data` for real-time Solana token events
- **Solana Blockchain**: Integration for reading on-chain data and transaction verification

### Development Tools
- **Replit Integration**: Custom Vite plugins for Replit development environment
- **Database Migrations**: Drizzle Kit for schema management and migrations
- **Build Tools**: esbuild for server bundling, Vite for client bundling

### UI/UX Libraries
- **Radix UI**: Accessible component primitives for complex UI elements
- **Lucide React**: Icon library for consistent iconography
- **Date-fns**: Date manipulation and formatting utilities
- **Embla Carousel**: Carousel component for data visualization

### Monitoring and Analytics
- **Custom Analytics**: Built-in migration statistics and risk distribution tracking
- **Real-time Dashboards**: Live updating charts and metrics displays
- **WebSocket Health Monitoring**: Connection status tracking and automatic reconnection