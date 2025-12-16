-- Rename Project to Workspace
ALTER TABLE "Project" RENAME TO "Workspace";
ALTER TABLE "Workspace" RENAME CONSTRAINT "Project_pkey" TO "Workspace_pkey";
ALTER INDEX "Project_ownerId_idx" RENAME TO "Workspace_ownerId_idx";

-- Rename Design to AnnotatedImage
ALTER TABLE "Design" RENAME TO "AnnotatedImage";
ALTER TABLE "AnnotatedImage" RENAME CONSTRAINT "Design_pkey" TO "AnnotatedImage_pkey";
ALTER INDEX "Design_projectId_idx" RENAME TO "AnnotatedImage_workspaceId_idx";

-- Rename projectId column to workspaceId
ALTER TABLE "AnnotatedImage" RENAME COLUMN "projectId" TO "workspaceId";

-- Update foreign key constraint
ALTER TABLE "AnnotatedImage" DROP CONSTRAINT "Design_projectId_fkey";
ALTER TABLE "AnnotatedImage" ADD CONSTRAINT "AnnotatedImage_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Update User relation foreign key
ALTER TABLE "Workspace" DROP CONSTRAINT "Project_ownerId_fkey";
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add apiKey column to User
ALTER TABLE "User" ADD COLUMN "apiKey" TEXT;

