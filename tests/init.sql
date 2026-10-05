CREATE TABLE "Customer" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL);
CREATE TABLE "Technician" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "active" BOOLEAN NOT NULL DEFAULT true);
CREATE TABLE "Request" (
  "id" TEXT NOT NULL PRIMARY KEY, "customerId" TEXT NOT NULL, "channel" TEXT NOT NULL, "message" TEXT NOT NULL,
  "receivedAt" DATETIME NOT NULL, "category" TEXT NOT NULL DEFAULT 'general', "intent" TEXT NOT NULL DEFAULT 'fault',
  "priority" TEXT NOT NULL, "priorityReason" TEXT NOT NULL, "missingInfo" TEXT NOT NULL DEFAULT '[]', "status" TEXT NOT NULL,
  "technicianId" TEXT, "scheduledFor" DATETIME, "duplicateOfId" TEXT, "duplicateSuggestedId" TEXT, "duplicateReason" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Request_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Request_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Request_duplicateOfId_fkey" FOREIGN KEY ("duplicateOfId") REFERENCES "Request" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE "RequestEvent" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "requestId" TEXT NOT NULL, "type" TEXT NOT NULL, "description" TEXT NOT NULL, "createdAt" DATETIME NOT NULL,
  CONSTRAINT "RequestEvent_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
