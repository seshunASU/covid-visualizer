-- CreateIndex
CREATE INDEX "confirmed_date_idx" ON "confirmed"("date");

-- CreateIndex
CREATE INDEX "deceased_date_idx" ON "deceased"("date");

-- CreateIndex
CREATE INDEX "recovered_date_idx" ON "recovered"("date");

-- Composite indexes
CREATE INDEX "confirmed_date_country_idx" ON "confirmed"("date", SPLIT_PART(location, '_', 1));
CREATE INDEX "deceased_date_country_idx" ON "deceased"("date", SPLIT_PART(location, '_', 1));
CREATE INDEX "recovered_date_country_idx" ON "recovered"("date", SPLIT_PART(location, '_', 1));