-- Site-wide permissions a personal access token may act with, each only while
-- its owner still holds it. Existing tokens hold none.
ALTER TABLE "personal_access_tokens" ADD COLUMN "global_permissions" TEXT[] DEFAULT ARRAY[]::TEXT[];
