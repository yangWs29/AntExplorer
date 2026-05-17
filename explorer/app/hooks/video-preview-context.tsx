"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { Modal } from "antd";
import dynamic from "next/dynamic";

// 动态导入 VideoPlayer 组件，避免 SSR 问题
const VideoPlayer = dynamic(() => import("../components/video-player"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 flex items-center justify-center">
      加载中...
    </div>
  ),
});

interface VideoPreviewContextType {
  currentVideo: string;
  currentVideoTitle: string;
  videoModalVisible: boolean;
  openVideoPreview: (videoUrl: string, title: string) => void;
  closeVideoPreview: () => void;
}

const VideoPreviewContext = createContext<VideoPreviewContextType | undefined>(
  undefined,
);

export const useVideoPreview = () => {
  const context = useContext(VideoPreviewContext);
  if (!context) {
    throw new Error("useVideoPreview must be used within VideoPreviewProvider");
  }
  return context;
};

interface VideoPreviewProviderProps {
  children: React.ReactNode;
}

export const VideoPreviewProvider = ({ children }: VideoPreviewProviderProps) => {
  const [currentVideo, setCurrentVideo] = useState<string>("");
  const [currentVideoTitle, setCurrentVideoTitle] = useState<string>("");
  const [videoModalVisible, setVideoModalVisible] = useState(false);

  const openVideoPreview = useCallback((videoUrl: string, title: string) => {
    console.log("Opening video:", videoUrl);
    setCurrentVideo(videoUrl);
    setCurrentVideoTitle(title);
    setVideoModalVisible(true);
  }, []);

  const closeVideoPreview = useCallback(() => {
    setVideoModalVisible(false);
    setCurrentVideo("");
    setCurrentVideoTitle("");
  }, []);

  return (
    <VideoPreviewContext.Provider
      value={{
        currentVideo,
        currentVideoTitle,
        videoModalVisible,
        openVideoPreview,
        closeVideoPreview,
      }}
    >
      {children}
      {/* 视频播放模态框 */}
      <Modal
        title={currentVideoTitle}
        open={videoModalVisible}
        onCancel={closeVideoPreview}
        afterClose={() => {
          setCurrentVideo("");
        }}
        footer={null}
        width={800}
        centered
        styles={{ body: { padding: 0 } }}
        destroyOnHidden
      >
        <div style={{ minHeight: "450px" }}>
          {currentVideo && <VideoPlayer key={currentVideo} src={currentVideo} />}
        </div>
      </Modal>
    </VideoPreviewContext.Provider>
  );
};
