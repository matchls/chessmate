-- AlterTable
ALTER TABLE "game" ADD COLUMN     "clientGameId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "game_clientGameId_key" ON "game"("clientGameId");
