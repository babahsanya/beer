-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Beer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "style" TEXT NOT NULL,
    "abv" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "ibu" INTEGER NOT NULL DEFAULT 0,
    "country" TEXT NOT NULL DEFAULT '',
    "brewery" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "label" TEXT NOT NULL DEFAULT '',
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "untappdBid" INTEGER NOT NULL DEFAULT 0,
    "totalCheckins" INTEGER NOT NULL DEFAULT 0,
    "monthlyCheckins" INTEGER NOT NULL DEFAULT 0,
    "dailyCheckins" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'seed',
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Beer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "beerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "author" TEXT NOT NULL DEFAULT 'Anonymous',
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "comment" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorite" (
    "id" TEXT NOT NULL,
    "beerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "resultCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrendingBeer" (
    "id" TEXT NOT NULL,
    "beerId" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'global',
    "checkinDelta" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrendingBeer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ViewHistory" (
    "id" TEXT NOT NULL,
    "beerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "beerName" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ViewHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TastingEntry" (
    "id" TEXT NOT NULL,
    "beerId" TEXT NOT NULL DEFAULT '',
    "beerName" TEXT NOT NULL DEFAULT '',
    "beerStyle" TEXT NOT NULL DEFAULT '',
    "brewery" TEXT NOT NULL DEFAULT '',
    "abv" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "country" TEXT NOT NULL DEFAULT '',
    "userId" TEXT NOT NULL,
    "personalRating" INTEGER NOT NULL DEFAULT 0,
    "aroma" INTEGER NOT NULL DEFAULT 0,
    "taste" INTEGER NOT NULL DEFAULT 0,
    "appearance" INTEGER NOT NULL DEFAULT 0,
    "mouthfeel" INTEGER NOT NULL DEFAULT 0,
    "comment" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT '',
    "glassType" TEXT NOT NULL DEFAULT '',
    "wouldBuyAgain" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TastingEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAchievement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '🍺',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "target" INTEGER NOT NULL DEFAULT 1,
    "unlockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE INDEX "Beer_style_idx" ON "Beer"("style");

-- CreateIndex
CREATE INDEX "Beer_country_idx" ON "Beer"("country");

-- CreateIndex
CREATE INDEX "Beer_brewery_idx" ON "Beer"("brewery");

-- CreateIndex
CREATE INDEX "Beer_untappdBid_idx" ON "Beer"("untappdBid");

-- CreateIndex
CREATE INDEX "Beer_rating_idx" ON "Beer"("rating");

-- CreateIndex
CREATE INDEX "Beer_totalCheckins_idx" ON "Beer"("totalCheckins");

-- CreateIndex
CREATE INDEX "Beer_createdAt_idx" ON "Beer"("createdAt");

-- CreateIndex
CREATE INDEX "Review_beerId_createdAt_idx" ON "Review"("beerId", "createdAt");

-- CreateIndex
CREATE INDEX "Review_userId_idx" ON "Review"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_beerId_userId_key" ON "Review"("beerId", "userId");

-- CreateIndex
CREATE INDEX "Favorite_userId_idx" ON "Favorite"("userId");

-- CreateIndex
CREATE INDEX "Favorite_beerId_idx" ON "Favorite"("beerId");

-- CreateIndex
CREATE INDEX "Favorite_createdAt_idx" ON "Favorite"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_beerId_key" ON "Favorite"("userId", "beerId");

-- CreateIndex
CREATE INDEX "SearchHistory_userId_createdAt_idx" ON "SearchHistory"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TrendingBeer_beerId_key" ON "TrendingBeer"("beerId");

-- CreateIndex
CREATE INDEX "TrendingBeer_category_rank_idx" ON "TrendingBeer"("category", "rank");

-- CreateIndex
CREATE INDEX "ViewHistory_userId_idx" ON "ViewHistory"("userId");

-- CreateIndex
CREATE INDEX "ViewHistory_createdAt_idx" ON "ViewHistory"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ViewHistory_userId_beerId_key" ON "ViewHistory"("userId", "beerId");

-- CreateIndex
CREATE INDEX "TastingEntry_userId_createdAt_idx" ON "TastingEntry"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "TastingEntry_userId_beerStyle_idx" ON "TastingEntry"("userId", "beerStyle");

-- CreateIndex
CREATE INDEX "UserAchievement_userId_idx" ON "UserAchievement"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserAchievement_userId_key_key" ON "UserAchievement"("userId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_beerId_fkey" FOREIGN KEY ("beerId") REFERENCES "Beer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_beerId_fkey" FOREIGN KEY ("beerId") REFERENCES "Beer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchHistory" ADD CONSTRAINT "SearchHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrendingBeer" ADD CONSTRAINT "TrendingBeer_beerId_fkey" FOREIGN KEY ("beerId") REFERENCES "Beer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViewHistory" ADD CONSTRAINT "ViewHistory_beerId_fkey" FOREIGN KEY ("beerId") REFERENCES "Beer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViewHistory" ADD CONSTRAINT "ViewHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TastingEntry" ADD CONSTRAINT "TastingEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

