# Registration Officer (RO) Implementation Guide

## Overview
The Registration Officer module implements the complete workflow for registering Rights, Restrictions, and Responsibilities (RRR) on parcels in the CRPRS system, following the requirements for first registration and subsequent registration processes.

## Key Features

### 1. Transaction Management
- **View Transactions**: RO can view all transactions with statuses: CREATED, INITIATED, IN_PROCESS, READY_FOR_APPROVAL, APPROVED
- **Initiate Command**: Allows initiating a CREATED transaction (status changes to INITIATED)
- **Load Command**: Loads complete transaction details for registration (status changes to IN_PROCESS)

### 2. RRR Registration
The RO can register the following types of information:

#### a. Rights Registration
- **Leasehold**: Registration of leasehold rights with lease periods, payments, etc.
- **Old Possession**: Registration of old possession rights
- **Urban Farm**: Registration of urban farmland rights
- **Government Owned**: Registration of government-owned parcels
- **Condominium**: Registration of condominium units

**Required Information:**
- Right type
- Holder information (new or existing party)
- Acquisition type and date
- Start and end dates
- Lease-specific details (for leasehold)
- Ground rent

#### b. Mortgage Registration
- Mortgagee name and type
- Mortgage amount and currency
- Mortgage date
- Loan agreement number
- Description

#### c. Court Injunction Registration
- Court name
- Case number
- Injunction date
- Issued by
- Description

#### d. General Restrictions/Responsibilities
- Restriction type
- Description
- Imposed by
- Imposed date

### 3. Holder Information
The system automatically detects if the holder information is registered as an applicant:
- If holder exists, the system uses existing party information
- If new holder, RO can register holder details including:
  - Natural person: First name, father name, grandfather name, national ID, etc.
  - Legal entity: Organization name, type, registration number
  - Group: Multiple members with share percentages

### 4. Workflow States

```
CREATED → INITIATED → IN_PROCESS → READY_FOR_APPROVAL → APPROVED → DELIVERED
```

**RO Responsibilities:**
1. **CREATED**: View transaction, can initiate
2. **INITIATED**: Can load transaction for registration
3. **IN_PROCESS**: Register RRR information
4. **READY_FOR_APPROVAL**: Finish button marks transaction complete
5. **APPROVED**: SRO/SGO approval (not RO responsibility)
6. **DELIVERED**: FDO delivers certificate (not RO responsibility)

## API Endpoints

### Base URL: `/api/registration`

### 1. Get Transactions for RO
```http
GET /api/registration/transactions
Authorization: Bearer <token>
Role: RO, ADMIN
```

Query Parameters:
- `status`: Filter by status (comma-separated)
- `search`: Search by transaction number, application number, or parcel code
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 100)

Response:
```json
{
  "data": [
    {
      "id": "uuid",
      "transaction_number": "TXN-2024-000001",
      "transaction_type": "REGISTRATION_OF_LEASEHOLD",
      "status": "CREATED",
      "application": {
        "application_number": "APP-2024-000001",
        "application_type": "FIRST_REGISTRATION",
        "applicant_name": "John Doe"
      },
      "parcel": {
        "parcel_code": "PRC-AD-202401-00001",
        "area_sqm": "500.00"
      },
      "created_at": "2024-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 100,
    "pages": 1
  }
}
```

### 2. Load Transaction (Load Command)
```http
GET /api/registration/transactions/:id/load
Authorization: Bearer <token>
Role: RO, ADMIN
```

Returns complete transaction details including:
- Application information
- Parcel details
- Existing rights, mortgages, injunctions
- Documents
- Holder/party information
- History

### 3. Register Right
```http
POST /api/registration/rights
Authorization: Bearer <token>
Role: RO, ADMIN
Content-Type: application/json
```

Request Body:
```json
{
  "transaction_id": "uuid",
  "parcel_id": "uuid",
  "right_type": "LEASEHOLD",
  "holder_party_id": "uuid", // Optional if creating new holder
  
  // New holder information (if holder_party_id not provided)
  "holder_first_name": "John",
  "holder_father_name": "Doe",
  "holder_grandfather_name": "Smith",
  "holder_sex": "M",
  "holder_national_id": "AA123456",
  "holder_phone": "+251911234567",
  "holder_email": "john@example.com",
  
  // Or for legal entity
  "holder_organization_name": "ABC Company Ltd",
  "holder_organization_type": "Private Limited Company",
  "holder_registration_number": "REG-12345",
  "holder_party_type": "LEGAL",
  
  // Right details
  "acquisition_type": "Purchase",
  "acquisition_date": "2024-01-15",
  "start_date": "2024-01-15",
  "end_date": "2124-01-15",
  "lease_period_years": 99,
  "lease_start_date": "2024-01-15",
  "lease_end_date": "2124-01-15",
  "ground_rent": 5000.00,
  "description": "Commercial leasehold for office building"
}
```

### 4. Update Right
```http
PUT /api/registration/rights/:id
Authorization: Bearer <token>
Role: RO, ADMIN
```

Request Body (all fields optional):
```json
{
  "acquisition_type": "Purchase",
  "ground_rent": 5500.00,
  "description": "Updated description"
}
```

### 5. Register Mortgage
```http
POST /api/registration/mortgages
Authorization: Bearer <token>
Role: RO, ADMIN
```

Request Body:
```json
{
  "transaction_id": "uuid",
  "parcel_id": "uuid",
  "mortgagee_name": "Commercial Bank of Ethiopia",
  "mortgagee_type": "Bank",
  "mortgage_amount": 5000000.00,
  "currency": "ETB",
  "mortgage_date": "2024-01-15",
  "loan_agreement_number": "LOAN-2024-0001",
  "description": "Mortgage for property purchase"
}
```

### 6. Register Court Injunction
```http
POST /api/registration/injunctions
Authorization: Bearer <token>
Role: RO, ADMIN
```

Request Body:
```json
{
  "transaction_id": "uuid",
  "parcel_id": "uuid",
  "court_name": "Federal High Court",
  "case_number": "CASE-2024-0001",
  "injunction_date": "2024-01-15",
  "issued_by": "Judge Name",
  "description": "Injunction details"
}
```

### 7. Register General Restriction
```http
POST /api/registration/restrictions
Authorization: Bearer <token>
Role: RO, ADMIN
```

Request Body:
```json
{
  "transaction_id": "uuid",
  "parcel_id": "uuid",
  "restriction_type": "Building Height Restriction",
  "description": "Maximum building height of 20 meters",
  "imposed_by": "City Planning Office",
  "imposed_date": "2024-01-15"
}
```

### 8. Finish Transaction
```http
POST /api/registration/transactions/:id/finish
Authorization: Bearer <token>
Role: RO, ADMIN
```

Marks transaction as READY_FOR_APPROVAL. The system verifies:
- Transaction is in IN_PROCESS status
- At least one right is registered (for registration transactions)

### 9. Get Rights by Parcel
```http
GET /api/registration/parcels/:parcelId/rights
Authorization: Bearer <token>
Role: RO, SRO, ADMIN
```

Returns all rights registered on a specific parcel.

## Workflow Example

### First Registration Process

1. **FDO Creates Application and Transaction**
   - Application type: FIRST_REGISTRATION
   - Transaction type: REGISTRATION_OF_LEASEHOLD
   - Status: CREATED

2. **RO Views Transaction List**
   ```
   GET /api/registration/transactions?status=CREATED
   ```

3. **RO Initiates Transaction**
   ```
   POST /api/transactions/:id/initiate
   ```
   - Status changes: CREATED → INITIATED
   - RO is assigned to transaction
   - Initiate button changes to Load button

4. **RO Loads Transaction**
   ```
   GET /api/registration/transactions/:id/load
   ```
   - Status changes: INITIATED → IN_PROCESS
   - Full transaction details displayed

5. **RO Registers Right Information**
   ```
   POST /api/registration/rights
   ```
   - Register holder information (if new)
   - Register right type (LEASEHOLD)
   - Enter acquisition details
   - Enter lease details

6. **RO Registers Additional Information (if applicable)**
   - Register mortgage: `POST /api/registration/mortgages`
   - Register court injunction: `POST /api/registration/injunctions`
   - Register restrictions: `POST /api/registration/restrictions`

7. **RO Reviews and Updates (if needed)**
   ```
   PUT /api/registration/rights/:id
   ```
   - Incorrect information can be modified
   - Only possible before finishing

8. **RO Finishes Transaction**
   ```
   POST /api/registration/transactions/:id/finish
   ```
   - Status changes: IN_PROCESS → READY_FOR_APPROVAL
   - Transaction ready for SRO approval

## Validation Rules

### Transaction Validation
- Transaction must be in correct status for each operation
- Only INITIATED or IN_PROCESS transactions can have RRR registered
- Cannot modify finished transactions

### Right Registration Validation
- Transaction ID, Parcel ID, and Right Type are required
- Either holder_party_id OR holder information must be provided
- For LEASEHOLD: lease_period_years, lease dates, and ground_rent recommended
- At least one right must be registered before finishing (for registration transactions)

### Mortgage Validation
- Mortgagee name and mortgage amount are required
- Amount must be positive number
- Currency defaults to ETB if not provided

### Court Injunction Validation
- Court name and case number are required
- Injunction date defaults to current date if not provided

### Restriction Validation
- Restriction type and description are required
- Description must not be empty

## Error Handling

Common error responses:

### 404 Not Found
```json
{
  "status": "fail",
  "message": "Transaction not found"
}
```

### 400 Validation Error
```json
{
  "status": "fail",
  "message": "Cannot register rights on transaction with status: APPROVED"
}
```

### 400 Required Fields
```json
{
  "status": "fail",
  "message": "Transaction ID, Parcel ID, and Right Type are required"
}
```

## Database Connection Fix

The database connection timeout issues have been addressed with:
1. Increased connection pool size (max: 20 connections)
2. Longer idle timeout (60 seconds)
3. Keep-alive queries every 20 seconds
4. Proper graceful shutdown handling
5. Statement timeout set to 50 seconds (under Neon's 60-second limit)

## Notes

1. **Holder Detection**: If the holder info is registered as an applicant, the system automatically detects and uses that information (no need for re-registration).

2. **Update Restrictions**: Rights can only be updated if the transaction is not in READY_FOR_APPROVAL, APPROVED, or DELIVERED status.

3. **Multiple Rights**: A parcel can have multiple rights registered over time through different transactions.

4. **Status History**: All status changes are tracked in transaction_history table with timestamps and user information.

5. **Concurrent Registration**: The system supports concurrent registration by multiple ROs on different transactions.

## Testing

Use the following test scenarios:

1. **Happy Path**: Create → Initiate → Load → Register Right → Finish
2. **Multiple RRR**: Register right, mortgage, and injunction on same transaction
3. **Update Flow**: Register right → Update details → Finish
4. **Validation**: Try to register on wrong status, missing fields, etc.
5. **Holder Reuse**: Use existing party as holder vs creating new holder

## Frontend Integration

The frontend should implement:
1. Transaction list view with status filter
2. Initiate/Load buttons that change based on status
3. Registration form with tabs for RRR, Holder, Mortgage, Injunction, Documents, Maps
4. Validation feedback for required fields
5. Success/error notifications
6. Update capability for non-finished transactions
7. Finish button with confirmation dialog

## Security

- All endpoints require authentication (JWT token)
- Role-based authorization (RO or ADMIN)
- User actions are logged in history
- Timestamps track when each action occurred
- Cannot modify or delete completed transactions
