-- CreateIndex
CREATE INDEX "job_applications_applicantEmail_jobId_idx" ON "job_applications"("applicantEmail", "jobId");

-- CreateIndex
CREATE INDEX "job_applications_ipAddress_idx" ON "job_applications"("ipAddress");

-- CreateIndex
CREATE INDEX "submissions_candidateId_idx" ON "submissions"("candidateId");

-- CreateIndex
CREATE INDEX "timesheets_status_idx" ON "timesheets"("status");
