-- An open offer still holds its candies.
UPDATE "halloween_candy_offers" o
SET "candy_count" = (
  SELECT COUNT(*) FROM "halloween_candies" c WHERE c."offer_id" = o."id"
)
WHERE o."status" = 'OPEN' AND o."candy_count" IS NULL;

-- A filled offer's candies are the trade's lines that went to the other
-- side: to the initiator when the offer's owner was the offerer, and the
-- other way round for the initiator's own offer in a match. A cancelled
-- offer has handed its candies back and stays unknown.
UPDATE "halloween_candy_offers" o
SET "candy_count" = (
  SELECT COUNT(*)
  FROM "halloween_candy_trade_lines" l
  JOIN "halloween_candy_trades" t ON t."id" = l."trade_id"
  WHERE l."trade_id" = o."trade_id"
    AND l."to_initiator" = (t."offerer_id" = o."owner_id")
)
WHERE o."status" = 'FILLED' AND o."trade_id" IS NOT NULL AND o."candy_count" IS NULL;
