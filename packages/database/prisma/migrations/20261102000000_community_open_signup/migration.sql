-- AlterTable
ALTER TABLE "communities" ADD COLUMN "open_signup_role_id" TEXT;

-- AddForeignKey
ALTER TABLE "communities" ADD CONSTRAINT "communities_open_signup_role_id_fkey" FOREIGN KEY ("open_signup_role_id") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
