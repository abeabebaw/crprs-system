# Digitization Workflow - DO (Digitizing Officer) Guide

## Overview
The Digitizing Officer (DO) is responsible for converting physical survey data and documents into digital spatial records in the CRPRS system.

## When DO Receives Applications

The DO Panel shows applications in the following statuses:

### **1. READY_FOR_FILE_ATTACHMENT**
- **When**: After FDO creates the application and submits it
- **What it means**: Application is ready for document attachment
- **DO Action**: Review documents, prepare for digitization

### **2. FILE_ATTACHMENT_FINISHED**
- **When**: After all required documents are uploaded by FDO
- **What it means**: All documents are attached, ready for spatial data entry
- **DO Action**: Start digitizing spatial data (corner points, boundaries, etc.)

### **3. IN_PROGRESS**
- **When**: DO has started working on the application
- **What it means**: Digitization is underway
- **DO Action**: Continue adding spatial data, verify measurements

## Complete Application Workflow

```
1. SUBMITTED                          [FDO creates application]
   ↓
2. READY_FOR_FILE_ATTACHMENT          [DO sees it - documents needed]
   ↓
3. FILE_ATTACHMENT_STARTING           [FDO uploads documents]
   ↓
4. FILE_ATTACHMENT_FINISHED           [DO sees it - ready to digitize]
   ↓
5. IN_PROGRESS                        [DO digitizes spatial data]
   ↓
6. FINISHED                           [DO completes digitization]
   ↓
7. COMPLETED                          [Application finalized]
```

## DO Digitization Tasks

### **Step 1: Review Application**
1. Open application from DO Panel
2. Review applicant information
3. Check parcel details (area, location, land use)
4. Verify all required documents are attached

### **Step 2: Enter Basic Parcel Data**
Navigate to "Parcel Digitization" section:

**Required Fields:**
- ✅ **Area (sqm)** - Must match survey document
- ⚪ **Land Use** - Select from dropdown (Residential, Commercial, etc.)
- ⚪ **Geometry (WKT)** - Optional polygon coordinates

**Example Area Entry:**
```
Survey shows: 500.50 m²
Enter: 500.50
```

### **Step 3: Add Corner Points (Border Points)**
Corner points define the vertices of the parcel boundary.

**How to Add:**
1. Click "Add Point" in Border Points section
2. Enter Point Number (e.g., P1, P2, P3)
3. Enter Latitude (e.g., 9.0320)
4. Enter Longitude (e.g., 38.7578)
5. Click "Add Point"

**Example Entry:**
```
Point Number: P1
Latitude:  9.032045
Longitude: 38.757812
```

**Point Numbering:**
- Use sequential numbers: P1, P2, P3, P4...
- Or use compass directions: NW, NE, SE, SW
- Be consistent throughout the parcel

**Tips:**
- Start from Northwest corner
- Go clockwise or counterclockwise
- First point should close the polygon

### **Step 4: Add Boundary Lines**
Boundary lines connect corner points and define parcel edges.

**How to Add:**
1. Click "Add Line" in Boundary Lines section
2. Enter Line Number (e.g., L1, L2)
3. Enter Length in meters (e.g., 50.00)
4. Click "Add Line"

**Example Entry:**
```
Line Number: L1
Length: 50.00 m
(Represents line from P1 to P2)
```

**Line Numbering:**
- Match to boundary sides: L1 (North), L2 (East), L3 (South), L4 (West)
- Or use sequential: L1, L2, L3, L4...

### **Step 5: Create Geometry (Optional Advanced)**
If you have full polygon coordinates:

**WKT Format:**
```
POLYGON((lon1 lat1, lon2 lat2, lon3 lat3, lon4 lat4, lon1 lat1))
```

**Example:**
```
POLYGON((38.7578 9.0320, 38.7580 9.0320, 38.7580 9.0325, 38.7578 9.0325, 38.7578 9.0320))
```

**Rules:**
- Start and end with same coordinate (closes polygon)
- Use longitude first, then latitude
- Separate coordinates with commas
- At least 3 unique points required

### **Step 6: Save and Verify**
1. Click "Save Parcel Data"
2. Verify all information is correct
3. Check that calculated area matches survey
4. Ensure all corner points are added
5. Confirm all boundary lines are recorded

## Data Entry Examples

### **Example 1: Residential Parcel**
```
Application: APP-2026-000123
Parcel Code: PRC-ADBO-202608-00045 (auto-generated)
Area: 350.00 sqm
Land Use: Residential
Region: Addis Ababa
City: Bole

Corner Points:
- P1: 9.032045, 38.757812
- P2: 9.032045, 38.757920
- P3: 9.031945, 38.757920
- P4: 9.031945, 38.757812

Boundary Lines:
- L1 (North): 12.00 m
- L2 (East):  29.17 m
- L3 (South): 12.00 m
- L4 (West):  29.17 m
```

### **Example 2: Commercial Parcel**
```
Application: APP-2026-000124
Parcel Code: PRC-ORAD-202608-00012 (auto-generated)
Area: 1500.00 sqm
Land Use: Commercial
Region: Oromia
City: Adama

Corner Points:
- NW: 8.540123, 39.267890
- NE: 8.540123, 39.268234
- SE: 8.539890, 39.268234
- SW: 8.539890, 39.267890

Boundary Lines:
- North: 38.50 m
- East:  39.00 m
- South: 38.50 m
- West:  39.00 m
```

## DO Dashboard Statistics

The DO Panel shows:
- **Pending Digitization**: Applications with status READY_FOR_FILE_ATTACHMENT or FILE_ATTACHMENT_FINISHED
- **Digitized**: Applications with status IN_PROGRESS
- **Total Applications**: All applications assigned to DO

## Common Issues & Solutions

### **Issue 1: Can't find application**
**Cause**: Application not in correct status
**Solution**: 
- Check with FDO to ensure application is submitted
- Verify documents are uploaded
- Application must be in READY_FOR_FILE_ATTACHMENT or later status

### **Issue 2: Duplicate point number**
**Error**: "Point P1 already exists for this parcel"
**Solution**: 
- Use different point number (P2, P3, etc.)
- Or delete existing point and re-add

### **Issue 3: Invalid coordinates**
**Cause**: Latitude/Longitude out of range or wrong format
**Solution**:
- Latitude should be between -90 and 90
- Longitude should be between -180 and 180
- Use decimal degrees (not DMS format)
- Example: 9.0320, not 9°01'55"

### **Issue 4: Area mismatch**
**Cause**: Calculated area doesn't match survey
**Solution**:
- Double-check corner point coordinates
- Verify boundary line lengths
- Recalculate using survey measurements
- Contact surveyor if discrepancy persists

## Quality Assurance Checklist

Before completing digitization:

- [ ] Application details reviewed
- [ ] All documents verified
- [ ] Parcel area matches survey (±0.5%)
- [ ] All corner points added (minimum 3)
- [ ] All boundary lines recorded
- [ ] Point coordinates verified
- [ ] Line lengths match survey
- [ ] Geometry closes properly (first = last point)
- [ ] Land use selected appropriately
- [ ] No duplicate point/line numbers
- [ ] Data saved successfully

## DO Responsibilities

### **Primary Tasks:**
1. ✅ Review submitted applications
2. ✅ Verify document completeness
3. ✅ Enter spatial data from surveys
4. ✅ Create corner points (border points)
5. ✅ Record boundary lines
6. ✅ Validate coordinates and measurements
7. ✅ Ensure data accuracy
8. ✅ Update application status to IN_PROGRESS
9. ✅ Complete digitization

### **Quality Standards:**
- Accuracy: ±0.5 meters for coordinates
- Completeness: All survey data digitized
- Timeliness: 2-3 days per application
- Verification: Cross-check with paper records

## Access & Permissions

DO has access to:
- ✅ DO Panel dashboard
- ✅ Applications (view and update)
- ✅ Parcel data (create and update)
- ✅ Border points (create and delete)
- ✅ Boundary lines (create and delete)
- ✅ Documents (view only)
- ✅ Reports and dashboard

DO cannot:
- ❌ Create applications (FDO only)
- ❌ Create transactions (FDO only)
- ❌ Approve applications (RO only)
- ❌ Register rights (RO only)

## Workflow Integration

### **With FDO (Field Data Officer):**
1. FDO creates application → DO receives notification
2. FDO uploads documents → DO reviews and digitizes
3. DO completes digitization → FDO proceeds to next step

### **With RO (Registration Officer):**
1. DO completes digitization → Application moves to RO
2. RO reviews digitized data
3. RO approves or requests corrections
4. DO makes corrections if needed

## Performance Metrics

Track your productivity:
- Applications digitized per day
- Average time per application
- Error rate (corrections needed)
- Quality score (accuracy of data)

## Training & Support

### **Required Skills:**
- Reading survey plans and maps
- Understanding coordinate systems
- Basic GIS knowledge
- Attention to detail
- Data accuracy verification

### **Resources:**
- Survey reading guide
- Coordinate conversion tools
- WKT format reference
- Common error solutions

## Contact & Escalation

**For technical issues:**
- System Administrator

**For survey discrepancies:**
- Surveying Department

**For application questions:**
- FDO or Application submitter

**For approval delays:**
- Registration Officer (RO)
