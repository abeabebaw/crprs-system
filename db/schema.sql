-- CRPRS Database Schema
-- PostgreSQL 14+

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================
-- ENUMERATIONS
-- ============================================
CREATE TYPE user_role AS ENUM ('ADMIN', 'FDO', 'DO', 'RO', 'SRO', 'GO', 'SGO', 'PUBLIC');
CREATE TYPE application_type AS ENUM (
  'FIRST_REGISTRATION', 'SUBSEQUENT_REGISTRATION', 'PARCEL_RESIZE',
  'INFORMATION_PROVISION', 'TRANSFER_OF_RIGHT', 'MODIFY_PARTY',
  'MODIFY_RRR', 'EASEMENT_REGISTRATION', 'BUILD_NEW_FEATURE',
  'CHANGE_LAND_USE', 'CORRECTION_RRR', 'CORRECTION_PARTY',
  'PARCEL_INFO_UPDATING'
);
CREATE TYPE application_status AS ENUM (
  'SUBMITTED', 'READY_FOR_FILE_ATTACHMENT', 'FILE_ATTACHMENT_STARTING',
  'FILE_ATTACHMENT_FINISHED', 'IN_PROGRESS', 'FINISHED',
  'COMPLETED', 'WITHDRAWN'
);
CREATE TYPE transaction_status AS ENUM (
  'CREATED', 'INITIATED', 'IN_PROCESS', 'READY_FOR_APPROVAL',
  'APPROVED', 'REJECTED', 'CANCELLED', 'NOT_IN_TASK', 'DELIVERED'
);
CREATE TYPE transaction_type AS ENUM (
  'REGISTRATION_OF_LEASEHOLD', 'REGISTRATION_OF_OLD_POSSESSION',
  'REGISTRATION_OF_URBAN_FARM', 'REGISTRATION_OF_LANDHOLDING_NO_USERIGHT',
  'MORTGAGE_REGISTRATION', 'MORTGAGE_CANCELLATION',
  'COURT_INJUNCTION_REGISTRATION', 'COURT_INJUNCTION_CANCELLATION',
  'GENERAL_RESTRICTION_REGISTRATION', 'GENERAL_RESTRICTION_CANCELLATION',
  'GENERAL_RESPONSIBILITY_REGISTRATION', 'GENERAL_RESPONSIBILITY_CANCELLATION',
  'PARCEL_SPLIT', 'PARCEL_MERGE', 'PARCEL_BOUNDARY_CHANGE',
  'MODIFY_REGISTERED_PARTY', 'TRANSFER_PUBLIC_TO_PRIVATE',
  'TRANSFER_PRIVATE_TO_PUBLIC', 'TRANSFER_PRIVATE_TO_PRIVATE',
  'PRINT_REGISTRATION_EXTRACT', 'PRINT_CADASTRAL_EXTRACT',
  'PRINT_NEW_TITLE', 'REPLACE_DAMAGED_TITLE', 'REPLACE_LOST_TITLE',
  'MODIFY_REGISTERED_INJUNCTION', 'MODIFY_REGISTERED_RIGHT',
  'MODIFY_REGISTERED_MORTGAGE', 'REGISTER_SERVITUDE', 'CREATE_BUILDING',
  'CREATE_CORNER_POINT', 'CREATE_BOUNDARY_LINE', 'CHANGE_LAND_USE',
  'CORRECTION_REGISTERED_RIGHT', 'CORRECTION_REGISTERED_INJUNCTION',
  'CORRECTION_REGISTERED_MORTGAGE', 'CORRECTION_REGISTERED_PARTY',
  'PARCEL_INFO_UPDATE'
);
CREATE TYPE party_type AS ENUM ('NATURAL', 'LEGAL', 'GROUP');
CREATE TYPE right_type AS ENUM ('LEASEHOLD', 'OLD_POSSESSION', 'SUB_LEASE', 'URBAN_FARM', 'GOVERNMENT_OWNED', 'CONDOMINIUM', 'WITHOUT_USE_RIGHT');
CREATE TYPE document_category AS ENUM ('APPLICANT', 'PARCEL', 'RRR');
CREATE TYPE sex_type AS ENUM ('M', 'F');

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(200) NOT NULL,
  phone VARCHAR(20),
  role user_role NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  is_online BOOLEAN DEFAULT FALSE,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- LOOKUP TABLES
-- ============================================
CREATE TABLE lookup_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type_name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE lookup_values (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lookup_type_id UUID REFERENCES lookup_types(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  value VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(lookup_type_id, code)
);

-- ============================================
-- PARCEL TABLE (with PostGIS geometry)
-- ============================================
CREATE TABLE parcels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parcel_code VARCHAR(50) UNIQUE NOT NULL,
  area_sqm NUMERIC(15,2),
  land_use VARCHAR(100),
  region VARCHAR(100),
  city VARCHAR(100),
  sub_city VARCHAR(100),
  woreda VARCHAR(50),
  geometry GEOMETRY('POLYGON', 4326),
  is_registered BOOLEAN DEFAULT FALSE,
  registration_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_parcels_geometry ON parcels USING GIST(geometry);
CREATE INDEX idx_parcels_code ON parcels(parcel_code);

-- ============================================
-- APPLICATION TABLE
-- ============================================
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_number VARCHAR(50) UNIQUE NOT NULL,
  application_type application_type NOT NULL,
  parcel_id UUID REFERENCES parcels(id) ON DELETE CASCADE,
  status application_status NOT NULL DEFAULT 'SUBMITTED',
  applicant_name VARCHAR(200) NOT NULL,
  applicant_type VARCHAR(50),
  applicant_address TEXT,
  applicant_phone VARCHAR(20),
  applicant_email VARCHAR(150),
  applicant_id_number VARCHAR(50),
  applicant_id_type VARCHAR(50),
  description TEXT,
  submitted_by UUID REFERENCES users(id),
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  withdrawn_reason TEXT,
  withdrawn_at TIMESTAMP,
  completed_at TIMESTAMP,
  delivered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_parcel ON applications(parcel_id);
CREATE INDEX idx_applications_type ON applications(application_type);

-- ============================================
-- TRANSACTION TABLE
-- ============================================
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_number VARCHAR(50) UNIQUE NOT NULL,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  parcel_id UUID REFERENCES parcels(id),
  transaction_type transaction_type NOT NULL,
  status transaction_status NOT NULL DEFAULT 'CREATED',
  assigned_to UUID REFERENCES users(id),
  initiated_at TIMESTAMP,
  in_process_at TIMESTAMP,
  ready_for_approval_at TIMESTAMP,
  approved_at TIMESTAMP,
  rejected_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  delivered_at TIMESTAMP,
  rejection_reason TEXT,
  cancellation_reason TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_transactions_application ON transactions(application_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_assigned_to ON transactions(assigned_to);

-- ============================================
-- PARTIES (Holders)
-- ============================================
CREATE TABLE parties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parcel_id UUID REFERENCES parcels(id) ON DELETE CASCADE,
  party_type party_type NOT NULL,
  -- Natural person fields
  first_name VARCHAR(100),
  father_name VARCHAR(100),
  grandfather_name VARCHAR(100),
  sex sex_type,
  date_of_birth DATE,
  national_id VARCHAR(50),
  -- Legal person fields
  organization_name VARCHAR(200),
  organization_type VARCHAR(100),
  registration_number VARCHAR(50),
  -- Common fields
  phone VARCHAR(20),
  email VARCHAR(150),
  address TEXT,
  is_under_tutorship BOOLEAN DEFAULT FALSE,
  tutor_name VARCHAR(200),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Group party members (for GROUP party type)
CREATE TABLE group_party_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_party_id UUID REFERENCES parties(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  father_name VARCHAR(100),
  grandfather_name VARCHAR(100),
  sex sex_type,
  national_id VARCHAR(50),
  share_percentage NUMERIC(5,2),
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- RIGHTS, RESTRICTIONS, RESPONSIBILITIES (RRR)
-- ============================================
CREATE TABLE rights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parcel_id UUID REFERENCES parcels(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  right_type right_type NOT NULL,
  holder_party_id UUID REFERENCES parties(id),
  acquisition_type VARCHAR(100),
  acquisition_date DATE,
  start_date DATE,
  end_date DATE,
  lease_period_years INTEGER,
  lease_start_date DATE,
  lease_end_date DATE,
  ground_rent NUMERIC(15,2),
  description TEXT,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE mortgages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parcel_id UUID REFERENCES parcels(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  mortgagee_name VARCHAR(200) NOT NULL,
  mortgagee_type VARCHAR(50),
  mortgage_amount NUMERIC(18,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'ETB',
  mortgage_date DATE NOT NULL,
  loan_agreement_number VARCHAR(100),
  description TEXT,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  cancelled_at TIMESTAMP,
  cancellation_reference VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE court_injunctions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parcel_id UUID REFERENCES parcels(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  court_name VARCHAR(200) NOT NULL,
  case_number VARCHAR(100) NOT NULL,
  injunction_date DATE NOT NULL,
  issued_by VARCHAR(200),
  description TEXT,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  cancelled_at TIMESTAMP,
  cancellation_reference VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE general_restrictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parcel_id UUID REFERENCES parcels(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  restriction_type VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  imposed_by VARCHAR(200),
  imposed_date DATE,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  cancelled_at TIMESTAMP,
  cancellation_reference VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- DOCUMENTS (DMS)
-- ============================================
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  category document_category NOT NULL,
  document_type VARCHAR(100) NOT NULL,
  reference_number VARCHAR(100),
  description TEXT,
  file_path VARCHAR(500) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size BIGINT,
  mime_type VARCHAR(100),
  uploaded_by UUID REFERENCES users(id),
  physical_storage_location VARCHAR(200),
  archived BOOLEAN DEFAULT FALSE,
  archived_at TIMESTAMP,
  checked_out_by UUID REFERENCES users(id),
  checked_out_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_documents_application ON documents(application_id);

-- ============================================
-- REQUIRED DOCUMENTS CONFIGURATION
-- ============================================
CREATE TABLE required_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_type application_type NOT NULL,
  document_type VARCHAR(100) NOT NULL,
  document_category document_category NOT NULL,
  is_mandatory BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(application_type, document_type)
);

-- ============================================
-- BUSINESS RULES
-- ============================================
CREATE TABLE business_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_name VARCHAR(100) NOT NULL,
  land_use VARCHAR(100),
  min_parcel_size_sqm NUMERIC(15,2),
  max_parcel_size_sqm NUMERIC(15,2),
  min_lease_period_years INTEGER,
  max_lease_period_years INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- BUILDINGS
-- ============================================
CREATE TABLE buildings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parcel_id UUID REFERENCES parcels(id) ON DELETE CASCADE,
  building_number VARCHAR(50),
  number_of_floors INTEGER,
  construction_year INTEGER,
  area_sqm NUMERIC(15,2),
  geometry GEOMETRY('POLYGON', 4326),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- BORDER POINTS / BOUNDARY LINES
-- ============================================
CREATE TABLE border_points (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parcel_id UUID REFERENCES parcels(id) ON DELETE CASCADE,
  point_number VARCHAR(50),
  geometry GEOMETRY('POINT', 4326),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE boundary_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parcel_id UUID REFERENCES parcels(id) ON DELETE CASCADE,
  line_number VARCHAR(50),
  length_m NUMERIC(15,2),
  geometry GEOMETRY('LINESTRING', 4326),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- SERVITUDES
-- ============================================
CREATE TABLE servitudes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parcel_id UUID REFERENCES parcels(id) ON DELETE CASCADE,
  servitude_type VARCHAR(100),
  description TEXT,
  geometry GEOMETRY('POLYGON', 4326),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- ANNOUNCEMENTS (Public Portal)
-- ============================================
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(300) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(50) DEFAULT 'NEWS',
  is_published BOOLEAN DEFAULT TRUE,
  published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- PUBLIC DOCUMENTS (Downloadable)
-- ============================================
CREATE TABLE public_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(300) NOT NULL,
  description TEXT,
  document_category VARCHAR(50),
  file_path VARCHAR(500) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size BIGINT,
  mime_type VARCHAR(100),
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- SERVICES (Public Portal)
-- ============================================
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_name VARCHAR(200) NOT NULL,
  description TEXT,
  required_documents TEXT,
  fee_amount NUMERIC(15,2),
  processing_time_hours INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- MAP LAYERS (Web Map Portal)
-- ============================================
CREATE TABLE map_layers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  layer_name VARCHAR(200) NOT NULL,
  layer_type VARCHAR(50),
  source_url TEXT,
  is_published BOOLEAN DEFAULT TRUE,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE predefined_maps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  map_name VARCHAR(200) NOT NULL,
  description TEXT,
  layer_ids UUID[],
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TRANSACTION STATUS HISTORY (Audit Log)
-- ============================================
CREATE TABLE transaction_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  from_status transaction_status,
  to_status transaction_status NOT NULL,
  changed_by UUID REFERENCES users(id),
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE application_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  from_status application_status,
  to_status application_status NOT NULL,
  changed_by UUID REFERENCES users(id),
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TRIGGERS for updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
 $$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_parcels_updated_at BEFORE UPDATE ON parcels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_parties_updated_at BEFORE UPDATE ON parties FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rights_updated_at BEFORE UPDATE ON rights FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mortgages_updated_at BEFORE UPDATE ON mortgages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_court_injunctions_updated_at BEFORE UPDATE ON court_injunctions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_general_restrictions_updated_at BEFORE UPDATE ON general_restrictions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON announcements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- AUDIT & SESSIONS
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100),
  entity_id VARCHAR(100),
  previous_value JSONB,
  new_value JSONB,
  reason TEXT,
  ip_address VARCHAR(50),
  user_agent TEXT,
  correlation_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token VARCHAR(500) UNIQUE NOT NULL,
  user_agent TEXT,
  ip_address VARCHAR(50),
  is_valid BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(100) NOT NULL,
  ip_address VARCHAR(50),
  success BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_login_attempts_lookup ON login_attempts(username, created_at);


-- ============================================
-- INSERT DEFAULT LOOKUP TYPES
-- ============================================
INSERT INTO lookup_types (type_name, description) VALUES
  ('ACQUISITION_TYPE', 'Types of property acquisition'),
  ('LAND_USE', 'Land use categories'),
  ('DOCUMENT_TYPE', 'Document types'),
  ('ORGANIZATION_TYPE', 'Organization types'),
  ('SERVITUDE_TYPE', 'Types of servitude');

-- ============================================
-- DEFAULT ADMIN USER (password: admin123)
-- ============================================
INSERT INTO users (username, email, password_hash, full_name, role)
VALUES ('admin', 'admin@crprs.gov.et', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'System Administrator', 'ADMIN');

-- Default FDO user (password: fdo123)
INSERT INTO users (username, email, password_hash, full_name, role)
VALUES ('fdo', 'fdo@crprs.gov.et', '$2a$10$8KzGZ2pNjrQqkLqXR8MxfuQxJxQXqVxqXqXqXqXqXqXqXqXqXqXq', 'Front Desk Officer', 'FDO');