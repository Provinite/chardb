-- AlterTable
ALTER TABLE "images" ADD COLUMN     "thumbnail_crop_x" INTEGER,
ADD COLUMN     "thumbnail_crop_y" INTEGER,
ADD COLUMN     "thumbnail_crop_width" INTEGER,
ADD COLUMN     "thumbnail_crop_height" INTEGER;

-- CheckConstraint: a crop is all four numbers or none of them.
--
-- All four null is the default and means centre crop, which is what every
-- image did before this column existed. A partially written rect is the
-- dangerous state: the service reads "no crop" from a missing x and silently
-- renders a centre crop, so a half-saved rect would look like a feature that
-- quietly does nothing rather than like a bug. Fail the write instead.
--
-- Zero width or height is rejected for the same reason -- sharp's extract
-- throws on it, and a zero-area rect is not a framing choice anyone made.
ALTER TABLE "images"
  ADD CONSTRAINT "images_thumbnail_crop_complete" CHECK (
    (
      "thumbnail_crop_x" IS NULL
      AND "thumbnail_crop_y" IS NULL
      AND "thumbnail_crop_width" IS NULL
      AND "thumbnail_crop_height" IS NULL
    )
    OR (
      "thumbnail_crop_x" IS NOT NULL
      AND "thumbnail_crop_y" IS NOT NULL
      AND "thumbnail_crop_width" IS NOT NULL
      AND "thumbnail_crop_height" IS NOT NULL
      AND "thumbnail_crop_x" >= 0
      AND "thumbnail_crop_y" >= 0
      AND "thumbnail_crop_width" > 0
      AND "thumbnail_crop_height" > 0
    )
  );
