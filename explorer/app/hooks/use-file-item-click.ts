"use client";

import { useCallback } from "react";
import { useModalStore, FileItem } from "@/app/store/explorer-modal-store";
import { useGlobalImagePreview, isImageFile } from "./global-image-preview-context";
import { isVideoFile } from "./use-video-preview";
import { useVideoPreview } from "./video-preview-context";
import { toFileUrl } from "@/app/utils/file-utils";

interface UseFileItemClickProps {
  modalId: string;
  fileList: FileItem[];
}

export const useFileItemClick = ({ modalId, fileList }: UseFileItemClickProps) => {
  const { navigateToPath } = useModalStore();
  const { openPreview } = useGlobalImagePreview();
  const { openVideoPreview } = useVideoPreview();

  const handleItemClick = useCallback(
    (item: FileItem) => {
      if (item.isDirectory) {
        navigateToPath(modalId, item.path, item.name);
      } else if (isImageFile(item.name)) {
        const imageFiles = fileList.filter((file) => isImageFile(file.name));
        const items = imageFiles.map(
          (img) => toFileUrl(img.path),
        );
        const index = imageFiles.findIndex((img) => img.path === item.path);
        if (index >= 0) {
          openPreview(items, index);
        }
      } else if (isVideoFile(item.name)) {
        // 打开视频播放器
        const videoUrl = toFileUrl(item.path);
        openVideoPreview(videoUrl, item.name);
      } else {
        console.log("File clicked:", item.name);
      }
    },
    [modalId, fileList, navigateToPath, openPreview, openVideoPreview],
  );

  return { handleItemClick };
};
