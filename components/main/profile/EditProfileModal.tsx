"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { toast } from "sonner";
import Cropper from "react-easy-crop";
import type { Area as CropArea, Point } from "react-easy-crop";
import { getCroppedImg } from "@/lib/canvasUtils";
import {
  XMarkIcon,
  UserCircleIcon,
  AdjustmentsHorizontalIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  CheckIcon,
  CameraIcon,
  FireIcon,
} from "@heroicons/react/24/outline";
import { UserProfile } from "@/core/user-profile/user-profile.entity";

// 辅助函数：读取文件为 Base64
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

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: UserProfile;
  onSave: (data: FormData) => Promise<void>;
}

export default function EditProfileModal({
  isOpen,
  onClose,
  initialData,
  onSave,
}: EditProfileModalProps) {
  const [nickname, setNickname] = useState(initialData.nickname);
  const [bio, setBio] = useState(initialData.bio);
  const [learnLevel, setLearnLevel] = useState(
    initialData.learnLevel || "初级",
  );

  // 学习目标状态
  const [dailyGoal, setDailyGoal] = useState(
    initialData.dailyStudyGoalMins || 20,
  );
  const [listeningGoal, setListeningGoal] = useState(
    initialData.weeklyListeningGoalHours || 2,
  );
  const [wordsGoal, setWordsGoal] = useState(initialData.weeklyWordsGoal || 50);

  // 图片相关状态
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    initialData.avatarUrl,
  );
  const [selectedFile, setSelectedFile] = useState<File | Blob | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 裁剪相关状态
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isCropping, setIsCropping] = useState(false);
  const [uploadImageSrc, setUploadImageSrc] = useState<string | null>(null);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(
    null,
  );

  // Tab 切换状态
  const [activeTab, setActiveTab] = useState<"profile" | "goals">("profile");

  useEffect(() => {
    if (isOpen) {
      setNickname(initialData.nickname || "");
      setBio(initialData.bio || "");
      setLearnLevel(initialData.learnLevel || "初级");

      // 初始化目标值
      setDailyGoal(initialData.dailyStudyGoalMins || 20);
      setListeningGoal(initialData.weeklyListeningGoalHours || 2);
      setWordsGoal(initialData.weeklyWordsGoal || 50);

      setAvatarPreview(initialData.avatarUrl);
      setSelectedFile(null);
      setIsCropping(false);
      setUploadImageSrc(null);
      setZoom(1);
      setActiveTab("profile");
    }
  }, [initialData, isOpen]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.warning("请选择图片文件");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.warning("图片大小不能超过 5MB");
        return;
      }
      const imageDataUrl = await readFile(file);
      setUploadImageSrc(imageDataUrl);
      setIsCropping(true);
      setZoom(1);
      e.target.value = "";
    }
  };

  const onCropComplete = useCallback(
    (croppedArea: Point, croppedAreaPixels: CropArea) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    [],
  );

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
        setIsCropping(false);
      }
    } catch (e) {
      console.error(e);
      toast.error("图片裁剪失败");
    }
  };

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

      // 提交学习目标
      formData.append("dailyStudyGoalMins", dailyGoal.toString());
      formData.append("weeklyListeningGoalHours", listeningGoal.toString());
      formData.append("weeklyWordsGoal", wordsGoal.toString());

      if (selectedFile) {
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
      <div className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-base-200 shrink-0">
          <h3 className="font-bold text-lg">
            {isCropping ? "调整头像" : "设置"}
          </h3>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs - 仅在非裁剪模式显示 */}
        {!isCropping && (
          <div role="tablist" className="tabs tabs-bordered w-full">
            <a
              role="tab"
              className={`tab h-12 ${activeTab === "profile" ? "tab-active font-semibold" : ""}`}
              onClick={() => setActiveTab("profile")}
            >
              <UserCircleIcon className="w-4 h-4 mr-2" /> 个人资料
            </a>
            <a
              role="tab"
              className={`tab h-12 ${activeTab === "goals" ? "tab-active font-semibold" : ""}`}
              onClick={() => setActiveTab("goals")}
            >
              <AdjustmentsHorizontalIcon className="w-4 h-4 mr-2" /> 学习目标
            </a>
          </div>
        )}

        {/* Content Area */}
        <div className="overflow-y-auto p-6 flex-1">
          {isCropping && uploadImageSrc ? (
            // --- 裁剪视图 ---
            <div className="flex flex-col h-full">
              <div className="relative w-full h-64 bg-gray-900 rounded-lg overflow-hidden mb-4">
                <Cropper
                  image={uploadImageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                  showGrid={false}
                  cropShape="round"
                />
              </div>
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
                  <CheckIcon className="w-4 h-4 mr-1" /> 确认使用
                </button>
              </div>
            </div>
          ) : (
            // --- 表单视图 ---
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Tab 1: Profile */}
              <div className={activeTab === "profile" ? "block" : "hidden"}>
                <div className="flex justify-center mb-6">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-full overflow-hidden ring ring-primary ring-offset-base-100 ring-offset-2 bg-base-200">
                      {avatarPreview &&
                      avatarPreview !== "default_avatar_url" ? (
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
                    <option value="General">General (未分级)</option>
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
              </div>

              {/* Tab 2: Learning Goals */}
              <div
                className={`${activeTab === "goals" ? "block" : "hidden"} space-y-8 py-2`}
              >
                <div className="alert bg-base-200/50 border-none text-sm text-base-content/70">
                  <FireIcon className="w-5 h-5 text-warning shrink-0" />
                  <span>设定合理的每日目标有助于保持连胜纪录！</span>
                </div>

                {/* 1. 学习等级 */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">当前英语水平</span>
                  </label>
                  <select
                    className="select select-bordered w-full focus:select-primary"
                    value={learnLevel}
                    onChange={(e) => setLearnLevel(e.target.value)}
                  >
                    <option value="初级">Beginner (初级)</option>
                    <option value="中级">Intermediate (中级)</option>
                    <option value="高级">Advanced (高级)</option>
                  </select>
                </div>

                {/* 2. 每日学习时长 */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">
                      每日学习时长目标
                    </span>
                    <span className="badge badge-primary badge-lg">
                      {dailyGoal} 分钟
                    </span>
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="120"
                    step="5"
                    value={dailyGoal}
                    onChange={(e) => setDailyGoal(Number(e.target.value))}
                    className="range range-primary range-sm"
                  />
                  <div className="w-full flex justify-between text-xs px-2 mt-2 text-base-content/50">
                    <span>10m</span>
                    <span>60m</span>
                    <span>120m</span>
                  </div>
                </div>

                {/* 3. 每周收听目标 */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">每周收听目标</span>
                    <span className="badge badge-secondary badge-lg">
                      {listeningGoal} 小时
                    </span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    step="0.5"
                    value={listeningGoal}
                    onChange={(e) => setListeningGoal(Number(e.target.value))}
                    className="range range-secondary range-sm"
                  />
                  <div className="w-full flex justify-between text-xs px-2 mt-2 text-base-content/50">
                    <span>1h</span>
                    <span>10h</span>
                    <span>20h</span>
                  </div>
                </div>

                {/* 4. 每周单词目标 */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">每周单词目标</span>
                    <span className="badge badge-accent badge-lg">
                      {wordsGoal} 个
                    </span>
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="200"
                    step="5"
                    value={wordsGoal}
                    onChange={(e) => setWordsGoal(Number(e.target.value))}
                    className="range range-accent range-sm"
                  />
                  <div className="w-full flex justify-between text-xs px-2 mt-2 text-base-content/50">
                    <span>10</span>
                    <span>100</span>
                    <span>200</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
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
                    "保存所有更改"
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
