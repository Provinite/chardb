-- CreateTable
CREATE TABLE "character_folders" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "name" VARCHAR(50) NOT NULL,
    "is_private" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "character_folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "character_folder_entries" (
    "folder_id" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "character_folder_entries_pkey" PRIMARY KEY ("folder_id","character_id")
);

-- CreateIndex
CREATE INDEX "character_folders_owner_id_parent_id_sort_order_idx" ON "character_folders"("owner_id", "parent_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "character_folders_owner_id_parent_id_name_key" ON "character_folders"("owner_id", "parent_id", "name");

-- CreateIndex
CREATE INDEX "character_folder_entries_character_id_idx" ON "character_folder_entries"("character_id");

-- AddForeignKey
ALTER TABLE "character_folders" ADD CONSTRAINT "character_folders_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_folders" ADD CONSTRAINT "character_folders_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "character_folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_folder_entries" ADD CONSTRAINT "character_folder_entries_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "character_folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_folder_entries" ADD CONSTRAINT "character_folder_entries_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Sibling folder names, kept unique case-insensitively.
--
-- Prisma's own `character_folders_owner_id_parent_id_name_key` above cannot do
-- this alone on two counts: Postgres treats nulls as distinct in a unique
-- index, so it never constrains root folders, and it compares `name` exactly,
-- so "WIP" and "wip" would sit side by side. Two partial indexes on
-- `lower(name)` cover both halves of the tree.
CREATE UNIQUE INDEX "character_folders_owner_root_name_key"
  ON "character_folders" ("owner_id", lower("name"))
  WHERE "parent_id" IS NULL;

CREATE UNIQUE INDEX "character_folders_owner_parent_name_key"
  ON "character_folders" ("owner_id", "parent_id", lower("name"))
  WHERE "parent_id" IS NOT NULL;
