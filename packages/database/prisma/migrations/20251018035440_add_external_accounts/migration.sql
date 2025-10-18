-- CreateEnum
CREATE TYPE "ExternalAccountProvider" AS ENUM ('DEVIANTART');

-- CreateTable
CREATE TABLE "external_accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" "ExternalAccountProvider" NOT NULL,
    "provider_account_id" VARCHAR(255) NOT NULL,
    "display_name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "external_accounts_provider_provider_account_id_key" ON "external_accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "external_accounts_provider_user_id_key" ON "external_accounts"("provider", "user_id");

-- AddForeignKey
ALTER TABLE "external_accounts" ADD CONSTRAINT "external_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
