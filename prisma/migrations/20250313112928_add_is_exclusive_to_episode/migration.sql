-- CreateTable
CREATE TABLE "User" (
    "userid" SERIAL NOT NULL,
    "phone" VARCHAR(15) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "role" VARCHAR(50) DEFAULT 'user',
    "languagePreference" VARCHAR(50) DEFAULT 'zh-CN',
    "createAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMPTZ(6),
    "isOnline" BOOLEAN DEFAULT false,
    "lastActiveAt" TIMESTAMPTZ(6),

    CONSTRAINT "User_pkey" PRIMARY KEY ("userid")
);

-- CreateTable
CREATE TABLE "achievements" (
    "achievementid" SERIAL NOT NULL,
    "userid" INTEGER,
    "achievementName" VARCHAR(255) NOT NULL,
    "achievementDate" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("achievementid")
);

-- CreateTable
CREATE TABLE "advertisements" (
    "adid" SERIAL NOT NULL,
    "adTitle" VARCHAR(255) NOT NULL,
    "adContent" TEXT,
    "adUrl" VARCHAR(255),
    "startAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "endAt" TIMESTAMPTZ(6),

    CONSTRAINT "advertisements_pkey" PRIMARY KEY ("adid")
);

-- CreateTable
CREATE TABLE "category" (
    "categoryid" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "coverUrl" VARCHAR(255) NOT NULL DEFAULT 'default_cover_url',
    "description" TEXT,
    "parentCategoryid" INTEGER,

    CONSTRAINT "category_pkey" PRIMARY KEY ("categoryid")
);

-- CreateTable
CREATE TABLE "comments" (
    "commentid" SERIAL NOT NULL,
    "userid" INTEGER,
    "podcastid" INTEGER,
    "commentText" TEXT,
    "commentAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("commentid")
);

-- CreateTable
CREATE TABLE "discussion_threads" (
    "threadid" SERIAL NOT NULL,
    "podcastid" INTEGER,
    "userid" INTEGER,
    "threadTitle" VARCHAR(255) NOT NULL,
    "threadContent" TEXT,
    "postAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discussion_threads_pkey" PRIMARY KEY ("threadid")
);

-- CreateTable
CREATE TABLE "episode" (
    "episodeid" SERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "coverUrl" VARCHAR(255) NOT NULL DEFAULT 'default_cover_url',
    "description" TEXT,
    "audioUrl" VARCHAR(255) NOT NULL,
    "duration" VARCHAR(10),
    "categoryid" INTEGER,
    "uploaderid" INTEGER,
    "createAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMPTZ(6),
    "status" VARCHAR(50) DEFAULT 'unpublished',
    "isExclusive" BOOLEAN DEFAULT false,

    CONSTRAINT "episode_pkey" PRIMARY KEY ("episodeid")
);

-- CreateTable
CREATE TABLE "favorites" (
    "favoriteid" SERIAL NOT NULL,
    "userid" INTEGER,
    "podcastid" INTEGER,
    "favoritedate" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("favoriteid")
);

-- CreateTable
CREATE TABLE "learning_paths" (
    "pathid" SERIAL NOT NULL,
    "userid" INTEGER,
    "pathName" VARCHAR(255) NOT NULL,
    "creationAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_paths_pkey" PRIMARY KEY ("pathid")
);

-- CreateTable
CREATE TABLE "listening_history" (
    "historyid" SERIAL NOT NULL,
    "userid" INTEGER,
    "podcastid" INTEGER,
    "listenAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listening_history_pkey" PRIMARY KEY ("historyid")
);

-- CreateTable
CREATE TABLE "notifications" (
    "notificationid" SERIAL NOT NULL,
    "userid" INTEGER,
    "notificationText" TEXT,
    "notificationAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "isRead" BOOLEAN DEFAULT false,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("notificationid")
);

-- CreateTable
CREATE TABLE "quizzes" (
    "quizid" SERIAL NOT NULL,
    "podcastid" INTEGER,
    "question" TEXT NOT NULL,
    "options" JSONB,
    "correctAnswer" VARCHAR(255) NOT NULL,

    CONSTRAINT "quizzes_pkey" PRIMARY KEY ("quizid")
);

-- CreateTable
CREATE TABLE "ratings" (
    "ratingid" SERIAL NOT NULL,
    "userid" INTEGER,
    "podcastid" INTEGER,
    "ratingvalue" INTEGER,
    "ratingDate" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ratings_pkey" PRIMARY KEY ("ratingid")
);

-- CreateTable
CREATE TABLE "speech_recognition" (
    "recognitionid" SERIAL NOT NULL,
    "userid" INTEGER,
    "podcastid" INTEGER,
    "speechtext" TEXT,
    "accuracyscore" DOUBLE PRECISION,
    "recognitionDate" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "speech_recognition_pkey" PRIMARY KEY ("recognitionid")
);

-- CreateTable
CREATE TABLE "study_groups" (
    "groupid" SERIAL NOT NULL,
    "groupName" VARCHAR(255) NOT NULL,
    "creatorid" INTEGER,
    "creationAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "study_groups_pkey" PRIMARY KEY ("groupid")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "subscriptionid" SERIAL NOT NULL,
    "userid" INTEGER,
    "subscriptionType" VARCHAR(50) NOT NULL,
    "startDate" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMPTZ(6),

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("subscriptionid")
);

-- CreateTable
CREATE TABLE "subtitles" (
    "subtitleid" SERIAL NOT NULL,
    "podcastid" INTEGER,
    "text" TEXT,
    "startTime" VARCHAR(10),
    "endTime" VARCHAR(10),

    CONSTRAINT "subtitles_pkey" PRIMARY KEY ("subtitleid")
);

-- CreateTable
CREATE TABLE "user_profile" (
    "userid" INTEGER NOT NULL,
    "nickname" VARCHAR(255),
    "avatarUrl" VARCHAR(255) DEFAULT 'default_avatar_url',
    "email" VARCHAR(255),
    "bio" TEXT,
    "learnLevel" VARCHAR(50),

    CONSTRAINT "user_profile_pkey" PRIMARY KEY ("userid")
);

-- CreateTable
CREATE TABLE "vocabulary" (
    "vocabularyid" SERIAL NOT NULL,
    "userid" INTEGER,
    "word" VARCHAR(255) NOT NULL,
    "definition" TEXT,
    "addedDate" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vocabulary_pkey" PRIMARY KEY ("vocabularyid")
);

-- CreateTable
CREATE TABLE "captcha" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "captcha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sms_code" (
    "id" SERIAL NOT NULL,
    "phone" VARCHAR(15) NOT NULL,
    "code" VARCHAR(6) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sms_code_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "category_name_key" ON "category"("name");

-- AddForeignKey
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_userid_fkey" FOREIGN KEY ("userid") REFERENCES "User"("userid") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "category" ADD CONSTRAINT "category_parentCategoryid_fkey" FOREIGN KEY ("parentCategoryid") REFERENCES "category"("categoryid") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_podcastid_fkey" FOREIGN KEY ("podcastid") REFERENCES "episode"("episodeid") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_userid_fkey" FOREIGN KEY ("userid") REFERENCES "User"("userid") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "discussion_threads" ADD CONSTRAINT "discussion_threads_podcastid_fkey" FOREIGN KEY ("podcastid") REFERENCES "episode"("episodeid") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "discussion_threads" ADD CONSTRAINT "discussion_threads_userid_fkey" FOREIGN KEY ("userid") REFERENCES "User"("userid") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "episode" ADD CONSTRAINT "episode_categoryid_fkey" FOREIGN KEY ("categoryid") REFERENCES "category"("categoryid") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "episode" ADD CONSTRAINT "episode_uploaderid_fkey" FOREIGN KEY ("uploaderid") REFERENCES "User"("userid") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_podcastid_fkey" FOREIGN KEY ("podcastid") REFERENCES "episode"("episodeid") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_userid_fkey" FOREIGN KEY ("userid") REFERENCES "User"("userid") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "learning_paths" ADD CONSTRAINT "learning_paths_userid_fkey" FOREIGN KEY ("userid") REFERENCES "User"("userid") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "listening_history" ADD CONSTRAINT "listening_history_podcastid_fkey" FOREIGN KEY ("podcastid") REFERENCES "episode"("episodeid") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "listening_history" ADD CONSTRAINT "listening_history_userid_fkey" FOREIGN KEY ("userid") REFERENCES "User"("userid") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userid_fkey" FOREIGN KEY ("userid") REFERENCES "User"("userid") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_podcastid_fkey" FOREIGN KEY ("podcastid") REFERENCES "episode"("episodeid") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_podcastid_fkey" FOREIGN KEY ("podcastid") REFERENCES "episode"("episodeid") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_userid_fkey" FOREIGN KEY ("userid") REFERENCES "User"("userid") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "speech_recognition" ADD CONSTRAINT "speech_recognition_podcastid_fkey" FOREIGN KEY ("podcastid") REFERENCES "episode"("episodeid") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "speech_recognition" ADD CONSTRAINT "speech_recognition_userid_fkey" FOREIGN KEY ("userid") REFERENCES "User"("userid") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "study_groups" ADD CONSTRAINT "study_groups_creatorid_fkey" FOREIGN KEY ("creatorid") REFERENCES "User"("userid") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_userid_fkey" FOREIGN KEY ("userid") REFERENCES "User"("userid") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "subtitles" ADD CONSTRAINT "subtitles_podcastid_fkey" FOREIGN KEY ("podcastid") REFERENCES "episode"("episodeid") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_userid_fkey" FOREIGN KEY ("userid") REFERENCES "User"("userid") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vocabulary" ADD CONSTRAINT "vocabulary_userid_fkey" FOREIGN KEY ("userid") REFERENCES "User"("userid") ON DELETE CASCADE ON UPDATE NO ACTION;
