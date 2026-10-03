# CRPRS System - Comprehensive Role Permissions & Functionality Matrix (R2V2)

Based on the **CRPRS User Manual (R2V2)**, this document details the complete list of system functionalities organized by the user role performing them, along with corresponding API and system permissions.

---

## System User Roles

| Role Name | Role Code | Description |
| :--- | :--- | :--- |
| **Front Desk Officer** | `FDO` | First point of contact; manages customer intake, applications, initial transactions, and receipt printing. |
| **Digitizing Officer** | `DO` | Responsible for document scanning, image enhancement, indexing, and physical/digital archive management. |
| **Registration Officer** | `RO` | Core legal data entry specialist; registers parties, Rights, Responsibilities, and Restrictions (RRR), mortgages, and court injunctions. |
| **Senior Registration Officer** | `SRO` | Supervisory officer; conducts quality control, approves/rejects transactions, and prints title certificates & confirmation letters. |
| **GIS Officer** | `GO` | Manages spatial data in RECS; handles parcel splits, merges, boundary changes, border points, buildings, and servitudes. |
| **Senior GIS Officer** | `SGO` | Spatial data supervisor; reviews, approves, rejects, or cancels spatial map transactions created in RECS. |
| **System Administrator** | `ADMIN` | Manages users, system settings, lookup tables, required document rules, CRS parameters, GeoServer, and system reports. |
| **Web Map Portal Administrator** | `PORTAL_ADMIN` | Manages public-facing web map portal, publishes spatial layers, connects external WMS API services, and manages public announcements. |

---

## Detailed Functionality Matrix by Role

### 1. Front Desk Officer (FDO)

#### Application Management
- **Creating an Application:** Registers a new service request from a customer, capturing applicant details and linking it to a specific parcel.
- **Viewing an Application:** Displays a list of all created applications and their status.
- **Searching for an Application:** Filters specific applications using search keys (Parcel ID, Applicant Name, etc.).
- **Preparing Application Acknowledgment Receipt:** Prints an official receipt confirming application submission.
- **Preparing Application Rejection Receipt:** Prints a receipt detailing the rationale for rejecting an application.
- **Updating an Application:** Modifies incorrect information in a submitted application (`Submitted` status).
- **Deleting an Application:** Removes an incorrectly created application prior to transaction initiation.
- **Rejecting an Application:** Withdraws an application (changing status to `WITHDRAWN`) if invalid.
- **Viewing Application Parcel:** Displays parcel code and details associated with an application.

#### Transaction Management
- **Creating a Transaction:** Generates specific tasks (e.g., Mortgage Registration, Parcel Split) based on application type.
- **Viewing a Transaction:** Displays a list of all created transactions and their status.
- **Searching / Filtering for a Transaction:** Filters transactions by status, application ID, or transaction ID.
- **Updating a Transaction:** Modifies transaction information.
- **Deleting a Transaction:** Removes an incorrectly created transaction.
- **Delivering a Service:** Confirms final product (e.g., Title Certificate) has been delivered to client and prints return receipt.

---

### 2. Digitizing Officer (DO)

#### Scanning & Archiving Documents
- **Scanning Documents:** Uses connected scanner to digitize hardcopy documents directly into the system.
- **Loading Documents:** Uploads digitized documents from local drive, USB drive, or CD.
- **Saving Documents:** Saves scanned/loaded files to repository with required category and description.
- **Viewing Documents:** Displays scanned and stored documents within the document viewer.
- **Modifying / Enhancing Scanned Documents:** Rotates, flips, mirrors, crops, or scales images before saving.
- **Deleting Scanned Documents:** Removes incorrect or redundant scanned files.
- **Archiving Required Files:** Scans and archives official parcel documentation folders.
- **Setting Physical Storage:** Updates physical storage location code/shelf for archived folders.
- **Managing Archived Documents:** Registers physical folder check-out and check-in tracking.
- **Index Search:** Searches and filters archived documents for management purposes.

---

### 3. Registration Officer (RO)

#### General Transaction Handling
- **Initiating a Transaction:** Locks target parcel and transaction data so work can begin.
- **Loading a Transaction:** Displays complete working data for the task (Parcel, Holder, RRR, etc.).
- **Finishing a Task:** Confirms all data has been entered and transitions status to `READY_FOR_APPROVAL`.

#### Party Registration
- **Registering a Legal Party:** Registers organizations (companies, associations, embassies, NGOs).
- **Registering a Natural Party:** Registers individual persons.
- **Registering a Group Party:** Registers group entities (families, joint owners) and individual members.
- **Modifying Party Information:** Updates registered information for any party.

#### Rights Registration (RRR)
- **Registering Right:** Records primary parcel rights (Leasehold, Old Possession, Urban Farm, etc.).
- **Modifying Registered Right:** Updates information for an existing right.

#### Specific Restrictions (Mortgage & Court Injunction)
- **Registering Mortgage:** Records a new mortgage lien on a parcel.
- **Canceling Mortgage:** Cancels a registered mortgage upon debt settlement.
- **Modifying Registered Mortgage:** Updates existing mortgage terms or info.
- **Registering Court Injunction:** Records court-ordered restrictions on a parcel.
- **Canceling Court Injunction:** Removes registered court injunctions upon court clearance.
- **Modifying Registered Court Injunction:** Updates injunction records.

#### General Restrictions
- **Registering General Restriction:** Records general restrictions (e.g., historical preservation rules).
- **Canceling General Restrictions:** Removes registered general restrictions.

---

### 4. Senior Registration Officer (SRO)

#### Transaction Approval
- **Approve:** Validates and approves work submitted by Registration Officers.
- **Reject:** Sends transaction back to Registration Officer with feedback for correction.
- **Cancel:** Cancels transaction if it contradicts legal rules or requirements.

#### Printing & Certification
- **Printing Title Certificate:** Issues official Title Certificates for verified properties.
- **Printing Confirmation Letters:** Generates and prints official letters for mortgage/injunction registration or cancellation to be signed and sealed.

#### Transaction Supervision
- **Loading a Transaction:** Loads all transaction working data for review.
- **Viewing Transaction List:** Monitors transaction queues across all status levels.

---

### 5. GIS Officer (GO)

#### RECS Spatial Transaction Handling
- **Initiating a Transaction:** Locks spatial parcel geometry layers for editing.
- **Loading a Transaction:** Loads spatial map layers into map editor view.
- **Saving a Transaction:** Saves intermediate spatial edits.
- **Saving and Finishing a Transaction:** Finalizes spatial edits and submits for SGO review.
- **Canceling a Transaction:** Aborts current spatial task.
- **Removing Transaction Data:** Clears specific layers from map view.

#### Spatial Data Manipulation
- **Importing Survey Data:** Imports field survey coordinates (SHP, CSV, DXF) onto map.
- **Splitting a Parcel:** Divides an existing parcel geometry into two or more new parcels.
- **Merging Parcels:** Combines adjacent parcels into a single new parcel.
- **Changing Parcel Boundaries:** Edits boundary vertices and area calculations.
- **Creating Parcel Border Points:** Digitizes corner border points with spatial coordinates.
- **Creating Buildings:** Digitizes footprint geometries for buildings on parcels.
- **Creating Servitude:** Draws easement/right-of-way geometries (drainage, power lines).
- **Creating Boundary Lines:** Digitizes boundary segment lines between border points.

#### Map Production & Data Export
- **Preparing Map Print:** Renders and prints customized cadastral maps.
- **Preparing Cadastral Extract:** Exports spatial data (Shapefiles, GeoJSON) for external integration.

---

### 6. Senior GIS Officer (SGO)

#### Spatial Transaction Quality Control
- **Approving Spatial Transactions:** Validates and approves spatial geometry changes made by GO.
- **Rejecting Spatial Transactions:** Returns spatial transactions to GO with correction notes.
- **Canceling Spatial Transactions:** Cancels invalid or conflicting spatial requests.

---

### 7. System Administrator (Admin)

#### User Management
- **Create User:** Registers new user accounts in the RPRS system.
- **Assign User to Role:** Grants permissions (`FDO`, `DO`, `RO`, `SRO`, `GO`, `SGO`, `ADMIN`).
- **Edit User:** Updates profile details for existing users.
- **Lock / Unlock Users:** Disables or re-enables user account access.
- **View Online Users:** Monitors currently active logged-in sessions.
- **Change Password:** Resets or updates user passwords.

#### System Configuration & Setup
- **Lookup Management:** Configures dropdown options (Land Use, Document Types, Acquisition Types).
- **Required Documents Management:** Configures mandatory document requirements per application type.
- **Business Rule Configuration:** Sets system-wide limits (e.g., parcel area limits by land use).
- **Configuration Parameters:**
  - **Geometric Reference:** Sets Coordinate Reference Systems (e.g., EPSG:20137 / Adindan / UTM Zone 37N).
  - **IP Address Configuration:** Configures server IP addresses for database and GeoServer.
  - **GeoServer Configuration:** Manages connections to map server instances.
- **System Reports:** Generates system analytics (lead time, employee performance, queue waiting time).

---

### 8. Web Map Portal Administrator

#### Public Portal Management
- **Uploading Layers:** Publishes geographic layers to the public web map portal.
- **Adding Web Services:** Integrates external map services (WMS/WMTS/WFS).
- **Adding CRPRS API:** Connects portal to backend endpoints for public application status lookup.
- **Managing Announcements:** Creates, updates, and publishes public announcements.
- **Uploading Public Documents:** Publishes downloadable legal standards, forms, and manuals.
- **Creating Regional Users:** Provisions regional portal administrator accounts.

---

## Comprehensive API Permission Matrix

| Endpoint Group | Resource / Action | FDO | DO | RO | SRO | GO | SGO | ADMIN | PORTAL_ADMIN |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Applications** | Create Application | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| | Update / Modify Application | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| | Reject / Withdraw Application | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| | Delete Application | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| | Print Receipts (Ack / Reject) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Documents** | Scan / Upload / Enhance Document | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| | Check-in / Check-out Archive | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Registry (RRR)** | Register Natural / Legal / Group Party | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| | Register Right (Leasehold, etc.) | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| | Register Mortgage / Injunction | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| | Cancel Mortgage / Injunction | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| | SRO Approve / Reject Transaction | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ |
| | Print Title Certificate & Letters | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ |
| **RECS Spatial** | Digitally Edit Geometry / Border Points | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ |
| | Split / Merge / Change Boundaries | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ |
| | Import Survey Data / Export Map | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ |
| | SGO Approve / Reject Spatial Edit | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| **Administration** | User & Role Management | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| | Lookup & Business Rule Config | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| | System Reports & Performance | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Web Portal** | Public Layer & WMS Uploads | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| | Announcements & Public Files | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
