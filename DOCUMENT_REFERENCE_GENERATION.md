# Automatic Document Reference Number Generation

## Overview
The CRPRS system automatically generates unique reference numbers for all documents uploaded to applications. Users can optionally provide their own reference numbers, but the system will generate one if left blank.

## Reference Number Format

### Standard Format
```
DOC-YYYYMM-CATEGORY-NNNNN
```

### Components

1. **Prefix**: `DOC` (Document)
2. **Year-Month**: 6 digits (YYYYMM)
3. **Category**: 3-letter category abbreviation
4. **Sequence**: 5-digit sequence number (padded with zeros)

## Category Abbreviations

| Category        | Abbreviation | Description                    |
|----------------|--------------|--------------------------------|
| APPLICANT      | APP          | Applicant-related documents    |
| PARCEL         | PRC          | Parcel-related documents       |
| RRR            | RRR          | Rights/Restrictions documents  |
| TRANSACTION    | TXN          | Transaction documents          |
| SURVEY         | SRV          | Survey and mapping documents   |
| Other          | DOC          | General documents (fallback)   |

## Reference Number Examples

### By Category and Month

**Applicant Documents (August 2026):**
```
1st document:  DOC-202608-APP-00001
2nd document:  DOC-202608-APP-00002
10th document: DOC-202608-APP-00010
100th document: DOC-202608-APP-00100
```

**Parcel Documents (August 2026):**
```
1st document:  DOC-202608-PRC-00001
2nd document:  DOC-202608-PRC-00002
```

**RRR Documents (August 2026):**
```
1st document:  DOC-202608-RRR-00001
2nd document:  DOC-202608-RRR-00002
```

### Monthly Reset Example
```
August 2026:   DOC-202608-APP-00050
September 2026: DOC-202609-APP-00001  // Sequence resets each month
```

## Generation Rules

### 1. Automatic Generation
- Reference number generated if user leaves field empty
- Based on document category
- Unique within month and category
- Logged for audit trail

### 2. Manual Override
- Users CAN provide custom reference numbers
- Custom numbers must be unique
- System validates before saving
- Useful for external document tracking

### 3. Sequence Numbering
- Counts documents per category per month
- Increments for each new document
- Resets monthly (tied to YYYYMM)
- Zero-padded to 5 digits (supports 99,999 docs/month)

### 4. Uniqueness Guarantee
- Database constraint ensures uniqueness
- Duplicate reference numbers rejected
- Error message returned if duplicate detected

## Implementation Details

### Backend Generation (`document.controller.js`)

```javascript
const generateDocumentReference = async (category) => {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  
  // Count documents this month for this category
  const count = await prisma.document.count({
    where: {
      category,
      createdAt: {
        gte: new Date(`${year}-${month}-01`),
        lt: new Date(year, new Date().getMonth() + 1, 1)
      }
    }
  });
  
  // Category abbreviations
  const categoryAbbrev = {
    'APPLICANT': 'APP',
    'PARCEL': 'PRC',
    'RRR': 'RRR',
    'TRANSACTION': 'TXN',
    'SURVEY': 'SRV'
  };
  
  const abbrev = categoryAbbrev[category] || 'DOC';
  
  return `DOC-${year}${month}-${abbrev}-${String(count + 1).padStart(5, '0')}`;
};
```

### Auto-Generation Logic
```javascript
// In document upload handler
let finalReferenceNumber = reference_number;
if (!finalReferenceNumber || finalReferenceNumber.trim() === '') {
  finalReferenceNumber = await generateDocumentReference(category);
  console.log('Auto-generated document reference:', finalReferenceNumber);
}
```

## Usage in Application

### Document Upload Form

**User Experience:**
1. User selects document file
2. User chooses category (APPLICANT, PARCEL, RRR)
3. User enters document type (e.g., "ID Card", "Title Deed")
4. User can optionally enter reference number OR leave blank
5. System auto-generates reference if blank
6. Document saved with unique reference number

**Frontend Display:**
```javascript
<div className="form-group">
  <label>Reference Number (Optional - Auto-generated)</label>
  <input 
    placeholder="Auto-generated if left empty"
    value={uploadData.reference_number}
  />
  <small>
    Leave empty for automatic generation (e.g., DOC-202608-APP-00001)
  </small>
</div>
```

## Real-World Examples

### Example 1: ID Card Upload
```
Category: APPLICANT
Document Type: National ID Card
Reference Number: (left empty)
Generated: DOC-202608-APP-00001
```

### Example 2: Title Deed Upload
```
Category: PARCEL
Document Type: Title Deed
Reference Number: (left empty)
Generated: DOC-202608-PRC-00001
```

### Example 3: Manual Reference
```
Category: APPLICANT
Document Type: Passport
Reference Number: EXT-PASS-2026-123 (user provided)
Saved As: EXT-PASS-2026-123 (custom retained)
```

### Example 4: Multiple Documents Same Day
```
Time: 10:00 AM
Document: Birth Certificate
Generated: DOC-202608-APP-00023

Time: 10:15 AM
Document: Marriage Certificate
Generated: DOC-202608-APP-00024

Time: 10:30 AM
Document: Tax Clearance
Generated: DOC-202608-APP-00025
```

## Benefits

### 1. **No Manual Entry Required**
- Users don't need to think of reference numbers
- Eliminates errors in numbering
- Reduces form complexity
- Faster document upload

### 2. **Standardized Format**
- Consistent across all documents
- Easy to read and understand
- Machine-parseable for reports
- Category immediately visible

### 3. **Chronological Tracking**
- Year/month embedded in reference
- Easy to find documents by date
- Historical analysis enabled
- Audit trail built-in

### 4. **Category Organization**
- Documents grouped by type
- Easy filtering by category
- Supports specialized workflows
- Clear document purpose

### 5. **Scalability**
- Supports 99,999 documents per category per month
- Monthly reset prevents huge numbers
- No performance bottlenecks
- Future-proof design

## Validation & Error Handling

### Duplicate Detection
```javascript
if (existingDocument) {
  throw new ValidationError('Document with this reference already exists');
}
```

### Empty Reference Handling
```javascript
if (!finalReferenceNumber || finalReferenceNumber.trim() === '') {
  finalReferenceNumber = await generateDocumentReference(category);
}
```

### Logging
```javascript
console.log('Auto-generated document reference:', finalReferenceNumber);
console.log('Document uploaded:', {
  fileName: req.file.originalname,
  reference: finalReferenceNumber,
  category: category
});
```

## Search & Retrieval

Documents can be searched by reference number:

**Exact Match:**
```sql
SELECT * FROM documents WHERE reference_number = 'DOC-202608-APP-00001';
```

**Category Search:**
```sql
SELECT * FROM documents WHERE reference_number LIKE 'DOC-202608-APP-%';
```

**Date Range:**
```sql
SELECT * FROM documents WHERE reference_number LIKE 'DOC-2026%';
```

## Testing Examples

### Test Case 1: Standard Auto-Generation
```javascript
Input:
- Category: APPLICANT
- Document Type: ID Card
- Reference Number: (empty)

Expected Output:
- Reference: DOC-202608-APP-00001
```

### Test Case 2: Custom Reference
```javascript
Input:
- Category: PARCEL
- Document Type: Survey Plan
- Reference Number: EXT-SRV-2026-XYZ

Expected Output:
- Reference: EXT-SRV-2026-XYZ (custom retained)
```

### Test Case 3: Multiple Categories Same Day
```javascript
Applicant Doc 1: DOC-202608-APP-00001
Parcel Doc 1:    DOC-202608-PRC-00001
RRR Doc 1:       DOC-202608-RRR-00001
Applicant Doc 2: DOC-202608-APP-00002
```

### Test Case 4: Month Rollover
```javascript
August 31, 2026:  DOC-202608-APP-00999
September 1, 2026: DOC-202609-APP-00001  // Sequence resets
```

## Troubleshooting

### Issue: "Document with this reference already exists"
**Cause**: Duplicate reference number (manual entry)
**Solution**: 
- Leave reference number blank for auto-generation
- Or provide a different unique reference

### Issue: Wrong category in reference
**Cause**: Category field not matching document type
**Solution**: 
- Select correct category before upload
- Reference number follows category selection

### Issue: Reference not showing after upload
**Cause**: UI not refreshing
**Solution**: 
- Refresh application details page
- Check in documents table
- Verify in database

## API Response Example

```json
{
  "id": "abc123...",
  "application_id": "app123...",
  "category": "APPLICANT",
  "document_type": "National ID Card",
  "reference_number": "DOC-202608-APP-00001",
  "file_name": "id_card.pdf",
  "file_size": "2048576",
  "mime_type": "application/pdf",
  "uploaded_by": "user123",
  "created_at": "2026-08-08T10:30:00Z"
}
```

## Security Considerations

- Reference numbers are not sensitive data
- Can be safely displayed in UI
- Used for tracking and organization
- No PII (Personally Identifiable Information)
- Safe to include in logs and reports

## Future Enhancements

### Potential Improvements
1. ✨ Add document type abbreviations
2. ✨ Support custom prefix per organization
3. ✨ Add check digit for validation
4. ✨ Barcode/QR code generation
5. ✨ Integration with external DMS (Document Management Systems)

### Backwards Compatibility
- Existing documents keep their references
- New format applies to new documents only
- Both formats supported in queries
- No data migration required
