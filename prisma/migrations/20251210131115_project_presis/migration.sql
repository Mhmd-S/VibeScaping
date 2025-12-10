-- CreateTable
CREATE TABLE "Design" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "generatedImageUrl" TEXT NOT NULL,
    "originalImageUrl" TEXT,
    "mimeType" TEXT NOT NULL,
    "description" TEXT,
    "revisionHistory" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Design_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Design_projectId_idx" ON "Design"("projectId");

-- AddForeignKey
ALTER TABLE "Design" ADD CONSTRAINT "Design_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
