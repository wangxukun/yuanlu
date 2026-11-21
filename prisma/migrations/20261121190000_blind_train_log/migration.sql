CREATE TABLE "blind_train_log" (
    "userid" TEXT NOT NULL REFERENCES "User"("userid") ON DELETE CASCADE,
    "clipid" TEXT NOT NULL REFERENCES "corpus_clips"("clipid") ON DELETE CASCADE,
    "day" DATE NOT NULL,
    "level" VARCHAR(2) NOT NULL,
    "position" INTEGER NOT NULL,
    "cursor" VARCHAR(32) NOT NULL,
    PRIMARY KEY ("userid", "clipid", "day", "level")
);
CREATE INDEX blind_train_progress ON blind_train_log ("userid", "day", "level", "position" DESC);
