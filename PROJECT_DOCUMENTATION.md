# MTG Product Management System - Complete Project Documentation

## Project Overview

This is a comprehensive Magic: The Gathering (MTG) product management system built with React, TypeScript, Supabase, and various MTG data APIs. The system manages sealed MTG products, their pricing data, and verification workflows.

## Architecture Overview

### Frontend
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **Routing**: React Router DOM
- **State Management**: React Context (AuthContext)
- **Data Grid**: AG Grid for complex data tables

### Backend
- **Database**: Supabase PostgreSQL
- **Authentication**: Supabase Auth
- **Edge Functions**: Deno-based serverless functions
- **APIs**: MTGJSON, TCGPlayer (deprecated), Scryfall (alternative)

## Database Schema

### Core Tables

#### `products`
- **Purpose**: Master table for all MTG sealed products
- **Key Fields**:
  - `id`: UUID primary key
  - `name`: Product name
  - `mtgjson_uuid`: MTGJSON identifier
  - `set_code`: MTG set code
  - `type`: Product type (booster_box, bundle, etc.)
  - `tcgplayer_product_id`: TCGPlayer ID for pricing
  - `tcg_is_verified`: Manual verification flag
  - `upc_is_verified`: UPC verification flag
  - `active`: Product status

#### `daily_metrics`
- **Purpose**: Daily pricing data for products
- **Key Fields**:
  - `product_id`: Reference to products table
  - `as_of_date`: Date of pricing data
  - `lowest_item_price`: Lowest listing price
  - `target_product_cost`: Calculated target cost
  - `max_product_cost`: Maximum allowable cost
  - `num_listings`: Number of available listings

#### `product_contents`
- **Purpose**: What's inside each product (packs, cards, etc.)
- **Key Fields**:
  - `product_id`: Reference to products table
  - `contained_name`: Name of contained item
  - `quantity`: How many of this item
  - `rarity`: Rarity of contained items

#### `upc_candidates`
- **Purpose**: Potential UPC matches for products
- **Key Fields**:
  - `product_id`: Reference to products table
  - `scraped_upc`: Discovered UPC code
  - `scraped_name`: Associated product name
  - `wpn_url`: Source URL

## Edge Functions (Supabase)

### 1. `mtgjson-import`
- **Purpose**: Import sealed product data from MTGJSON
- **Features**:
  - Batch processing with resume capability
  - Timeout protection (55s limit)
  - Processes 8 sets per batch
  - Auto-generates product contents
- **Status**: ✅ Working with improvements

### 2. `batch-import-all`
- **Purpose**: Automated batch import coordinator
- **Features**:
  - Calls mtgjson-import in chunks
  - Progress tracking
  - Resume functionality
- **Status**: ✅ Working

### 3. `admin-set-tcg-id`
- **Purpose**: Manually set TCGPlayer IDs for products
- **Status**: ✅ Working

### 4. `fetch-prices`
- **Purpose**: Fetch daily pricing data for verified products
- **Current State**: ❌ Broken (TCGPlayer API issues)
- **Issue**: TCGPlayer API returns "Forbidden" errors

### 5. `tcg-search`
- **Purpose**: Search TCGPlayer for product matches
- **Status**: ❌ Likely broken (same TCGPlayer issues)

## Frontend Pages & Components

### Core Pages
1. **Dashboard** (`/dashboard`) - Main overview
2. **Product Catalog** (`/admin/catalog`) - Product management
3. **Import Status** (`/admin/imports`) - Import job monitoring
4. **TCG Mapping** (`/admin/tcg-mapping`) - TCGPlayer ID assignment
5. **UPC Mapping** (`/admin/upc-mapping`) - UPC verification
6. **Product Detail** (`/admin/products/:id`) - Individual product view

### Key Components
- **DashboardLayout**: Main layout with sidebar navigation
- **AppSidebar**: Navigation sidebar
- **ProtectedRoute**: Authentication wrapper
- **AG Grid Tables**: Complex data displays with filtering/sorting

## Major Accomplishments

### ✅ Successfully Completed

1. **Database Schema Design**
   - Comprehensive product management schema
   - Proper RLS policies for security
   - Foreign key relationships

2. **MTGJSON Integration**
   - Successfully imports 1000+ MTG sealed products
   - Handles product contents and metadata
   - Batch processing with resume capability
   - Fixed syntax errors and timeout issues

3. **Product Management UI**
   - Complete CRUD operations for products
   - Advanced filtering and search
   - Manual verification workflows
   - Bulk operations support

4. **Authentication System**
   - Supabase Auth integration
   - Protected routes
   - Role-based access control

5. **Import System**
   - Robust batch import with progress tracking
   - Error handling and recovery
   - Resume functionality for large datasets

## Current Roadblocks & Issues

### 🚨 Critical Issues

#### 1. TCGPlayer API Access Denied
- **Problem**: TCGPlayer no longer grants new API access
- **Impact**: Cannot fetch current pricing data
- **Current State**: All pricing functions return "Forbidden" errors
- **Evidence**: Fetch-prices logs show consistent 403 errors

#### 2. No Pricing Data Available
- **Problem**: daily_metrics table is empty
- **Impact**: Cannot display current market prices
- **Root Cause**: TCGPlayer API access issues

### 🔄 Proposed Solutions

#### Solution 1: Migrate to Scryfall API
- **API**: Scryfall REST API (https://scryfall.com/docs/api)
- **Advantages**: 
  - Free, no API key required
  - Comprehensive MTG data including prices
  - Reliable uptime and support
  - Includes USD, EUR, and MTGO pricing
- **Implementation**: Replace fetch-prices function with Scryfall calls
- **Data Available**:
  - `prices.usd` - USD market price
  - `prices.usd_foil` - USD foil price
  - `prices.eur` - EUR market price
  - `prices.tix` - MTGO ticket price

#### Solution 2: Alternative Pricing Sources
- **ION Suite**: Enterprise pricing data (invitation only)
- **MTGStocks API**: Community pricing data
- **Web Scraping**: Direct scraping (higher maintenance)

#### Solution 3: Hybrid Approach
- Use Scryfall for individual card pricing
- Aggregate data for sealed product estimates
- Manual price overrides for verified products

## Implementation Roadmap

### Phase 1: Scryfall Integration (Immediate)
1. **Update fetch-prices function**
   - Replace TCGPlayer API calls with Scryfall
   - Map product data to Scryfall search queries
   - Handle rate limiting (100ms between requests)

2. **Data Mapping Strategy**
   - Use set codes and product names for Scryfall queries
   - Map MTGJSON data to Scryfall identifiers
   - Handle edge cases and missing data

3. **Testing & Validation**
   - Test with verified products
   - Validate pricing accuracy
   - Monitor API reliability

### Phase 2: Enhanced Pricing Logic (Week 2)
1. **Intelligent Price Calculation**
   - Aggregate individual card values for sealed products
   - Apply market multipliers based on product type
   - Include rarity-based weighting

2. **Historical Data Tracking**
   - Store price history in daily_metrics
   - Track price trends over time
   - Alert on significant price changes

### Phase 3: Advanced Features (Week 3-4)
1. **Price Prediction**
   - Use historical data for trend analysis
   - Predict optimal buy/sell timing
   - Market volatility indicators

2. **Automated Verification**
   - Cross-reference multiple price sources
   - Auto-verify products with consistent data
   - Flag outliers for manual review

## API Endpoints Documentation

### Current Edge Functions

#### POST `/functions/v1/mtgjson-import`
- **Purpose**: Import MTG products from MTGJSON
- **Parameters**: 
  - `resume` (optional): Set index to resume from
- **Response**: Import statistics and resume token
- **Status**: ✅ Working

#### POST `/functions/v1/batch-import-all`
- **Purpose**: Coordinate full product import
- **Response**: Batch progress and completion status
- **Status**: ✅ Working

#### POST `/functions/v1/admin-set-tcg-id`
- **Purpose**: Manually assign TCGPlayer IDs
- **Parameters**: 
  - `product_id`: Product UUID
  - `tcg_id`: TCGPlayer product ID
- **Status**: ✅ Working

#### POST `/functions/v1/fetch-prices`
- **Purpose**: Fetch current pricing data
- **Status**: ❌ Broken (TCGPlayer API issues)
- **Needs**: Migration to Scryfall API

#### POST `/functions/v1/tcg-search`
- **Purpose**: Search for TCGPlayer matches
- **Status**: ❌ Likely broken (TCGPlayer API issues)

### Proposed New Endpoints

#### POST `/functions/v1/scryfall-prices`
- **Purpose**: Fetch prices from Scryfall API
- **Parameters**: Product IDs or search criteria
- **Implementation**: Replace fetch-prices function

#### GET `/functions/v1/price-history/:product_id`
- **Purpose**: Get historical pricing data
- **Response**: Time series pricing data

#### POST `/functions/v1/verify-pricing`
- **Purpose**: Cross-validate prices across sources
- **Implementation**: Quality assurance endpoint

## Security & Performance Considerations

### Security
- All database operations use RLS policies
- Edge functions require authentication
- API rate limiting implemented
- Input validation on all endpoints

### Performance
- Database indexes on key lookup fields
- Batch processing for large operations
- Caching strategies for frequently accessed data
- Optimized queries with proper joins

## Development Environment

### Local Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Supabase local development
npx supabase start
```

### Key Configuration Files
- `supabase/config.toml` - Supabase configuration
- `tailwind.config.ts` - Styling configuration
- `src/integrations/supabase/` - Database client and types

## Testing Strategy

### Current Testing
- Manual testing through UI
- Edge function logs monitoring
- Database integrity checks

### Recommended Testing
- Unit tests for utility functions
- Integration tests for API endpoints
- End-to-end testing for critical workflows
- Performance testing for large datasets

## Monitoring & Maintenance

### Current Monitoring
- Supabase dashboard for database metrics
- Edge function logs for debugging
- Manual verification workflows

### Recommended Monitoring
- Automated health checks for APIs
- Price data quality monitoring
- Performance metrics tracking
- Error rate alerting

## Conclusion

The MTG Product Management System has a solid foundation with comprehensive product data management and a scalable architecture. The primary blocker is the TCGPlayer API access issue, which can be resolved by migrating to Scryfall API. This migration will restore pricing functionality and enable the system to reach its full potential.

The next immediate step is implementing the Scryfall API integration to restore pricing data collection, followed by enhancing the pricing logic and adding advanced analytics features.

---
**Last Updated**: January 2025  
**Status**: Development - Pricing API Migration Required