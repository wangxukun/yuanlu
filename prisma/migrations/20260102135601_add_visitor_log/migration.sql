-- CreateTable
CREATE TABLE "VisitorLog" (
    "id" TEXT NOT NULL,
    "ip" VARCHAR(45),
    "location" VARCHAR(100),
    "userAgent" TEXT,
    "path" VARCHAR(255) NOT NULL,
    "userid" TEXT,
    "createAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitorLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VisitorLog_createAt_idx" ON "VisitorLog"("createAt" DESC);

-- CreateIndex
CREATE INDEX "VisitorLog_ip_idx" ON "VisitorLog"("ip");

-- CreateIndex
CREATE INDEX "VisitorLog_userid_idx" ON "VisitorLog"("userid");

-- AddForeignKey
ALTER TABLE "VisitorLog" ADD CONSTRAINT "VisitorLog_userid_fkey" FOREIGN KEY ("userid") REFERENCES "User"("userid") ON DELETE SET NULL ON UPDATE CASCADE;
