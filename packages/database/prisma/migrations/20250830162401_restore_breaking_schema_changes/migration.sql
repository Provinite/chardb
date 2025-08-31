-- CreateEnum
CREATE TYPE "TraitValueType" AS ENUM ('STRING', 'TIMESTAMP', 'INTEGER', 'ENUM');

-- AlterTable
ALTER TABLE "characters" ADD COLUMN     "trait_values" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "can_create_community" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "can_create_invite_code" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "can_grant_global_permissions" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "can_list_invite_codes" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "can_list_users" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "communities" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "community_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "can_create_species" BOOLEAN NOT NULL DEFAULT false,
    "can_create_character" BOOLEAN NOT NULL DEFAULT false,
    "can_edit_character" BOOLEAN NOT NULL DEFAULT false,
    "can_edit_species" BOOLEAN NOT NULL DEFAULT false,
    "can_create_invite_code" BOOLEAN NOT NULL DEFAULT false,
    "can_list_invite_codes" BOOLEAN NOT NULL DEFAULT false,
    "can_create_role" BOOLEAN NOT NULL DEFAULT false,
    "can_edit_role" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_members" (
    "id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_invitations" (
    "id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "invitee_id" TEXT NOT NULL,
    "inviter_id" TEXT NOT NULL,
    "community_id" TEXT NOT NULL,
    "accepted_at" TIMESTAMPTZ,
    "declined_at" TIMESTAMPTZ,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invite_codes" (
    "id" VARCHAR(50) NOT NULL,
    "claim_count" INTEGER NOT NULL DEFAULT 0,
    "max_claims" INTEGER NOT NULL,
    "creator_id" TEXT NOT NULL,
    "role_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invite_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "character_ownership_changes" (
    "id" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,
    "from_user_id" TEXT,
    "to_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "character_ownership_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "species" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "community_id" TEXT NOT NULL,
    "has_image" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "species_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "traits" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "value_type" "TraitValueType" NOT NULL,
    "species_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "traits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enum_values" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "trait_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enum_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "species_variants" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "species_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "species_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trait_list_entries" (
    "id" TEXT NOT NULL,
    "trait_id" TEXT NOT NULL,
    "species_variant_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "required" BOOLEAN NOT NULL,
    "value_type" "TraitValueType" NOT NULL,
    "default_value_string" VARCHAR(255),
    "default_value_int" INTEGER,
    "default_value_timestamp" TIMESTAMPTZ,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trait_list_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enum_value_settings" (
    "id" TEXT NOT NULL,
    "enum_value_id" TEXT NOT NULL,
    "species_variant_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enum_value_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "communities_name_key" ON "communities"("name");

-- CreateIndex
CREATE UNIQUE INDEX "roles_community_id_name_key" ON "roles"("community_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "community_members_role_id_user_id_key" ON "community_members"("role_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "species_name_key" ON "species"("name");

-- CreateIndex
CREATE UNIQUE INDEX "traits_species_id_name_key" ON "traits"("species_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "enum_values_trait_id_name_key" ON "enum_values"("trait_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "enum_values_trait_id_order_key" ON "enum_values"("trait_id", "order");

-- CreateIndex
CREATE UNIQUE INDEX "species_variants_species_id_name_key" ON "species_variants"("species_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "trait_list_entries_trait_id_species_variant_id_key" ON "trait_list_entries"("trait_id", "species_variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "enum_value_settings_enum_value_id_species_variant_id_key" ON "enum_value_settings"("enum_value_id", "species_variant_id");

-- CreateIndex
CREATE INDEX "character_traitvalues_gin_idx" ON "characters" USING GIN ("trait_values");

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_members" ADD CONSTRAINT "community_members_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_members" ADD CONSTRAINT "community_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_invitations" ADD CONSTRAINT "community_invitations_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_invitations" ADD CONSTRAINT "community_invitations_invitee_id_fkey" FOREIGN KEY ("invitee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_invitations" ADD CONSTRAINT "community_invitations_inviter_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_invitations" ADD CONSTRAINT "community_invitations_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invite_codes" ADD CONSTRAINT "invite_codes_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invite_codes" ADD CONSTRAINT "invite_codes_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_ownership_changes" ADD CONSTRAINT "character_ownership_changes_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_ownership_changes" ADD CONSTRAINT "character_ownership_changes_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_ownership_changes" ADD CONSTRAINT "character_ownership_changes_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "species" ADD CONSTRAINT "species_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "traits" ADD CONSTRAINT "traits_species_id_fkey" FOREIGN KEY ("species_id") REFERENCES "species"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enum_values" ADD CONSTRAINT "enum_values_trait_id_fkey" FOREIGN KEY ("trait_id") REFERENCES "traits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "species_variants" ADD CONSTRAINT "species_variants_species_id_fkey" FOREIGN KEY ("species_id") REFERENCES "species"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trait_list_entries" ADD CONSTRAINT "trait_list_entries_trait_id_fkey" FOREIGN KEY ("trait_id") REFERENCES "traits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trait_list_entries" ADD CONSTRAINT "trait_list_entries_species_variant_id_fkey" FOREIGN KEY ("species_variant_id") REFERENCES "species_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enum_value_settings" ADD CONSTRAINT "enum_value_settings_enum_value_id_fkey" FOREIGN KEY ("enum_value_id") REFERENCES "enum_values"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enum_value_settings" ADD CONSTRAINT "enum_value_settings_species_variant_id_fkey" FOREIGN KEY ("species_variant_id") REFERENCES "species_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
