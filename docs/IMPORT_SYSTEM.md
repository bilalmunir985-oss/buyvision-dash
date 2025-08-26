# Import System Documentation

## Overview

The import system is the backbone of this MTG product tracking application. It synchronizes external data sources with your local database to maintain up-to-date product information, contents, and pricing data.

## Why Imports Are Essential

### 1. **Dynamic Product Catalog**
- MTG releases new products frequently (sets, bundles, special editions)
- Product details change (names, contents, release dates)
- Manual entry would be impractical for thousands of products

### 2. **Data Accuracy**
- MTGJSON provides the most comprehensive MTG product database
- Ensures consistent product identification via UUIDs
- Maintains accurate set codes, release dates, and product contents

### 3. **Business Intelligence**
- Fresh pricing data for market analysis
- Historical tracking of product availability
- Automated data collection for decision making

## Import Types

### MTGJSON Import
**Purpose**: Synchronizes MTG product catalog and contents
**Schedule**: Daily at 4:00 AM
**Data Sources**: https://mtgjson.com/api/v5/

### Price Scraping
**Purpose**: Fetches current market prices
**Schedule**: Daily at 4:01 AM  
**Data Sources**: TCGPlayer, other marketplaces

## Database Operations During Import

### MTGJSON Import Process

#### Phase 1: Product Synchronization
```sql
-- For each product from MTGJSON:
-- 1. Check if exists by mtgjson_uuid
SELECT id FROM products WHERE mtgjson_uuid = ?

-- 2a. If NOT EXISTS - INSERT new product
INSERT INTO products (
  mtgjson_uuid, name, set_code, type, 
  release_date, language, raw_json, active
) VALUES (...)

-- 2b. If EXISTS - UPDATE existing product
UPDATE products SET 
  name = ?, set_code = ?, type = ?,
  release_date = ?, raw_json = ?, updated_at = now()
WHERE mtgjson_uuid = ?
```

#### Phase 2: Content Synchronization
```sql
-- For each product with contents:
-- 1. Clear existing contents (ensures accuracy)
DELETE FROM product_contents WHERE product_id = ?

-- 2. Insert fresh contents
INSERT INTO product_contents (
  product_id, contained_name, quantity, rarity
) VALUES (?, ?, ?, ?)
```

### What Happens to Existing Data

#### Products Table
- **Existing Products**: Updated with latest information
- **New Products**: Added to catalog
- **Discontinued Products**: Remain in database but may be marked inactive
- **No Duplicates**: MTGJSON UUID prevents duplicates

#### Product Contents Table
- **Complete Refresh**: All contents deleted and re-inserted for each product
- **Ensures Accuracy**: Handles changes in pack contents or corrections
- **No Orphaned Data**: Clean slate approach prevents stale information

## Data Flow Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   MTGJSON API   │───▶│  Import Function │───▶│  Your Database  │
│                 │    │                  │    │                 │
│ • SetList.json  │    │ • Fetch & Parse  │    │ • products      │
│ • {SET}.json    │    │ • Transform      │    │ • product_cont. │
│ • Product data  │    │ • Upsert Logic   │    │ • daily_metrics │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Import Behavior Examples

### Scenario 1: First Run (Empty Database)
```
Before: 0 products, 0 contents
Action: Import runs
After:  242 products, ~1,200 contents
Result: Fresh catalog populated
```

### Scenario 2: Regular Update (Existing Data)
```
Before: 242 products, 1,200 contents
Action: Import runs (new set released)
After:  267 products, 1,350 contents  
Result: New products added, existing updated
```

### Scenario 3: Product Information Changed
```
Before: Product "ABC Booster" has 15 cards
MTGJSON: Product "ABC Booster" now has 16 cards
Action:  Import runs
After:   Product updated with correct 16 cards
Result:  Data stays accurate with source
```

## Error Handling & Data Integrity

### Transactional Safety
- Each product processed independently
- Failed products don't affect successful ones
- Partial imports are valid and useful

### Data Validation
- Type checking during import
- Null value handling
- Foreign key constraints maintained

### Rollback Strategy
- Products table maintains history via `updated_at`
- Raw JSON stored for debugging
- Manual rollback possible if needed

## Performance Considerations

### Batch Processing
- Sets processed in batches of 10
- Prevents memory overflow
- Allows progress tracking

### Network Efficiency
- Parallel requests where possible
- Timeout handling for unreliable connections
- Graceful degradation on partial failures

### Database Optimization
- Indexes on frequently queried columns
- Efficient upsert operations
- Minimal lock time during updates

## Monitoring & Maintenance

### Success Metrics
- Products added/updated count
- Processing time per batch
- Error rate monitoring

### Common Issues
1. **Network timeouts**: Retry mechanism in place
2. **Data format changes**: Flexible parsing logic
3. **Rate limiting**: Respectful request spacing

### Manual Intervention
When to run manual imports:
- After major MTGJSON updates
- When new sets are announced
- For data verification after issues

## Integration with Application Features

### Product Catalog Page
- Displays imported product data
- Real-time availability based on fresh imports
- Search functionality across imported fields

### TCG/UPC Mapping
- Links imported products to external identifiers
- Enables price tracking and verification
- Supports business workflow automation

### Analytics Dashboard
- Historical trends from imported data
- Market analysis capabilities
- Inventory planning support

## Security Considerations

### Access Control
- Import functions require service role permissions
- RLS policies protect data access
- Audit trail via timestamps

### Data Validation
- Input sanitization during import
- Schema validation against database
- Error logging for security monitoring

This import system ensures your application always has the most current, accurate MTG product information available for business operations.