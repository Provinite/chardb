-- CreateEnum
CREATE TYPE "CurrencyTransactionKind" AS ENUM ('MINT', 'BURN', 'TRANSFER', 'SPEND', 'IMPORT');

-- CreateTable
CREATE TABLE "currencies" (
    "id" TEXT NOT NULL,
    "community_id" TEXT NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "symbol" VARCHAR(8),
    "description" TEXT,
    "color_id" TEXT,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "currencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "currency_balances" (
    "id" TEXT NOT NULL,
    "currency_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "currency_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "currency_transactions" (
    "id" TEXT NOT NULL,
    "currency_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "kind" "CurrencyTransactionKind" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "batch_id" TEXT NOT NULL,
    "counterparty_id" TEXT,
    "actor_user_id" TEXT,
    "actor_label" VARCHAR(50),
    "reason" TEXT,
    "staff_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "currency_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "currencies_community_id_idx" ON "currencies"("community_id");

-- CreateIndex
CREATE UNIQUE INDEX "currencies_community_id_code_key" ON "currencies"("community_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "currencies_community_id_name_key" ON "currencies"("community_id", "name");

-- CreateIndex
CREATE INDEX "currency_balances_user_id_idx" ON "currency_balances"("user_id");

-- CreateIndex
CREATE INDEX "currency_balances_currency_id_amount_idx" ON "currency_balances"("currency_id", "amount");

-- CreateIndex
CREATE UNIQUE INDEX "currency_balances_currency_id_user_id_key" ON "currency_balances"("currency_id", "user_id");

-- CreateIndex
CREATE INDEX "currency_transactions_currency_id_created_at_idx" ON "currency_transactions"("currency_id", "created_at");

-- CreateIndex
CREATE INDEX "currency_transactions_user_id_created_at_idx" ON "currency_transactions"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "currency_transactions_currency_id_user_id_created_at_idx" ON "currency_transactions"("currency_id", "user_id", "created_at");

-- CreateIndex
CREATE INDEX "currency_transactions_batch_id_idx" ON "currency_transactions"("batch_id");

-- AddForeignKey
ALTER TABLE "currencies" ADD CONSTRAINT "currencies_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "currencies" ADD CONSTRAINT "currencies_color_id_fkey" FOREIGN KEY ("color_id") REFERENCES "community_colors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "currency_balances" ADD CONSTRAINT "currency_balances_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "currency_balances" ADD CONSTRAINT "currency_balances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "currency_transactions" ADD CONSTRAINT "currency_transactions_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "currency_transactions" ADD CONSTRAINT "currency_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "currency_transactions" ADD CONSTRAINT "currency_transactions_counterparty_id_fkey" FOREIGN KEY ("counterparty_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "currency_transactions" ADD CONSTRAINT "currency_transactions_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CheckConstraint: a balance can never go negative.
--
-- Prisma cannot express this, so it is written by hand. It is not a redundant
-- belt over the service's own check: "read the balance, compare, then write"
-- races two concurrent spends against the same balance and lets both through.
-- The constraint is evaluated by the same statement that does the decrement,
-- so the loser of the race gets an error instead of an overdraft.
ALTER TABLE "currency_balances" ADD CONSTRAINT "currency_balances_amount_non_negative" CHECK ("amount" >= 0);

-- CheckConstraint: a ledger row must move something.
--
-- A zero-amount row says an event happened and changed nothing, which is either
-- a bug upstream or an audit trail that cannot be trusted to mean anything.
ALTER TABLE "currency_transactions" ADD CONSTRAINT "currency_transactions_amount_nonzero" CHECK ("amount" <> 0);

-- CheckConstraint: every row names exactly one kind of actor, or none.
--
-- Mirrors the item ledger's convention, which relies on the application to hold
-- it. Here it is enforced, because a row claiming both a user and "discord-bot"
-- has no answer to "who did this".
ALTER TABLE "currency_transactions" ADD CONSTRAINT "currency_transactions_one_actor" CHECK (NOT ("actor_user_id" IS NOT NULL AND "actor_label" IS NOT NULL));

-- CheckConstraint: a counterparty is exactly what TRANSFER means.
--
-- A transfer with nobody on the other side is a mint wearing the wrong label,
-- and a counterparty on a mint implies a movement that never happened.
ALTER TABLE "currency_transactions" ADD CONSTRAINT "currency_transactions_counterparty_matches_kind" CHECK (("kind" = 'TRANSFER') = ("counterparty_id" IS NOT NULL));

-- CheckConstraint: sign must agree with kind.
--
-- MINT adds, BURN and SPEND remove. TRANSFER is the one kind that is signed
-- per side, so it is left alone.
ALTER TABLE "currency_transactions" ADD CONSTRAINT "currency_transactions_sign_matches_kind" CHECK (
  ("kind" = 'MINT' AND "amount" > 0)
  OR ("kind" IN ('BURN', 'SPEND') AND "amount" < 0)
  OR ("kind" IN ('TRANSFER', 'IMPORT'))
);
