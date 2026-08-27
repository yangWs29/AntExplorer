"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { Modal, Drawer } from "antd";
import { UnorderedListOutlined, PlayCircleOutlined } from "@ant-design/icons";
import dynamic from "next/dynamic";

// 动态导入 VideoPlayer 组件，避免 SSR 问题
const VideoPlayer = dynamic(() => import("../components/VideoPlayer"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 flex items-center justify-center">
      加载中...
    </div>
  ),
});

export interface VideoListItem {
  url: string;
  title: string;
}

interface VideoPreviewContextType {
  currentVideo: string;
  currentVideoTitle: string;
  videoModalVisible: boolean;
  videoList: VideoListItem[];
  currentVideoIndex: number;
  openVideoPreview: (
    videoUrl: string,
    title: string,
    videoList?: VideoListItem[],
  ) => void;
  closeVideoPreview: () => void;
  switchVideo: (index: number) => void;
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

export const VideoPreviewProvider = ({
  children,
}: VideoPreviewProviderProps) => {
  const [currentVideo, setCurrentVideo] = useState<string>("");
  const [currentVideoTitle, setCurrentVideoTitle] = useState<string>("");
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [videoList, setVideoList] = useState<VideoListItem[]>([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(-1);
  const [playlistOpen, setPlaylistOpen] = useState(false);

  const openVideoPreview = useCallback(
    (videoUrl: string, title: string, list?: VideoListItem[]) => {
      setCurrentVideo(videoUrl);
      setCurrentVideoTitle(title);
      setVideoModalVisible(true);
      if (list && list.length > 0) {
        setVideoList(list);
        const idx = list.findIndex((v) => v.url === videoUrl);
        setCurrentVideoIndex(idx);
      } else {
        setVideoList([]);
        setCurrentVideoIndex(-1);
      }
      setPlaylistOpen(false);
    },
    [],
  );

  const closeVideoPreview = useCallback(() => {
    setVideoModalVisible(false);
    setPlaylistOpen(false);
    setTimeout(() => {
      setCurrentVideo("");
      setVideoList([]);
      setCurrentVideoIndex(-1);
    }, 0);
  }, []);

  const switchVideo = useCallback(
    (index: number) => {
      if (index < 0 || index >= videoList.length) return;
      const item = videoList[index];
      setCurrentVideo(item.url);
      setCurrentVideoTitle(item.title);
      setCurrentVideoIndex(index);
    },
    [videoList],
  );

  const hasPlaylist = videoList.length > 1;

  return (
    <VideoPreviewContext.Provider
      value={{
        currentVideo,
        currentVideoTitle,
        videoModalVisible,
        videoList,
        currentVideoIndex,
        openVideoPreview,
        closeVideoPreview,
        switchVideo,
      }}
    >
      {children}
      {/* 视频播放模态框 */}
      <Modal
        title={
          <div className="flex items-center justify-between pr-8">
            <span className="truncate">{currentVideoTitle}</span>
            {hasPlaylist && (
              <span
                className="text-xs text-gray-400 ml-2 flex-shrink-0 cursor-pointer hover:text-blue-400 transition-colors"
                onClick={() => setPlaylistOpen(!playlistOpen)}
              >
                {currentVideoIndex + 1} / {videoList.length}
              </span>
            )}
          </div>
        }
        open={videoModalVisible}
        onCancel={closeVideoPreview}
        afterClose={() => {
          setCurrentVideo("");
        }}
        footer={null}
        width="80vw"
        centered
        zIndex={10000}
        styles={{
          body: {
            padding: 0,
            minHeight: "450px",
            maxHeight: "80vh",
            overflow: "auto",
          },
        }}
        destroyOnHidden
      >
        <div className="relative">
          {currentVideo && (
            <VideoPlayer key={currentVideo} src={currentVideo} />
          )}
          {/* 播放列表按钮 */}
          {hasPlaylist && (
            <button
              className="absolute top-2 right-2 z-10 bg-black/60 hover:bg-black/80 text-white rounded-full w-9 h-9 flex items-center justify-center transition-colors"
              onClick={() => setPlaylistOpen(!playlistOpen)}
              title="视频列表"
            >
              <UnorderedListOutlined style={{ fontSize: 16 }} />
            </button>
          )}
        </div>
      </Modal>

      {/* 视频列表面板 */}
      <Drawer
        title={`视频列表 (${videoList.length})`}
        open={playlistOpen}
        onClose={() => setPlaylistOpen(false)}
        placement="right"
        styles={{
          wrapper: { width: 360, zIndex: 10001 },
          body: { padding: "8px 0" },
        }}
      >
        <div className="flex flex-col gap-1">
          {videoList.map((item, index) => (
            <div
              key={item.url + index}
              className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors ${
                index === currentVideoIndex
                  ? "bg-blue-600/20 text-blue-400"
                  : "hover:bg-white/5 text-gray-300"
              }`}
              onClick={() => {
                switchVideo(index);
              }}
            >
              <PlayCircleOutlined
                style={{
                  fontSize: 16,
                  flexShrink: 0,
                  color: index === currentVideoIndex ? "#1668dc" : "#9ca3af",
                }}
              />
              <span className="text-sm truncate" title={item.title}>
                {item.title}
              </span>
            </div>
          ))}
        </div>
      </Drawer>
    </VideoPreviewContext.Provider>
  );
};
