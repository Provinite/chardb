-- CheckConstraint: a payout component pays something.
--
-- Matches every other money-carrying table -- shop price components, shop
-- purchase line costs, trade currency lines. A zero component is a currency
-- listed in a payout that pays none of it, which reads as a mistake wherever
-- it is rendered; a negative one would charge the holder for using their own
-- item.
ALTER TABLE "item_use_payout_components"
  ADD CONSTRAINT "item_use_payout_components_amount_positive" CHECK ("amount" > 0);
