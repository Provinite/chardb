-- Add registry permissions to roles
ALTER TABLE "roles" ADD COLUMN "can_edit_own_character_registry" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "roles" ADD COLUMN "can_edit_character_registry" BOOLEAN NOT NULL DEFAULT false;

-- Add registry_id to characters
ALTER TABLE "characters" ADD COLUMN "registry_id" VARCHAR(100);

-- Add unique constraint for registry_id per species
CREATE UNIQUE INDEX "characters_species_id_registry_id_key" ON "characters"("species_id", "registry_id");
