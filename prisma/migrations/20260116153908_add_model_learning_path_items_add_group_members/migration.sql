-- CreateTable
CREATE TABLE "learning_path_items" (
    "id" SERIAL NOT NULL,
    "pathid" INTEGER NOT NULL,
    "episodeid" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_path_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_members" (
    "id" SERIAL NOT NULL,
    "groupid" INTEGER NOT NULL,
    "userid" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "learning_path_items_pathid_order_idx" ON "learning_path_items"("pathid", "order");

-- CreateIndex
CREATE UNIQUE INDEX "group_members_groupid_userid_key" ON "group_members"("groupid", "userid");

-- AddForeignKey
ALTER TABLE "learning_path_items" ADD CONSTRAINT "learning_path_items_pathid_fkey" FOREIGN KEY ("pathid") REFERENCES "learning_paths"("pathid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_path_items" ADD CONSTRAINT "learning_path_items_episodeid_fkey" FOREIGN KEY ("episodeid") REFERENCES "episode"("episodeid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_groupid_fkey" FOREIGN KEY ("groupid") REFERENCES "study_groups"("groupid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_userid_fkey" FOREIGN KEY ("userid") REFERENCES "User"("userid") ON DELETE CASCADE ON UPDATE CASCADE;
