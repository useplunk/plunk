-- CreateIndex
CREATE INDEX "actions_projectId_idx" ON "actions"("projectId");

-- CreateIndex
CREATE INDEX "actions_templateId_idx" ON "actions"("templateId");

-- CreateIndex
CREATE INDEX "clicks_createdAt_idx" ON "clicks"("createdAt");

-- CreateIndex
CREATE INDEX "clicks_link_idx" ON "clicks"("link");

-- CreateIndex
CREATE INDEX "clicks_emailId_idx" ON "clicks"("emailId");

-- CreateIndex
CREATE INDEX "contacts_projectId_createdAt_idx" ON "contacts"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "contacts_email_idx" ON "contacts"("email");

-- CreateIndex
CREATE INDEX "contacts_createdAt_idx" ON "contacts"("createdAt");

-- CreateIndex
CREATE INDEX "emails_projectId_idx" ON "emails"("projectId");

-- CreateIndex
CREATE INDEX "emails_actionId_idx" ON "emails"("actionId");

-- CreateIndex
CREATE INDEX "emails_campaignId_idx" ON "emails"("campaignId");

-- CreateIndex
CREATE INDEX "emails_contactId_idx" ON "emails"("contactId");

-- CreateIndex
CREATE INDEX "emails_createdAt_idx" ON "emails"("createdAt");

-- CreateIndex
CREATE INDEX "events_projectId_idx" ON "events"("projectId");

-- CreateIndex
CREATE INDEX "events_templateId_idx" ON "events"("templateId");

-- CreateIndex
CREATE INDEX "events_campaignId_idx" ON "events"("campaignId");

-- CreateIndex
CREATE INDEX "tasks_actionId_idx" ON "tasks"("actionId");

-- CreateIndex
CREATE INDEX "tasks_campaignId_idx" ON "tasks"("campaignId");

-- CreateIndex
CREATE INDEX "tasks_contactId_idx" ON "tasks"("contactId");

-- CreateIndex
CREATE INDEX "tasks_createdAt_idx" ON "tasks"("createdAt");

-- CreateIndex
CREATE INDEX "tasks_runBy_idx" ON "tasks"("runBy");

-- CreateIndex
CREATE INDEX "triggers_contactId_idx" ON "triggers"("contactId");

-- CreateIndex
CREATE INDEX "triggers_eventId_idx" ON "triggers"("eventId");

-- CreateIndex
CREATE INDEX "triggers_actionId_idx" ON "triggers"("actionId");

-- CreateIndex
CREATE INDEX "triggers_createdAt_idx" ON "triggers"("createdAt");
