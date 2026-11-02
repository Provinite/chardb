-- CreateTable
CREATE TABLE "used_signup_challenges" (
    "nonce" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "used_signup_challenges_pkey" PRIMARY KEY ("nonce")
);

-- CreateIndex
CREATE INDEX "used_signup_challenges_expires_at_idx" ON "used_signup_challenges"("expires_at");
