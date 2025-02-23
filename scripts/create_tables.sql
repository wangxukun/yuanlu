-- 创建名为 yuanlu 的数据库
CREATE DATABASE yuanlu;

-- 连接到 yuanlu 数据库
\c yuanlu;

-- 创建用户表 (User)
-- 该表存储系统用户的基本信息
CREATE TABLE "User" (
    UserID SERIAL PRIMARY KEY, -- 用户唯一标识符，自增主键
    Username VARCHAR(255) NOT NULL UNIQUE, -- 用户名，唯一且不能为空
    Password VARCHAR(255) NOT NULL, -- 密码哈希值，不能为空
    Email VARCHAR(255) NOT NULL UNIQUE, -- 邮箱地址，唯一且不能为空
    Phone VARCHAR(15) UNIQUE, -- 手机号码，可选且唯一
    Role VARCHAR(50) DEFAULT '普通用户', -- 用户角色，默认为普通用户
    LanguagePreference VARCHAR(50), -- 用户的语言偏好
    RegistrationDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- 用户注册时间，默认为当前时间
    LastLoginDate TIMESTAMP -- 用户最后登录时间
);

-- 创建用户扩展信息表 (UserProfile)
-- 该表存储用户的扩展信息，与 User 表一对一关联
CREATE TABLE UserProfile (
    UserID INT PRIMARY KEY REFERENCES "User"(UserID) ON DELETE CASCADE, -- 用户ID，外键关联到 User 表，主键
    Nickname VARCHAR(255), -- 用户昵称，可选
    AvatarUrl VARCHAR(255) DEFAULT 'default_avatar_url', -- 用户头像 URL，默认为系统默认头像
    Bio TEXT, -- 用户个人简介，可选
    LearnLevel VARCHAR(50) -- 用户学习水平（初、中、高），可选
);

-- 创建播客分类表 (Category)
-- 该表存储播客的分类信息，支持多级分类
CREATE TABLE Category (
    CategoryId SERIAL PRIMARY KEY, -- 分类唯一标识符，自增主键
    Name VARCHAR(255) NOT NULL UNIQUE, -- 分类名称，唯一且不能为空
    CoverUrl VARCHAR(255) NOT NULL DEFAULT 'default_cover_url', -- 分类封面图片 URL，默认为系统默认图片
    Description TEXT, -- 分类描述，可选
    ParentCategoryId INT REFERENCES Category(CategoryId) ON DELETE SET NULL -- 父分类 ID，支持子分类，外键自引用
);

-- 创建播客集表 (Episode)
-- 该表存储播客集的基本信息
CREATE TABLE Episode (
    EpisodeId SERIAL PRIMARY KEY, -- 播客集唯一标识符，自增主键
    Title VARCHAR(255) NOT NULL, -- 播客标题，不能为空
    CoverUrl VARCHAR(255) NOT NULL DEFAULT 'default_cover_url', -- 播客封面图片 URL，默认为系统默认图片
    Description TEXT, -- 播客描述，可选
    AudioUrl VARCHAR(255) NOT NULL, -- 音频文件 URL，不能为空
    Duration VARCHAR(10), -- 音频时长，格式为秒数或 HH:MM:SS
    CategoryId INT REFERENCES Category(CategoryId) ON DELETE SET NULL, -- 分类 ID，外键关联到 Category 表
    UploaderId INT REFERENCES "User"(UserID) ON DELETE CASCADE, -- 上传者 ID，外键关联到 User 表
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- 播客创建时间，默认为当前时间
    UpdatedAt TIMESTAMP, -- 播客最后更新时间
    Status VARCHAR(50) DEFAULT '已发布' -- 播客状态（未发布、已发布），默认为已发布
);

-- 创建收听历史表 (ListeningHistory)
-- 该表存储用户的播客收听记录
CREATE TABLE ListeningHistory (
    HistoryID SERIAL PRIMARY KEY, -- 收听历史唯一标识符，自增主键
    UserID INT REFERENCES "User"(UserID) ON DELETE CASCADE, -- 用户 ID，外键关联到 User 表
    PodcastID INT REFERENCES Episode(EpisodeId) ON DELETE CASCADE, -- 播客 ID，外键关联到 Episode 表
    ListenDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- 收听时间，默认为当前时间
);

-- 创建收藏表 (Favorites)
-- 该表存储用户收藏的播客记录
CREATE TABLE Favorites (
    FavoriteID SERIAL PRIMARY KEY, -- 收藏唯一标识符，自增主键
    UserID INT REFERENCES "User"(UserID) ON DELETE CASCADE, -- 用户 ID，外键关联到 User 表
    PodcastID INT REFERENCES Episode(EpisodeId) ON DELETE CASCADE, -- 播客 ID，外键关联到 Episode 表
    FavoriteDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- 收藏时间，默认为当前时间
);

-- 创建评论表 (Comments)
-- 该表存储用户对播客的评论
CREATE TABLE Comments (
    CommentID SERIAL PRIMARY KEY, -- 评论唯一标识符，自增主键
    UserID INT REFERENCES "User"(UserID) ON DELETE CASCADE, -- 用户 ID，外键关联到 User 表
    PodcastID INT REFERENCES Episode(EpisodeId) ON DELETE CASCADE, -- 播客 ID，外键关联到 Episode 表
    CommentText TEXT, -- 评论内容
    CommentDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- 评论时间，默认为当前时间
);

-- 创建评分表 (Ratings)
-- 该表存储用户对播客的评分
CREATE TABLE Ratings (
    RatingID SERIAL PRIMARY KEY, -- 评分唯一标识符，自增主键
    UserID INT REFERENCES "User"(UserID) ON DELETE CASCADE, -- 用户 ID，外键关联到 User 表
    PodcastID INT REFERENCES Episode(EpisodeId) ON DELETE CASCADE, -- 播客 ID，外键关联到 Episode 表
    RatingValue INT CHECK (RatingValue >= 1 AND RatingValue <= 5), -- 评分值，范围 1 到 5
    RatingDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- 评分时间，默认为当前时间
);

-- 创建字幕表 (Subtitles)
-- 该表存储播客的字幕信息
CREATE TABLE Subtitles (
    SubtitleID SERIAL PRIMARY KEY, -- 字幕唯一标识符，自增主键
    PodcastID INT REFERENCES Episode(EpisodeId) ON DELETE CASCADE, -- 播客 ID，外键关联到 Episode 表
    Text TEXT, -- 字幕文本
    StartTime VARCHAR(10), -- 字幕开始时间
    EndTime VARCHAR(10) -- 字幕结束时间
);

-- 创建词汇表 (Vocabulary)
-- 该表存储用户学习的词汇
CREATE TABLE Vocabulary (
    VocabularyID SERIAL PRIMARY KEY, -- 词汇唯一标识符，自增主键
    UserID INT REFERENCES "User"(UserID) ON DELETE CASCADE, -- 用户 ID，外键关联到 User 表
    Word VARCHAR(255) NOT NULL, -- 单词
    Definition TEXT, -- 单词定义
    AddedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- 添加时间，默认为当前时间
);

-- 创建测验表 (Quizzes)
-- 该表存储与播客相关的测验题目
CREATE TABLE Quizzes (
    QuizID SERIAL PRIMARY KEY, -- 测验唯一标识符，自增主键
    PodcastID INT REFERENCES Episode(EpisodeId) ON DELETE CASCADE, -- 播客 ID，外键关联到 Episode 表
    Question TEXT NOT NULL, -- 测验问题
    Options JSONB, -- 测验选项（JSON 格式）
    CorrectAnswer VARCHAR(255) NOT NULL -- 正确答案
);

-- 创建学习小组表 (StudyGroups)
-- 该表存储用户创建的学习小组
CREATE TABLE StudyGroups (
    GroupID SERIAL PRIMARY KEY, -- 学习小组唯一标识符，自增主键
    GroupName VARCHAR(255) NOT NULL, -- 小组名称
    CreatorID INT REFERENCES "User"(UserID) ON DELETE CASCADE, -- 创建者 ID，外键关联到 User 表
    CreationDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- 创建时间，默认为当前时间
);

-- 创建讨论区表 (DiscussionThreads)
-- 该表存储用户对播客的讨论帖子
CREATE TABLE DiscussionThreads (
    ThreadID SERIAL PRIMARY KEY, -- 讨论帖子唯一标识符，自增主键
    PodcastID INT REFERENCES Episode(EpisodeId) ON DELETE CASCADE, -- 播客 ID，外键关联到 Episode 表
    UserID INT REFERENCES "User"(UserID) ON DELETE CASCADE, -- 用户 ID，外键关联到 User 表
    ThreadTitle VARCHAR(255) NOT NULL, -- 帖子标题
    ThreadContent TEXT, -- 帖子内容
    PostDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- 发帖时间，默认为当前时间
);

-- 创建成就表 (Achievements)
-- 该表存储用户的学习成就
CREATE TABLE Achievements (
    AchievementID SERIAL PRIMARY KEY, -- 成就唯一标识符，自增主键
    UserID INT REFERENCES "User"(UserID) ON DELETE CASCADE, -- 用户 ID，外键关联到 User 表
    AchievementName VARCHAR(255) NOT NULL, -- 成就名称
    AchievementDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- 成就获得时间，默认为当前时间
);

-- 创建通知表 (Notifications)
-- 该表存储用户的通知信息
CREATE TABLE Notifications (
    NotificationID SERIAL PRIMARY KEY, -- 通知唯一标识符，自增主键
    UserID INT REFERENCES "User"(UserID) ON DELETE CASCADE, -- 用户 ID，外键关联到 User 表
    NotificationText TEXT, -- 通知内容
    NotificationDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- 通知时间，默认为当前时间
    IsRead BOOLEAN DEFAULT FALSE -- 是否已读，默认为未读
);

-- 创建付费订阅表 (Subscriptions)
-- 该表存储用户的付费订阅信息
CREATE TABLE Subscriptions (
    SubscriptionID SERIAL PRIMARY KEY, -- 订阅唯一标识符，自增主键
    UserID INT REFERENCES "User"(UserID) ON DELETE CASCADE, -- 用户 ID，外键关联到 User 表
    SubscriptionType VARCHAR(50) NOT NULL, -- 订阅类型
    StartDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- 订阅开始时间，默认为当前时间
    EndDate TIMESTAMP -- 订阅结束时间
);

-- 创建学习路径表 (LearningPaths)
-- 该表存储用户的学习路径
CREATE TABLE LearningPaths (
    PathID SERIAL PRIMARY KEY, -- 学习路径唯一标识符，自增主键
    UserID INT REFERENCES "User"(UserID) ON DELETE CASCADE, -- 用户 ID，外键关联到 User 表
    PathName VARCHAR(255) NOT NULL, -- 学习路径名称
    CreationDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- 创建时间，默认为当前时间
);

-- 创建语音识别表 (SpeechRecognition)
-- 该表存储用户的语音识别记录
CREATE TABLE SpeechRecognition (
    RecognitionID SERIAL PRIMARY KEY, -- 语音识别唯一标识符，自增主键
    UserID INT REFERENCES "User"(UserID) ON DELETE CASCADE, -- 用户 ID，外键关联到 User 表
    PodcastID INT REFERENCES Episode(EpisodeId) ON DELETE CASCADE, -- 播客 ID，外键关联到 Episode 表
    SpeechText TEXT, -- 语音识别文本
    AccuracyScore FLOAT, -- 语音识别准确率
    RecognitionDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- 识别时间，默认为当前时间
);

-- 创建广告表 (Advertisements)
-- 该表存储广告信息
CREATE TABLE Advertisements (
    AdID SERIAL PRIMARY KEY, -- 广告唯一标识符，自增主键
    AdTitle VARCHAR(255) NOT NULL, -- 广告标题
    AdContent TEXT, -- 广告内容
    AdURL VARCHAR(255), -- 广告链接
    StartDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- 广告开始时间，默认为当前时间
    EndDate TIMESTAMP -- 广告结束时间
);