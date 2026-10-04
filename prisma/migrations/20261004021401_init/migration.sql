-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "day" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'setup',

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateProfile" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "party" TEXT NOT NULL,
    "homeState" TEXT NOT NULL,
    "background" TEXT,
    "summary" TEXT,
    "personality" JSONB,

    CONSTRAINT "CandidateProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignEvent" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "day" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "scenario" TEXT,
    "opponentResponse" TEXT,
    "metadata" JSONB,

    CONSTRAINT "CampaignEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Response" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "day" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "interpretation" JSONB,
    "consequences" JSONB,

    CONSTRAINT "Response_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoterBlocSnapshot" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "day" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "population" INTEGER NOT NULL,
    "share" DOUBLE PRECISION NOT NULL,
    "supportPlayer" DOUBLE PRECISION NOT NULL,
    "supportOpponent" DOUBLE PRECISION NOT NULL,
    "changeFromPrior" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "VoterBlocSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StateSnapshot" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "day" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT NOT NULL,
    "electoralVotes" INTEGER NOT NULL,
    "population" INTEGER NOT NULL,
    "lean" DOUBLE PRECISION NOT NULL,
    "playerPercent" DOUBLE PRECISION NOT NULL,
    "opponentPercent" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "StateSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateSummary" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "day" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "source" TEXT NOT NULL,

    CONSTRAINT "CandidateSummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Campaign_status_idx" ON "Campaign"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateProfile_campaignId_key" ON "CandidateProfile"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignEvent_campaignId_createdAt_idx" ON "CampaignEvent"("campaignId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignEvent_campaignId_day_key" ON "CampaignEvent"("campaignId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "Response_eventId_key" ON "Response"("eventId");

-- CreateIndex
CREATE INDEX "Response_campaignId_day_idx" ON "Response"("campaignId", "day");

-- CreateIndex
CREATE INDEX "VoterBlocSnapshot_campaignId_day_idx" ON "VoterBlocSnapshot"("campaignId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "VoterBlocSnapshot_campaignId_day_name_key" ON "VoterBlocSnapshot"("campaignId", "day", "name");

-- CreateIndex
CREATE INDEX "StateSnapshot_campaignId_day_idx" ON "StateSnapshot"("campaignId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "StateSnapshot_campaignId_day_abbreviation_key" ON "StateSnapshot"("campaignId", "day", "abbreviation");

-- CreateIndex
CREATE INDEX "CandidateSummary_campaignId_day_idx" ON "CandidateSummary"("campaignId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateSummary_campaignId_day_key" ON "CandidateSummary"("campaignId", "day");

-- AddForeignKey
ALTER TABLE "CandidateProfile" ADD CONSTRAINT "CandidateProfile_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignEvent" ADD CONSTRAINT "CampaignEvent_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Response" ADD CONSTRAINT "Response_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CampaignEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Response" ADD CONSTRAINT "Response_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoterBlocSnapshot" ADD CONSTRAINT "VoterBlocSnapshot_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StateSnapshot" ADD CONSTRAINT "StateSnapshot_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateSummary" ADD CONSTRAINT "CandidateSummary_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
