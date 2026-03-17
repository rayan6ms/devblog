ALTER TABLE "Post"
ADD COLUMN "thumbnail" TEXT,
ADD COLUMN "thumbnailAlt" TEXT;

DROP INDEX IF EXISTS "Post_title_key";
