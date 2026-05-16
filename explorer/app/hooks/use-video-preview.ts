import { useCallback } from "react";

// 判断是否为视频文件
export const isVideoFile = (filename: string): boolean => {
  const videoExtensions = [
    ".mp4",
    ".webm",
    ".ogg",
    ".mov",
    ".avi",
    ".mkv",
    ".flv",
    ".wmv",
    ".m4v",
  ];
  const ext = filename.toLowerCase().substring(filename.lastIndexOf("."));
  return videoExtensions.includes(ext);
};

// 全局视频预览 Hook（简化版，直接使用 Modal）
export const useVideoPreview = () => {
  const openVideoPreview = useCallback(
    (videoUrl: string, title?: string) => {
      // 这里可以通过全局状态管理来打开视频预览
      // 暂时返回视频 URL，由调用方决定如何显示
      return videoUrl;
    },
    []
  );

  return { openVideoPreview };
};
