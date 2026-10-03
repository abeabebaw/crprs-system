-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "public";

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('ADMIN', 'FDO', 'DO', 'RO', 'SRO', 'GO', 'SGO', 'PUBLIC');

-- CreateEnum
CREATE TYPE "application_type" AS ENUM ('FIRST_REGISTRATION', 'SUBSEQUENT_REGISTRATION', 'PARCEL_RESIZE', 'INFORMATION_PROVISION', 'TRANSFER_OF_RIGHT', 'MODIFY_PARTY', 'MODIFY_RRR', 'EASEMENT_REGISTRATION', 'BUILD_NEW_FEATURE', 'CHANGE_LAND_USE', 'CORRECTION_RRR', 'CORRECTION_PARTY', 'PARCEL_INFO_UPDATING');

-- CreateEnum
CREATE TYPE "application_status" AS ENUM ('SUBMITTED', 'READY_FOR_FILE_ATTACHMENT', 'FILE_ATTACHMENT_STARTING', 'FILE_ATTACHMENT_FINISHED', 'IN_PROGRESS', 'FINISHED', 'COMPLETED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "transaction_status" AS ENUM ('CREATED', 'INITIATED', 'IN_PROCESS', 'READY_FOR_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED', 'NOT_IN_TASK', 'DELIVERED');

-- CreateEnum
CREATE TYPE "transaction_type" AS ENUM ('REGISTRATION_OF_LEASEHOLD', 'REGISTRATION_OF_OLD_POSSESSION', 'REGISTRATION_OF_URBAN_FARM', 'REGISTRATION_OF_LANDHOLDING_NO_USERIGHT', 'MORTGAGE_REGISTRATION', 'MORTGAGE_CANCELLATION', 'COURT_INJUNCTION_REGISTRATION', 'COURT_INJUNCTION_CANCELLATION', 'GENERAL_RESTRICTION_REGISTRATION', 'GENERAL_RESTRICTION_CANCELLATION', 'GENERAL_RESPONSIBILITY_REGISTRATION', 'GENERAL_RESPONSIBILITY_CANCELLATION', 'PARCEL_SPLIT', 'PARCEL_MERGE', 'PARCEL_BOUNDARY_CHANGE', 'MODIFY_REGISTERED_PARTY', 'TRANSFER_PUBLIC_TO_PRIVATE', 'TRANSFER_PRIVATE_TO_PUBLIC', 'TRANSFER_PRIVATE_TO_PRIVATE', 'PRINT_REGISTRATION_EXTRACT', 'PRINT_CADASTRAL_EXTRACT', 'PRINT_NEW_TITLE', 'REPLACE_DAMAGED_TITLE', 'REPLACE_LOST_TITLE', 'MODIFY_REGISTERED_INJUNCTION', 'MODIFY_REGISTERED_RIGHT', 'MODIFY_REGISTERED_MORTGAGE', 'REGISTER_SERVITUDE', 'CREATE_BUILDING', 'CREATE_CORNER_POINT', 'CREATE_BOUNDARY_LINE', 'CHANGE_LAND_USE', 'CORRECTION_REGISTERED_RIGHT', 'CORRECTION_REGISTERED_INJUNCTION', 'CORRECTION_REGISTERED_MORTGAGE', 'CORRECTION_REGISTERED_PARTY', 'PARCEL_INFO_UPDATE');

-- CreateEnum
CREATE TYPE "party_type" AS ENUM ('NATURAL', 'LEGAL', 'GROUP');

-- CreateEnum
CREATE TYPE "right_type" AS ENUM ('LEASEHOLD', 'OLD_POSSESSION', 'URBAN_FARM', 'GOVERNMENT_OWNED', 'CONDOMINIUM');

-- CreateEnum
CREATE TYPE "document_category" AS ENUM ('APPLICANT', 'PARCEL', 'RRR');

-- CreateEnum
CREATE TYPE "sex_type" AS ENUM ('M', 'F');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "username" VARCHAR(100) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(200) NOT NULL,
    "phone" VARCHAR(20),
    "role" "user_role" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_online" BOOLEAN NOT NULL DEFAULT false,
    "last_login" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lookup_types" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "type_name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lookup_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lookup_values" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "lookup_type_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "value" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lookup_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parcels" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "parcel_code" VARCHAR(50) NOT NULL,
    "area_sqm" DECIMAL(15,2),
    "land_use" VARCHAR(100),
    "region" VARCHAR(100),
    "city" VARCHAR(100),
    "sub_city" VARCHAR(100),
    "woreda" VARCHAR(50),
    "geometry_wkt" TEXT,
    "is_registered" BOOLEAN NOT NULL DEFAULT false,
    "registration_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parcels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "application_number" VARCHAR(50) NOT NULL,
    "application_type" "application_type" NOT NULL,
    "parcel_id" UUID,
    "status" "application_status" NOT NULL DEFAULT 'SUBMITTED',
    "applicant_name" VARCHAR(200) NOT NULL,
    "applicant_type" VARCHAR(50),
    "applicant_address" TEXT,
    "applicant_phone" VARCHAR(20),
    "applicant_email" VARCHAR(150),
    "applicant_id_number" VARCHAR(50),
    "applicant_id_type" VARCHAR(50),
    "description" TEXT,
    "submitted_by" UUID,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withdrawn_reason" TEXT,
    "withdrawn_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "transaction_number" VARCHAR(50) NOT NULL,
    "application_id" UUID,
    "parcel_id" UUID,
    "transaction_type" "transaction_type" NOT NULL,
    "status" "transaction_status" NOT NULL DEFAULT 'CREATED',
    "assigned_to" UUID,
    "initiated_at" TIMESTAMP(3),
    "in_process_at" TIMESTAMP(3),
    "ready_for_approval_at" TIMESTAMP(3),
    "approved_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "cancellation_reason" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parties" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "parcel_id" UUID,
    "party_type" "party_type" NOT NULL,
    "first_name" VARCHAR(100),
    "father_name" VARCHAR(100),
    "grandfather_name" VARCHAR(100),
    "sex" "sex_type",
    "date_of_birth" DATE,
    "national_id" VARCHAR(50),
    "organization_name" VARCHAR(200),
    "organization_type" VARCHAR(100),
    "registration_number" VARCHAR(50),
    "phone" VARCHAR(20),
    "email" VARCHAR(150),
    "address" TEXT,
    "is_under_tutorship" BOOLEAN NOT NULL DEFAULT false,
    "tutor_name" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_party_members" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "group_party_id" UUID NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "father_name" VARCHAR(100),
    "grandfather_name" VARCHAR(100),
    "sex" "sex_type",
    "national_id" VARCHAR(50),
    "share_percentage" DECIMAL(5,2),
    "phone" VARCHAR(20),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_party_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rights" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "parcel_id" UUID,
    "transaction_id" UUID,
    "right_type" "right_type" NOT NULL,
    "holder_party_id" UUID,
    "acquisition_type" VARCHAR(100),
    "acquisition_date" DATE,
    "start_date" DATE,
    "end_date" DATE,
    "lease_period_years" INTEGER,
    "lease_start_date" DATE,
    "lease_end_date" DATE,
    "ground_rent" DECIMAL(15,2),
    "description" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mortgages" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "parcel_id" UUID,
    "transaction_id" UUID,
    "mortgagee_name" VARCHAR(200) NOT NULL,
    "mortgagee_type" VARCHAR(50),
    "mortgage_amount" DECIMAL(18,2) NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'ETB',
    "mortgage_date" DATE NOT NULL,
    "loan_agreement_number" VARCHAR(100),
    "description" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "cancelled_at" TIMESTAMP(3),
    "cancellation_reference" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mortgages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "court_injunctions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "parcel_id" UUID,
    "transaction_id" UUID,
    "court_name" VARCHAR(200) NOT NULL,
    "case_number" VARCHAR(100) NOT NULL,
    "injunction_date" DATE NOT NULL,
    "issued_by" VARCHAR(200),
    "description" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "cancelled_at" TIMESTAMP(3),
    "cancellation_reference" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "court_injunctions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "general_restrictions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "parcel_id" UUID,
    "transaction_id" UUID,
    "restriction_type" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "imposed_by" VARCHAR(200),
    "imposed_date" DATE,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "cancelled_at" TIMESTAMP(3),
    "cancellation_reference" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "general_restrictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "application_id" UUID,
    "transaction_id" UUID,
    "category" "document_category" NOT NULL,
    "document_type" VARCHAR(100) NOT NULL,
    "reference_number" VARCHAR(100),
    "description" TEXT,
    "file_path" VARCHAR(500) NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_size" BIGINT,
    "mime_type" VARCHAR(100),
    "uploaded_by" UUID,
    "physical_storage_location" VARCHAR(200),
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "archived_at" TIMESTAMP(3),
    "checked_out_by" UUID,
    "checked_out_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "required_documents" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "application_type" "application_type" NOT NULL,
    "document_type" VARCHAR(100) NOT NULL,
    "document_category" "document_category" NOT NULL,
    "is_mandatory" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "required_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_rules" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "rule_name" VARCHAR(100) NOT NULL,
    "land_use" VARCHAR(100),
    "min_parcel_size_sqm" DECIMAL(15,2),
    "max_parcel_size_sqm" DECIMAL(15,2),
    "min_lease_period_years" INTEGER,
    "max_lease_period_years" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buildings" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "parcel_id" UUID,
    "building_number" VARCHAR(50),
    "number_of_floors" INTEGER,
    "construction_year" INTEGER,
    "area_sqm" DECIMAL(15,2),
    "geometry_wkt" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "buildings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "border_points" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "parcel_id" UUID,
    "point_number" VARCHAR(50),
    "geometry_wkt" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "border_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boundary_lines" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "parcel_id" UUID,
    "line_number" VARCHAR(50),
    "length_m" DECIMAL(15,2),
    "geometry_wkt" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "boundary_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servitudes" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "parcel_id" UUID,
    "servitude_type" VARCHAR(100),
    "description" TEXT,
    "geometry_wkt" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "servitudes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "title" VARCHAR(300) NOT NULL,
    "content" TEXT NOT NULL,
    "category" VARCHAR(50) NOT NULL DEFAULT 'NEWS',
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public_documents" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "title" VARCHAR(300) NOT NULL,
    "description" TEXT,
    "document_category" VARCHAR(50),
    "file_path" VARCHAR(500) NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_size" BIGINT,
    "mime_type" VARCHAR(100),
    "uploaded_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "public_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "service_name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "required_documents" TEXT,
    "fee_amount" DECIMAL(15,2),
    "processing_time_hours" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "map_layers" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "layer_name" VARCHAR(200) NOT NULL,
    "layer_type" VARCHAR(50),
    "source_url" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "map_layers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "predefined_maps" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "map_name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "layer_ids" UUID[],
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "predefined_maps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_history" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "transaction_id" UUID NOT NULL,
    "from_status" "transaction_status",
    "to_status" "transaction_status" NOT NULL,
    "changed_by" UUID,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaction_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_history" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "application_id" UUID NOT NULL,
    "from_status" "application_status",
    "to_status" "application_status" NOT NULL,
    "changed_by" UUID,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "lookup_types_type_name_key" ON "lookup_types"("type_name");

-- CreateIndex
CREATE UNIQUE INDEX "lookup_values_lookup_type_id_code_key" ON "lookup_values"("lookup_type_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "parcels_parcel_code_key" ON "parcels"("parcel_code");

-- CreateIndex
CREATE INDEX "parcels_parcel_code_idx" ON "parcels"("parcel_code");

-- CreateIndex
CREATE UNIQUE INDEX "applications_application_number_key" ON "applications"("application_number");

-- CreateIndex
CREATE INDEX "applications_status_idx" ON "applications"("status");

-- CreateIndex
CREATE INDEX "applications_parcel_id_idx" ON "applications"("parcel_id");

-- CreateIndex
CREATE INDEX "applications_application_type_idx" ON "applications"("application_type");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_transaction_number_key" ON "transactions"("transaction_number");

-- CreateIndex
CREATE INDEX "transactions_application_id_idx" ON "transactions"("application_id");

-- CreateIndex
CREATE INDEX "transactions_status_idx" ON "transactions"("status");

-- CreateIndex
CREATE INDEX "transactions_assigned_to_idx" ON "transactions"("assigned_to");

-- CreateIndex
CREATE INDEX "documents_application_id_idx" ON "documents"("application_id");

-- CreateIndex
CREATE UNIQUE INDEX "required_documents_application_type_document_type_key" ON "required_documents"("application_type", "document_type");

-- AddForeignKey
ALTER TABLE "lookup_values" ADD CONSTRAINT "lookup_values_lookup_type_id_fkey" FOREIGN KEY ("lookup_type_id") REFERENCES "lookup_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "parcels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "parcels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parties" ADD CONSTRAINT "parties_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "parcels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_party_members" ADD CONSTRAINT "group_party_members_group_party_id_fkey" FOREIGN KEY ("group_party_id") REFERENCES "parties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rights" ADD CONSTRAINT "rights_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "parcels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rights" ADD CONSTRAINT "rights_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rights" ADD CONSTRAINT "rights_holder_party_id_fkey" FOREIGN KEY ("holder_party_id") REFERENCES "parties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mortgages" ADD CONSTRAINT "mortgages_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "parcels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mortgages" ADD CONSTRAINT "mortgages_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "court_injunctions" ADD CONSTRAINT "court_injunctions_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "parcels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "court_injunctions" ADD CONSTRAINT "court_injunctions_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "general_restrictions" ADD CONSTRAINT "general_restrictions_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "parcels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "general_restrictions" ADD CONSTRAINT "general_restrictions_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_checked_out_by_fkey" FOREIGN KEY ("checked_out_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buildings" ADD CONSTRAINT "buildings_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "parcels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "border_points" ADD CONSTRAINT "border_points_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "parcels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boundary_lines" ADD CONSTRAINT "boundary_lines_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "parcels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servitudes" ADD CONSTRAINT "servitudes_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "parcels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_documents" ADD CONSTRAINT "public_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "predefined_maps" ADD CONSTRAINT "predefined_maps_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_history" ADD CONSTRAINT "transaction_history_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_history" ADD CONSTRAINT "transaction_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_history" ADD CONSTRAINT "application_history_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_history" ADD CONSTRAINT "application_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
