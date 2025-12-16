"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import Image from "next/image";
import Cropper from "react-easy-crop"; // [新增] 引入裁剪组件
import { getCroppedImg } from "@/lib/canvasUtils"; // [新增] 引入工具函数
import type { Area as CropArea, Point } from "react-easy-crop";
import {
  MapPinIcon,
  CalendarDaysIcon,
  TrophyIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  BookOpenIcon,
  PlayCircleIcon,
  EllipsisHorizontalIcon,
  UserCircleIcon,
  CameraIcon,
  XMarkIcon,
  MagnifyingGlassMinusIcon, // [新增]
  MagnifyingGlassPlusIcon, // [新增]
  CheckIcon, // [新增]
} from "@heroicons/react/24/outline";

// 引入 Recharts
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatDate } from "@/lib/tools";

// --- Types ---
interface UserProfile {
  nickname: string;
  avatarUrl: string;
  bio: string;
  learnLevel: string;
  joinDate: string;
}

// --- Mock Data ---
const MOCK_STATS = {
  totalHours: 124,
  streakDays: 12,
  wordsLearned: 450,
  weeklyActivity: [
    { day: "Mon", minutes: 30 },
    { day: "Tue", minutes: 45 },
    { day: "Wed", minutes: 60 },
    { day: "Thu", minutes: 25 },
    { day: "Fri", minutes: 90 },
    { day: "Sat", minutes: 120 },
    { day: "Sun", minutes: 80 },
  ],
};

const MOCK_RECENT_PODCASTS = [
  {
    id: 1,
    title: "The Daily Life of a Programmer",
    author: "Tech Talk",
    progress: 75,
    thumbnailUrl: "/static/images/podcast-light.png",
  },
  {
    id: 2,
    title: "Learn English with Movies",
    author: "English 101",
    progress: 30,
    thumbnailUrl: "/static/images/podcast-dark.png",
  },
  {
    id: 3,
    title: "Global News Roundup",
    author: "World News",
    progress: 100,
    thumbnailUrl: "/static/images/episode-light.png",
  },
];

// [新增] 辅助函数：读取文件为 Base64
function readFile(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.addEventListener(
      "load",
      () => resolve(reader.result as string),
      false,
    );
    reader.readAsDataURL(file);
  });
}

// --- Edit Modal Component ---
const EditProfileModal = ({
  isOpen,
  onClose,
  initialData,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialData: UserProfile;
  onSave: (data: FormData) => Promise<void>;
}) => {
  const [nickname, setNickname] = useState(initialData.nickname);
  const [bio, setBio] = useState(initialData.bio);
  const [learnLevel, setLearnLevel] = useState(
    initialData.learnLevel || "Beginner",
  );

  // 图片相关状态
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    initialData.avatarUrl,
  );
  const [selectedFile, setSelectedFile] = useState<File | Blob | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // [新增] 裁剪相关状态
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isCropping, setIsCropping] = useState(false);
  const [uploadImageSrc, setUploadImageSrc] = useState<string | null>(null);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(
    null,
  );

  // 当 initialData 更新时同步状态
  useEffect(() => {
    if (isOpen) {
      setNickname(initialData.nickname || "");
      setBio(initialData.bio || "");
      setLearnLevel(initialData.learnLevel || "Beginner");
      setAvatarPreview(initialData.avatarUrl);
      setSelectedFile(null);
      // 重置裁剪状态
      setIsCropping(false);
      setUploadImageSrc(null);
      setZoom(1);
    }
  }, [initialData, isOpen]);

  // [修改] 处理文件选择：不直接预览，而是开启裁剪模式
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 检查文件类型
      if (!file.type.startsWith("image/")) {
        toast.warning("请选择图片文件");
        return;
      }
      // 检查文件大小 (2MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.warning("图片大小不能超过 2MB");
        return;
      }

      const imageDataUrl = await readFile(file);
      setUploadImageSrc(imageDataUrl);
      setIsCropping(true); // 开启裁剪视图
      setZoom(1);

      // 清空 input value，防止选择同一文件不触发 onChange
      e.target.value = "";
    }
  };

  const onCropComplete = useCallback(
    (croppedArea: Point, croppedAreaPixels: CropArea) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    [],
  );

  // [新增] 确认裁剪
  const handleCropConfirm = async () => {
    if (!uploadImageSrc || !croppedAreaPixels) return;
    try {
      const croppedBlob = await getCroppedImg(
        uploadImageSrc,
        croppedAreaPixels,
      );
      if (croppedBlob) {
        setSelectedFile(croppedBlob);
        setAvatarPreview(URL.createObjectURL(croppedBlob));
        setIsCropping(false); // 关闭裁剪视图，回到表单
      }
    } catch (e) {
      console.error(e);
      toast.error("图片裁剪失败");
    }
  };

  // [新增] 取消裁剪
  const handleCropCancel = () => {
    setIsCropping(false);
    setUploadImageSrc(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("nickname", nickname);
      formData.append("bio", bio);
      formData.append("learnLevel", learnLevel);

      if (selectedFile) {
        // 如果是 Blob (裁剪产生的)，FormData 需要第三个参数作为文件名
        if (selectedFile instanceof Blob && !(selectedFile as File).name) {
          formData.append("avatar", selectedFile, "avatar.jpg");
        } else {
          formData.append("avatar", selectedFile as File);
        }
      }
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      {/* 增加 max-h 设置以适应裁剪器 */}
      <div className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-base-200 shrink-0">
          <h3 className="font-bold text-lg">
            {isCropping ? "调整头像" : "编辑个人资料"}
          </h3>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area - 使用 flex-col 和 overflow-y-auto 确保内容滚动 */}
        <div className="overflow-y-auto p-6">
          {isCropping && uploadImageSrc ? (
            // --- 裁剪视图 ---
            <div className="flex flex-col h-full">
              <div className="relative w-full h-64 bg-gray-900 rounded-lg overflow-hidden mb-4">
                <Cropper
                  image={uploadImageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1} // 1:1 正方形
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                  showGrid={false}
                  cropShape="round" // 圆形遮罩预览，更符合头像场景
                />
              </div>

              {/* Zoom Slider */}
              <div className="flex items-center gap-2 mb-6 px-2">
                <MagnifyingGlassMinusIcon className="w-5 h-5 text-base-content/50" />
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="range range-primary range-xs flex-1"
                />
                <MagnifyingGlassPlusIcon className="w-5 h-5 text-base-content/50" />
              </div>

              <div className="flex gap-3 justify-end">
                <button onClick={handleCropCancel} className="btn btn-ghost">
                  取消
                </button>
                <button onClick={handleCropConfirm} className="btn btn-primary">
                  <CheckIcon className="w-4 h-4 mr-1" />
                  确认使用
                </button>
              </div>
            </div>
          ) : (
            // --- 常规表单视图 ---
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 头像上传 */}
              <div className="flex justify-center mb-6">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-full overflow-hidden ring ring-primary ring-offset-base-100 ring-offset-2 bg-base-200">
                    {avatarPreview && avatarPreview !== "default_avatar_url" ? (
                      <Image
                        src={avatarPreview}
                        alt="Avatar"
                        width={96}
                        height={96}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-base-200 text-base-content/30">
                        <UserCircleIcon className="w-16 h-16" />
                      </div>
                    )}
                  </div>
                  <div
                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <CameraIcon className="w-8 h-8 text-white" />
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/*"
                  />
                </div>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">昵称</span>
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="input input-bordered w-full focus:input-primary"
                  placeholder="你的名字"
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">英语水平</span>
                </label>
                <select
                  className="select select-bordered w-full focus:select-primary"
                  name="learnLevel"
                  value={learnLevel}
                  onChange={(e) => setLearnLevel(e.target.value)}
                >
                  <option value="Beginner">Beginner (初级)</option>
                  <option value="Intermediate">Intermediate (中级)</option>
                  <option value="Advanced">Advanced (高级)</option>
                </select>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">个人简介</span>
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="textarea textarea-bordered h-24 focus:textarea-primary"
                  placeholder="介绍一下自己..."
                ></textarea>
              </div>

              <div className="modal-action">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-ghost"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? (
                    <span className="loading loading-spinner"></span>
                  ) : (
                    "保存更改"
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Main Page Component ---
export default function PersonalCenterPage() {
  const { data: session, update: updateSession } = useSession();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile>({
    nickname: "",
    avatarUrl: "",
    bio: "",
    learnLevel: "Intermediate",
    joinDate: new Date().toLocaleDateString(),
  });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // 获取数据
  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/user/profile");
      if (res.ok) {
        const data = await res.json();
        setProfile({
          nickname: data.nickname || session?.user?.name || "User",
          avatarUrl: data.avatarUrl || session?.user?.image || "",
          bio: data.bio || "This user hasn't written a bio yet.",
          learnLevel: data.learnLevel || "Intermediate",
          joinDate: formatDate(data.User.createAt.toString()),
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("加载个人资料失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      fetchProfile();
    }
  }, [session]);

  const handleUpdateProfile = async (formData: FormData) => {
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        body: formData,
      });

      if (!res.ok) throw new Error("Update failed");
      const result = await res.json();

      // 更新本地 Session
      await updateSession({
        ...session,
        user: {
          ...session?.user,
          nickname: result.data.nickname,
          avatarUrl: result.data.avatarUrl,
        },
      });

      toast.success("个人资料已更新");
      fetchProfile(); // 刷新数据
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("更新失败，请重试");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-100">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100/50 pb-12">
      {/* Edit Modal */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        initialData={profile}
        onSave={handleUpdateProfile}
      />

      {/* Header Background */}
      <div className="h-48 bg-gradient-to-r from-primary to-secondary w-full relative">
        <div className="absolute inset-0 bg-black/10"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: User Card */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-base-100 rounded-2xl shadow-sm border border-base-200 overflow-hidden">
              <div className="p-6 text-center">
                <div className="relative inline-block">
                  <div className="w-32 h-32 rounded-full border-4 border-base-100 shadow-lg mx-auto overflow-hidden bg-base-200">
                    {profile.avatarUrl &&
                    profile.avatarUrl !== "default_avatar_url" ? (
                      <Image
                        src={profile.avatarUrl}
                        alt={profile.nickname}
                        width={128}
                        height={128}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <UserCircleIcon className="w-20 h-20 text-base-content/20" />
                      </div>
                    )}
                  </div>
                  <div
                    className="absolute bottom-2 right-2 bg-success p-2 rounded-full border-2 border-base-100"
                    title="Online"
                  ></div>
                </div>

                <h1 className="mt-4 text-2xl font-bold text-base-content">
                  {profile.nickname || "User"}
                </h1>
                <p className="text-sm font-medium bg-primary/10 text-primary py-1 px-3 rounded-full inline-block mt-2">
                  {profile.learnLevel} Learner
                </p>

                <p className="mt-4 text-base-content/70 text-sm leading-relaxed px-4">
                  {profile.bio}
                </p>

                <div className="mt-6 flex flex-col space-y-3 text-sm text-base-content/60">
                  <div className="flex items-center justify-center space-x-2">
                    <MapPinIcon className="w-4 h-4" />
                    <span>中国</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <CalendarDaysIcon className="w-4 h-4" />
                    <span>{profile.joinDate} 加入</span>
                  </div>
                </div>

                <div className="mt-6 border-t border-base-200 pt-6">
                  <button
                    onClick={() => setIsEditModalOpen(true)}
                    className="btn btn-primary w-full shadow-md shadow-primary/20"
                  >
                    编辑个人资料
                  </button>
                </div>
              </div>
            </div>

            {/* Achievements Snippet (Mock) */}
            <div className="bg-base-100 rounded-2xl shadow-sm border border-base-200 p-6">
              <h3 className="text-lg font-semibold text-base-content mb-4 flex items-center gap-2">
                <TrophyIcon className="w-5 h-5 text-warning" />
                近期成就
              </h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-warning/10 p-2 rounded-full">
                    <BookOpenIcon className="w-4 h-4 text-warning" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-base-content">
                      Vocabulary Master
                    </p>
                    <p className="text-xs text-base-content/60">
                      Learned 500 words
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="bg-success/10 p-2 rounded-full">
                    <ArrowTrendingUpIcon className="w-4 h-4 text-success" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-base-content">
                      Consistency King
                    </p>
                    <p className="text-xs text-base-content/60">7 day streak</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Stats & Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Total Hours */}
              <div className="bg-base-100 p-5 rounded-2xl shadow-sm border border-base-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-base-content/50 uppercase tracking-wider">
                      总小时数
                    </p>
                    <p className="mt-1 text-2xl font-bold text-base-content">
                      {MOCK_STATS.totalHours}h
                    </p>
                  </div>
                  <div className="bg-info/10 p-2 rounded-lg">
                    <ClockIcon className="w-5 h-5 text-info" />
                  </div>
                </div>
              </div>

              {/* Streak */}
              <div className="bg-base-100 p-5 rounded-2xl shadow-sm border border-base-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-base-content/50 uppercase tracking-wider">
                      连续天数
                    </p>
                    <p className="mt-1 text-2xl font-bold text-base-content">
                      {MOCK_STATS.streakDays}
                    </p>
                  </div>
                  <div className="bg-error/10 p-2 rounded-lg">
                    <ArrowTrendingUpIcon className="w-5 h-5 text-error" />
                  </div>
                </div>
              </div>

              {/* Words */}
              <div className="bg-base-100 p-5 rounded-2xl shadow-sm border border-base-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-base-content/50 uppercase tracking-wider">
                      词汇
                    </p>
                    <p className="mt-1 text-2xl font-bold text-base-content">
                      {MOCK_STATS.wordsLearned}
                    </p>
                  </div>
                  <div className="bg-secondary/10 p-2 rounded-lg">
                    <BookOpenIcon className="w-5 h-5 text-secondary" />
                  </div>
                </div>
              </div>
            </div>

            {/* Learning Activity Chart */}
            <div className="bg-base-100 p-6 rounded-2xl shadow-sm border border-base-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-base-content">
                  每周学习活动
                </h3>
                <select className="select select-sm select-bordered bg-base-200/50">
                  <option>本周</option>
                  <option>上周</option>
                </select>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={MOCK_STATS.weeklyActivity}>
                    <defs>
                      <linearGradient
                        id="colorMinutes"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#4f46e5"
                          stopOpacity={0.2}
                        />
                        <stop
                          offset="95%"
                          stopColor="#4f46e5"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="rgba(0,0,0,0.1)"
                    />
                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#94a3b8", fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#94a3b8", fontSize: 12 }}
                      unit="m"
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "none",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="minutes"
                      stroke="#4f46e5"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorMinutes)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent History */}
            <div className="bg-base-100 rounded-2xl shadow-sm border border-base-200 overflow-hidden">
              <div className="p-6 border-b border-base-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-base-content">
                  最近听过
                </h3>
                <button className="text-sm text-primary hover:text-primary-focus font-medium">
                  查看全部
                </button>
              </div>
              <div className="divide-y divide-base-200">
                {MOCK_RECENT_PODCASTS.map((podcast) => (
                  <div
                    key={podcast.id}
                    className="p-4 flex items-center hover:bg-base-200/50 transition-colors group"
                  >
                    <div className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-base-300">
                      <Image
                        src={podcast.thumbnailUrl}
                        alt={podcast.title}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                        <PlayCircleIcon className="w-8 h-8 text-white" />
                      </div>
                    </div>

                    <div className="ml-4 flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-base-content truncate">
                        {podcast.title}
                      </h4>
                      <p className="text-sm text-base-content/60 mb-1">
                        {podcast.author}
                      </p>

                      {/* Progress Bar */}
                      <div className="flex items-center space-x-3">
                        <div className="flex-1 h-1.5 bg-base-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-500"
                            style={{ width: `${podcast.progress}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-base-content/40 font-medium w-8 text-right">
                          {podcast.progress === 100
                            ? "Done"
                            : `${podcast.progress}%`}
                        </span>
                      </div>
                    </div>

                    <div className="ml-4 flex-shrink-0">
                      <button className="p-2 text-base-content/40 hover:text-base-content hover:bg-base-200 rounded-full transition-colors">
                        <EllipsisHorizontalIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
