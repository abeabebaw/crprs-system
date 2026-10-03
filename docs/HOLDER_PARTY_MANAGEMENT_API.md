# Holder/Party Management API Documentation

## Overview
The Holder/Party Management system allows Registration Officers to register three types of parties (holders) who can have rights over land parcels:
1. **Natural Person** - Individual landholders
2. **Legal Person** - Organizations (companies, associations, embassies, etc.)
3. **Group Party** - Family groups or multiple holders with shared ownership

## Base URL
```
/api/registration
```

## Party Types

### 1. Natural Person
Individual landholders with personal information including:
- Personal details (names, gender, birth date)
- Identification (National ID, Personal ID Type)
- Contact information
- Tutorship information (if under guardianship)

### 2. Legal Person
Organizations including:
- Company/Institution details
- Registration/TIN number
- Legal representative information
- Contact information

### 3. Group Party
Family or group ownership with:
- Group name and type
- Multiple members with share percentages
- Representative information
- Tutorship (if applicable)

---

## API Endpoints

### 1. Register Natural Party

**Endpoint:** `POST /api/registration/parties/natural`

**Authorization:** Bearer Token (Role: RO, ADMIN)

**Description:** Register a natural person (individual) as a party/holder on a parcel.

**Request Body:**
```json
{
  "parcel_id": "uuid",
  "first_name": "Ahmed",
  "father_name": "Mohammed",
  "grandfather_name": "Ali",
  "mother_name": "Fatima",
  "sex": "M",
  "date_of_birth": "1985-03-15",
  "birth_place": "Addis Ababa",
  "marital_status": "Married",
  "national_id": "AA123456789",
  "personal_id_type": "National ID",
  "phone": "+251911234567",
  "email": "ahmed@example.com",
  "address": "Bole, Addis Ababa",
  "is_under_tutorship": false,
  "tutor_name": null
}
```

**Required Fields:**
- `parcel_id` - UUID of the parcel
- `first_name` - First name of the person
- `father_name` - Father's name (patronymic)

**Optional Fields:**
- `grandfather_name` - Grandfather's name
- `mother_name` - Mother's name
- `sex` - Gender (M/F)
- `date_of_birth` - Birth date (ISO 8601 format)
- `birth_place` - Place of birth
- `marital_status` - Marital status
- `national_id` - National identification number
- `personal_id_type` - Type of ID (National ID, Passport, etc.)
- `phone` - Contact phone number
- `email` - Email address
- `address` - Physical address
- `is_under_tutorship` - Boolean, true if under guardianship
- `tutor_name` - Name of tutor/guardian (required if `is_under_tutorship` is true)

**Tutorship Fields (if under tutorship):**
- `tutor_first_name`
- `tutor_father_name`
- `tutor_grandfather_name`

**Success Response:** `201 Created`
```json
{
  "id": "uuid",
  "parcel_id": "uuid",
  "party_type": "NATURAL",
  "first_name": "Ahmed",
  "father_name": "Mohammed",
  "grandfather_name": "Ali",
  "sex": "M",
  "date_of_birth": "1985-03-15",
  "national_id": "AA123456789",
  "phone": "+251911234567",
  "email": "ahmed@example.com",
  "address": "Bole, Addis Ababa",
  "is_under_tutorship": false,
  "tutor_name": null,
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-15T10:00:00Z"
}
```

**Error Responses:**
- `400 Bad Request` - Missing required fields or validation error
- `404 Not Found` - Parcel not found
- `401 Unauthorized` - Invalid or missing authentication token
- `403 Forbidden` - Insufficient permissions

---

### 2. Register Legal Party

**Endpoint:** `POST /api/registration/parties/legal`

**Authorization:** Bearer Token (Role: RO, ADMIN)

**Description:** Register a legal person (organization) as a party/holder on a parcel.

**Request Body:**
```json
{
  "parcel_id": "uuid",
  "organization_name": "ABC Company PLC",
  "organization_type": "Private Limited Company",
  "registration_number": "REG-2024-00123",
  "tin_number": "TIN-001234567",
  "phone": "+251116789012",
  "email": "info@abccompany.com",
  "address": "Kazanchis, Addis Ababa",
  "representative_first_name": "Abebe",
  "representative_father_name": "Kebede",
  "representative_grandfather_name": "Alemu",
  "representative_sex": "M",
  "representative_personal_id_type": "National ID",
  "representative_personal_id": "AA987654321"
}
```

**Required Fields:**
- `parcel_id` - UUID of the parcel
- `organization_name` - Name of the organization
- `organization_type` - Type of organization (Company, Association, Embassy, Public Body, etc.)

**Optional Fields:**
- `registration_number` - Official registration number
- `tin_number` - Tax Identification Number
- `phone` - Contact phone number
- `email` - Email address
- `address` - Physical address
- `representative_first_name` - Legal representative's first name
- `representative_father_name` - Legal representative's father name
- `representative_grandfather_name` - Legal representative's grandfather name
- `representative_sex` - Legal representative's gender
- `representative_personal_id_type` - Type of representative's ID
- `representative_personal_id` - Representative's ID number

**Success Response:** `201 Created`
```json
{
  "id": "uuid",
  "parcel_id": "uuid",
  "party_type": "LEGAL",
  "organization_name": "ABC Company PLC",
  "organization_type": "Private Limited Company",
  "registration_number": "REG-2024-00123",
  "phone": "+251116789012",
  "email": "info@abccompany.com",
  "address": "Kazanchis, Addis Ababa",
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-15T10:00:00Z"
}
```

---

### 3. Register Group Party

**Endpoint:** `POST /api/registration/parties/group`

**Authorization:** Bearer Token (Role: RO, ADMIN)

**Description:** Register a group party (family or multiple holders) with shared ownership.

**Request Body:**
```json
{
  "parcel_id": "uuid",
  "group_party_name": "Alemu Family Group",
  "group_party_type": "Family Group",
  "phone": "+251911234567",
  "email": "alemufamily@example.com",
  "address": "Merkato, Addis Ababa",
  "is_under_tutorship": false,
  "tutor_name": null,
  "members": [
    {
      "first_name": "Alemu",
      "father_name": "Kebede",
      "grandfather_name": "Tadesse",
      "sex": "M",
      "national_id": "AA111111111",
      "share_percentage": 40.0,
      "phone": "+251911111111"
    },
    {
      "first_name": "Almaz",
      "father_name": "Getachew",
      "grandfather_name": "Haile",
      "sex": "F",
      "national_id": "AA222222222",
      "share_percentage": 30.0,
      "phone": "+251922222222"
    },
    {
      "first_name": "Biruk",
      "father_name": "Alemu",
      "grandfather_name": "Kebede",
      "sex": "M",
      "national_id": "AA333333333",
      "share_percentage": 30.0,
      "phone": "+251933333333"
    }
  ]
}
```

**Required Fields:**
- `parcel_id` - UUID of the parcel
- `group_party_name` - Name of the group

**Optional Fields:**
- `group_party_type` - Type of group (default: "Family Group")
- `phone` - Contact phone number
- `email` - Email address
- `address` - Physical address
- `is_under_tutorship` - Boolean
- `tutor_name` - Guardian name (if under tutorship)
- `members` - Array of group members

**Member Fields:**
- `first_name` (required)
- `father_name` (required)
- `grandfather_name`
- `sex`
- `national_id`
- `share_percentage` - Ownership percentage (should total 100%)
- `phone`

**Success Response:** `201 Created`
```json
{
  "id": "uuid",
  "parcel_id": "uuid",
  "party_type": "GROUP",
  "organization_name": "Alemu Family Group",
  "organization_type": "Family Group",
  "phone": "+251911234567",
  "email": "alemufamily@example.com",
  "address": "Merkato, Addis Ababa",
  "is_under_tutorship": false,
  "group_members": [
    {
      "id": "uuid",
      "group_party_id": "uuid",
      "first_name": "Alemu",
      "father_name": "Kebede",
      "grandfather_name": "Tadesse",
      "sex": "M",
      "national_id": "AA111111111",
      "share_percentage": "40.00",
      "phone": "+251911111111",
      "created_at": "2024-01-15T10:00:00Z"
    },
    {
      "id": "uuid",
      "group_party_id": "uuid",
      "first_name": "Almaz",
      "father_name": "Getachew",
      "grandfather_name": "Haile",
      "sex": "F",
      "national_id": "AA222222222",
      "share_percentage": "30.00",
      "phone": "+251922222222",
      "created_at": "2024-01-15T10:00:00Z"
    }
  ],
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-15T10:00:00Z"
}
```

---

### 4. Add Member to Group Party

**Endpoint:** `POST /api/registration/parties/group/:groupPartyId/members`

**Authorization:** Bearer Token (Role: RO, ADMIN)

**Description:** Add a new member to an existing group party.

**URL Parameters:**
- `groupPartyId` - UUID of the group party

**Request Body:**
```json
{
  "first_name": "Selam",
  "father_name": "Alemu",
  "grandfather_name": "Kebede",
  "sex": "F",
  "national_id": "AA444444444",
  "share_percentage": 0.0,
  "phone": "+251944444444"
}
```

**Required Fields:**
- `first_name`
- `father_name`

**Success Response:** `201 Created`
```json
{
  "id": "uuid",
  "group_party_id": "uuid",
  "first_name": "Selam",
  "father_name": "Alemu",
  "grandfather_name": "Kebede",
  "sex": "F",
  "national_id": "AA444444444",
  "share_percentage": "0.00",
  "phone": "+251944444444",
  "created_at": "2024-01-15T10:00:00Z"
}
```

---

### 5. Update Party

**Endpoint:** `PUT /api/registration/parties/:id`

**Authorization:** Bearer Token (Role: RO, ADMIN)

**Description:** Update party information. The update fields depend on the party type.

**URL Parameters:**
- `id` - UUID of the party

**Request Body (Natural Person):**
```json
{
  "first_name": "Ahmed",
  "father_name": "Mohammed",
  "phone": "+251911234567",
  "email": "newemail@example.com",
  "address": "New Address, Addis Ababa"
}
```

**Request Body (Legal Person):**
```json
{
  "organization_name": "ABC Company PLC",
  "phone": "+251116789012",
  "email": "newinfo@abccompany.com"
}
```

**Request Body (Group Party):**
```json
{
  "group_party_name": "Updated Family Group",
  "phone": "+251911234567"
}
```

**Notes:**
- All fields are optional (only include fields to update)
- Cannot update if associated with a finished transaction (READY_FOR_APPROVAL, APPROVED, or DELIVERED status)

**Success Response:** `200 OK`
```json
{
  "id": "uuid",
  "party_type": "NATURAL",
  "first_name": "Ahmed",
  "father_name": "Mohammed",
  "phone": "+251911234567",
  "email": "newemail@example.com",
  "updated_at": "2024-01-15T11:00:00Z"
}
```

**Error Response:**
- `400 Bad Request` - Cannot update party associated with finished transaction
- `404 Not Found` - Party not found

---

### 6. Update Group Member

**Endpoint:** `PUT /api/registration/parties/group/members/:id`

**Authorization:** Bearer Token (Role: RO, ADMIN)

**Description:** Update a group member's information.

**URL Parameters:**
- `id` - UUID of the group member

**Request Body:**
```json
{
  "share_percentage": 35.0,
  "phone": "+251911111111"
}
```

**All fields are optional**

**Success Response:** `200 OK`
```json
{
  "id": "uuid",
  "group_party_id": "uuid",
  "first_name": "Alemu",
  "father_name": "Kebede",
  "share_percentage": "35.00",
  "phone": "+251911111111",
  "created_at": "2024-01-15T10:00:00Z"
}
```

---

### 7. Delete Party

**Endpoint:** `DELETE /api/registration/parties/:id`

**Authorization:** Bearer Token (Role: RO, ADMIN)

**Description:** Delete a party. Can only delete if not associated with a finished transaction.

**URL Parameters:**
- `id` - UUID of the party

**Success Response:** `200 OK`
```json
{
  "message": "Party deleted successfully"
}
```

**Error Response:**
- `400 Bad Request` - Cannot delete party associated with finished transaction
- `404 Not Found` - Party not found

---

### 8. Delete Group Member

**Endpoint:** `DELETE /api/registration/parties/group/members/:id`

**Authorization:** Bearer Token (Role: RO, ADMIN)

**Description:** Delete a member from a group party.

**URL Parameters:**
- `id` - UUID of the group member

**Success Response:** `200 OK`
```json
{
  "message": "Group member deleted successfully"
}
```

---

### 9. Get Parties by Parcel

**Endpoint:** `GET /api/registration/parcels/:parcelId/parties`

**Authorization:** Bearer Token (Role: RO, SRO, ADMIN)

**Description:** Get all parties registered on a specific parcel.

**URL Parameters:**
- `parcelId` - UUID of the parcel

**Success Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "parcel_id": "uuid",
    "party_type": "NATURAL",
    "first_name": "Ahmed",
    "father_name": "Mohammed",
    "grandfather_name": "Ali",
    "phone": "+251911234567",
    "group_members": [],
    "rights": [
      {
        "id": "uuid",
        "right_type": "LEASEHOLD",
        "status": "ACTIVE"
      }
    ],
    "created_at": "2024-01-15T10:00:00Z"
  },
  {
    "id": "uuid",
    "parcel_id": "uuid",
    "party_type": "GROUP",
    "organization_name": "Alemu Family Group",
    "organization_type": "Family Group",
    "group_members": [
      {
        "id": "uuid",
        "first_name": "Alemu",
        "father_name": "Kebede",
        "share_percentage": "40.00"
      }
    ],
    "rights": [],
    "created_at": "2024-01-15T10:00:00Z"
  }
]
```

---

### 10. Get Party by ID

**Endpoint:** `GET /api/registration/parties/:id`

**Authorization:** Bearer Token (Role: RO, SRO, ADMIN)

**Description:** Get detailed information about a specific party.

**URL Parameters:**
- `id` - UUID of the party

**Success Response:** `200 OK`
```json
{
  "id": "uuid",
  "parcel_id": "uuid",
  "party_type": "GROUP",
  "organization_name": "Alemu Family Group",
  "organization_type": "Family Group",
  "phone": "+251911234567",
  "email": "alemufamily@example.com",
  "address": "Merkato, Addis Ababa",
  "is_under_tutorship": false,
  "tutor_name": null,
  "group_members": [
    {
      "id": "uuid",
      "group_party_id": "uuid",
      "first_name": "Alemu",
      "father_name": "Kebede",
      "grandfather_name": "Tadesse",
      "sex": "M",
      "national_id": "AA111111111",
      "share_percentage": "40.00",
      "phone": "+251911111111",
      "created_at": "2024-01-15T10:00:00Z"
    }
  ],
  "parcel": {
    "id": "uuid",
    "parcel_code": "PRC-AD-202401-00001",
    "area_sqm": "500.00",
    "land_use": "Residential"
  },
  "rights": [
    {
      "id": "uuid",
      "right_type": "LEASEHOLD",
      "transaction": {
        "id": "uuid",
        "transaction_number": "TXN-2024-000001",
        "status": "APPROVED"
      }
    }
  ],
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-15T10:00:00Z"
}
```

---

### 11. Search Parties

**Endpoint:** `GET /api/registration/parties/search`

**Authorization:** Bearer Token (Role: RO, SRO, ADMIN)

**Description:** Search for parties (useful for holder selection during right registration).

**Query Parameters:**
- `search` - Search term (searches in names, ID numbers)
- `parcel_id` - Filter by parcel UUID
- `party_type` - Filter by party type (NATURAL, LEGAL, GROUP)

**Example Request:**
```
GET /api/registration/parties/search?search=Ahmed&party_type=NATURAL
```

**Success Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "parcel_id": "uuid",
    "party_type": "NATURAL",
    "first_name": "Ahmed",
    "father_name": "Mohammed",
    "grandfather_name": "Ali",
    "national_id": "AA123456789",
    "phone": "+251911234567",
    "parcel": {
      "parcel_code": "PRC-AD-202401-00001"
    },
    "group_members": [],
    "created_at": "2024-01-15T10:00:00Z"
  }
]
```

**Notes:**
- Returns maximum 50 results
- Searches in: first_name, father_name, grandfather_name, organization_name, national_id, registration_number

---

## Workflow Example

### Complete Natural Person Registration Flow

1. **Register Natural Party**
```bash
POST /api/registration/parties/natural
{
  "parcel_id": "parcel-uuid",
  "first_name": "Ahmed",
  "father_name": "Mohammed",
  "grandfather_name": "Ali",
  "sex": "M",
  "national_id": "AA123456789",
  "phone": "+251911234567"
}
```

2. **Register Right with New Holder**
```bash
POST /api/registration/rights
{
  "transaction_id": "txn-uuid",
  "parcel_id": "parcel-uuid",
  "right_type": "LEASEHOLD",
  "holder_party_id": "party-uuid-from-step-1",
  "acquisition_type": "Purchase",
  "lease_period_years": 99,
  "ground_rent": 5000.00
}
```

3. **Update Party if Needed**
```bash
PUT /api/registration/parties/{party-uuid}
{
  "email": "ahmed@example.com",
  "address": "Updated Address"
}
```

### Complete Group Party Registration Flow

1. **Register Group Party with Members**
```bash
POST /api/registration/parties/group
{
  "parcel_id": "parcel-uuid",
  "group_party_name": "Alemu Family",
  "members": [
    {
      "first_name": "Alemu",
      "father_name": "Kebede",
      "share_percentage": 50.0
    },
    {
      "first_name": "Almaz",
      "father_name": "Getachew",
      "share_percentage": 50.0
    }
  ]
}
```

2. **Add Additional Member**
```bash
POST /api/registration/parties/group/{group-party-uuid}/members
{
  "first_name": "Biruk",
  "father_name": "Alemu",
  "share_percentage": 0.0
}
```

3. **Update Member Share**
```bash
PUT /api/registration/parties/group/members/{member-uuid}
{
  "share_percentage": 33.33
}
```

---

## Validation Rules

### Natural Person
- First name and father name are required
- If under tutorship, tutor information must be provided
- Date of birth must be valid date format

### Legal Person
- Organization name and type are required
- Registration number or TIN recommended
- Legal representative information optional but recommended

### Group Party
- Group name is required
- Members' share percentages should ideally total 100%
- Each member must have first name and father name
- Cannot delete group party with associated rights

### General Rules
- Cannot update/delete party if associated transaction is finished
- Party type cannot be changed after creation
- Parcel must exist before party registration

---

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created successfully |
| 400 | Bad Request - Validation error or business rule violation |
| 401 | Unauthorized - Missing or invalid authentication token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 500 | Internal Server Error |

---

## Notes for Frontend Implementation

1. **Party Type Selection**: Show dropdown with three options (Natural, Legal, Group)
2. **Dynamic Forms**: Show different form fields based on selected party type
3. **Tutorship**: Show tutor fields conditionally when "Under Tutorship" is selected
4. **Group Members**: Implement "Add Member" button that adds rows to members table
5. **Share Percentage Calculator**: Show warning if group member shares don't total 100%
6. **Search/Select**: Implement search functionality for selecting existing holders
7. **Update/Delete Restrictions**: Disable update/delete buttons if transaction is finished
8. **Validation**: Implement client-side validation for required fields
9. **Member Table**: For group parties, show editable table with Update/Delete buttons per row

## Testing Checklist

- [ ] Register natural person with all fields
- [ ] Register natural person with minimal fields
- [ ] Register natural person under tutorship
- [ ] Register legal person with representative
- [ ] Register group party with multiple members
- [ ] Add member to existing group
- [ ] Update natural person details
- [ ] Update legal person details
- [ ] Update group member share percentage
- [ ] Delete party (should succeed if no finished transaction)
- [ ] Try to delete party with finished transaction (should fail)
- [ ] Search parties by name
- [ ] Search parties by ID number
- [ ] Get all parties for a parcel
- [ ] Get single party with full details
