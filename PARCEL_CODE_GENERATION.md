# Automatic Parcel Code Generation

## Overview
The system automatically generates unique parcel codes for all new parcels created during First Registration applications. No manual input is required.

## Parcel Code Format

### Basic Format
```
PRC-[REGION]-[CITY]-YYYYMM-NNNNN
```

### Components

1. **Prefix**: `PRC` (Parcel Registration Code)
2. **Region Code**: First 2 letters of region name (uppercase)
3. **City Code**: First 2 letters of city name (uppercase)
4. **Year-Month**: 6 digits (YYYYMM)
5. **Sequence**: 5-digit sequence number (padded with zeros)

## Examples

### With Region and City
- Region: "Addis Ababa", City: "Bole"
  - Code: `PRC-ADBO-202608-00001`
  
- Region: "Oromia", City: "Adama"
  - Code: `PRC-ORAD-202608-00001`
  
- Region: "Amhara", City: "Bahir Dar"
  - Code: `PRC-AMBA-202608-00001`

### Without Region/City (Fallback)
- No region/city provided
  - Code: `PRC-202608-00001`

## Generation Rules

### 1. Uniqueness Guarantee
- System checks for existing codes before assignment
- Retries up to 10 times if duplicate found
- Adds small delay between retries to ensure unique timestamp

### 2. Regional Prefixing
- **If region provided**: Uses first 2 letters (e.g., "Addis Ababa" → "AD")
- **If city provided**: Uses first 2 letters (e.g., "Bole" → "BO")
- **Combined**: Region + City codes (e.g., "ADBO")
- **If missing**: Uses base "PRC" prefix only

### 3. Sequence Numbering
- Counts parcels created in current year
- Increments for each new parcel
- Resets annually (tied to year in code)
- Zero-padded to 5 digits

### 4. Timestamp Component
- Year and month embedded in code
- Helps organize parcels chronologically
- Enables year-based reporting and filtering

## Implementation Details

### Backend Generation (`application.controller.js`)

```javascript
const generateParcelCode = async (region = null, city = null) => {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  
  // Count parcels this year
  const count = await prisma.parcel.count({
    where: {
      createdAt: {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${year + 1}-01-01`)
      }
    }
  });
  
  // Build prefix
  let prefix = 'PRC';
  if (region) prefix = `${prefix}-${region.substring(0, 2).toUpperCase()}`;
  if (city) prefix = `${prefix}${city.substring(0, 2).toUpperCase()}`;
  
  // Format: PRC[-REGION][-CITY]-YEARMONTH-SEQUENCE
  return `${prefix}-${year}${month}-${String(count + 1).padStart(5, '0')}`;
};
```

### Retry Logic
```javascript
let generatedParcelCode;
let attempts = 0;
const maxAttempts = 10;

while (attempts < maxAttempts) {
  generatedParcelCode = await generateParcelCode(region, city);
  
  const existingParcel = await prisma.parcel.findUnique({
    where: { parcelCode: generatedParcelCode }
  });

  if (!existingParcel) break; // Unique code found
  
  attempts++;
  await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
}
```

## Usage in Applications

### First Registration
When creating a First Registration application:
1. User provides parcel details (area, location, etc.)
2. System automatically generates unique parcel code
3. Parcel is created with auto-generated code
4. Application is linked to new parcel
5. User sees generated code in application details

### Required Fields
For First Registration, user must provide:
- ✅ **Area (sqm)** - Required
- ✅ **Region** - Required (used in code generation)
- ✅ **City** - Required (used in code generation)
- ⚪ Sub City - Optional
- ⚪ Woreda - Optional
- ⚪ Land Use - Optional

### Frontend Display
```javascript
// Form shows informative message
<h3>
  Parcel Information
  <small>
    Parcel code will be automatically generated based on region and city
  </small>
</h3>
```

## Benefits

### 1. **No User Input Required**
- Eliminates manual code entry
- Prevents typos and duplicates
- Reduces form complexity

### 2. **Standardized Format**
- Consistent across all parcels
- Easy to read and understand
- Machine-parseable for reports

### 3. **Location-Based Organization**
- Codes reflect parcel location
- Easy filtering by region/city
- Supports spatial queries

### 4. **Chronological Tracking**
- Year/month embedded in code
- Historical analysis enabled
- Audit trail built-in

### 5. **Scalability**
- Supports millions of parcels
- Year-based sequence reset
- No performance bottlenecks

## Validation & Error Handling

### Duplicate Detection
```javascript
if (existingParcel) {
  throw new BadRequestError(`Parcel with code ${code} already exists`);
}
```

### Generation Failure
```javascript
if (attempts >= maxAttempts) {
  throw new DatabaseError('Failed to generate unique parcel code');
}
```

### Logging
```javascript
console.log('Auto-generated parcel code:', generatedParcelCode);
console.log('Created parcel with code:', newParcel.parcelCode);
```

## Testing Examples

### Test Case 1: Standard Generation
```javascript
Input:
- Region: "Addis Ababa"
- City: "Bole"
- Area: 500 sqm

Expected Output:
- Parcel Code: PRC-ADBO-202608-00001
```

### Test Case 2: Multiple Parcels Same Day
```javascript
First Parcel:  PRC-ADBO-202608-00001
Second Parcel: PRC-ADBO-202608-00002
Third Parcel:  PRC-ADBO-202608-00003
```

### Test Case 3: Different Regions
```javascript
Addis Ababa, Bole:  PRC-ADBO-202608-00001
Oromia, Adama:      PRC-ORAD-202608-00001
Amhara, Bahir Dar:  PRC-AMBA-202608-00001
```

### Test Case 4: Year Rollover
```javascript
December 2026: PRC-ADBO-202612-00999
January 2027:  PRC-ADBO-202701-00001  // Sequence resets
```

## Troubleshooting

### Issue: "Failed to generate unique parcel code"
**Cause**: 10 consecutive codes were duplicates
**Solution**: 
- Check database integrity
- Verify count query accuracy
- Consider increasing retry limit

### Issue: Unexpected code format
**Cause**: Region/city names have special characters
**Solution**: 
- System uses `.substring(0, 2)` which handles most cases
- Special characters automatically handled by uppercase conversion

### Issue: Codes not incrementing
**Cause**: Count query may be filtering incorrectly
**Solution**: 
- Verify date range in count query
- Check timezone handling
- Ensure createdAt field is properly set

## Future Enhancements

### Potential Improvements
1. ✨ Add district/woreda codes
2. ✨ Support custom regional numbering schemes
3. ✨ Add parcel type prefix (RES, COM, IND)
4. ✨ Implement QR code generation
5. ✨ Add check digit for validation

### Backwards Compatibility
- Existing parcels keep their codes
- New format applies to new parcels only
- Both formats supported in queries
