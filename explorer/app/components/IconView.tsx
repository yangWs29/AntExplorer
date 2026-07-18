"use client";

import {
  FolderOutlined,
  FileOutlined,
  PlayCircleOutlined,
  FileZipOutlined,
} from "@ant-design/icons";
import { Tooltip } from "antd";
import { useModalStore } from "@/app/store/explorer-modal-store";
import { isImageFile } from "@/app/hooks/global-image-preview-context";
import { isVideoFile } from "@/app/hooks/use-video-preview";
import { useFileItemClick } from "@/app/hooks/use-file-item-click";
import { useFileItemDrag } from "@/app/hooks/use-file-item-drag";
import { useVideoThumbnail } from "@/app/hooks/use-video-thumbnail";
import { isArchiveFile } from "@/app/utils/file-utils";
import NextImage from "next/image";
import { FileContextMenu } from "./FileContextMenu";

interface IconViewProps {
  modalId: string;
  draggingFiles: string[];
  onDragStart: (paths: string[]) => void;
  onDragEnd: () => void;
}

const IconView = ({
  modalId,
  draggingFiles,
  onDragStart,
  onDragEnd,
}: IconViewProps) => {
  const { getModalById } = useModalStore();

  const modal = getModalById(modalId);
  const fileList = modal?.fileList || [];
  const iconColumns = modal?.iconColumns || 4;

  const { handleItemClick } = useFileItemClick({ modalId, fileList });
  const { handleItemDragStart, isSelected } = useFileItemDrag({
    draggingFiles,
    onDragStart,
  });

  // 根据列数动态计算网格类名
  const gridColsClass = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
  }[iconColumns];

  // 格式化文件名，确保后缀名可见
  const formatFileName = (name: string, maxLength: number = 19) => {
    if (name.length <= maxLength) return name;

    const lastDotIndex = name.lastIndexOf(".");
    if (lastDotIndex === -1 || lastDotIndex === 0) {
      // 没有后缀名或以后缀名开头
      return name.substring(0, maxLength - 3) + "...";
    }

    const extension = name.substring(lastDotIndex);
    const baseName = name.substring(0, lastDotIndex);

    // 计算基础名称的最大长度（总长度 - 后缀名长度 - 省略号）
    const maxBaseLength = maxLength - extension.length - 3;

    if (baseName.length <= maxBaseLength) {
      return name;
    }

    return baseName.substring(0, maxBaseLength) + "..." + extension;
  };

  // 根据列数调整图标容器大小（保持高:宽 = 5:4，即 aspect-ratio 4/5）
  // 所有列数都使用 w-full + aspect-[4/5]，让图片撑满列宽并自动计算高度
  const iconSize = "w-full aspect-[4/5]";

  // 所有列数使用统一的字体大小
  const fontSize = 64;

  return (
    <div className={`grid ${gridColsClass} gap-4 p-4`}>
      {fileList.map((item) => {
        const isImage = isImageFile(item.name);
        const isVideo = isVideoFile(item.name);
        const isArchive = isArchiveFile(item.name);
        const imageUrl = isImage
          ? `/api/file?path=${encodeURIComponent(item.path)}`
          : null;

        // 提取视频缩略图
        const { thumbnail: videoThumbnail } = useVideoThumbnail(
          isVideo ? item.path : "",
        );

        return (
          <FileContextMenu
            key={item.path}
            modalId={modalId}
            filePath={item.path}
            fileName={item.name}
            isDirectory={item.isDirectory}
          >
            <div
              className={`flex flex-col items-center p-3 rounded-lg hover:bg-blue-100 cursor-pointer transition-colors duration-200 group h-auto overflow-hidden ${
                isSelected(item.path) ? "opacity-50" : ""
              }`}
              onClick={() => handleItemClick(item)}
              draggable
              onDragStart={(e) => handleItemDragStart(e, item.path)}
              onDragEnd={onDragEnd}
            >
              <div
                className={`mb-2 ${iconSize} flex items-center justify-center`}
              >
                {item.isDirectory ? (
                  <FolderOutlined
                    className="text-blue-500"
                    style={{ fontSize }}
                  />
                ) : isImage && imageUrl ? (
                  <div
                    className={`${iconSize} flex items-center justify-center relative`}
                  >
                    <NextImage
                      src={imageUrl}
                      alt={item.name}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px"
                      style={{ objectFit: "cover" }}
                    />
                  </div>
                ) : isVideo ? (
                  <div
                    className={`${iconSize} flex items-center justify-center relative bg-gray-100 rounded`}
                  >
                    {videoThumbnail ? (
                      <NextImage
                        src={videoThumbnail}
                        alt={item.name}
                        fill
                        style={{ objectFit: "cover" }}
                        unoptimized
                      />
                    ) : (
                      <PlayCircleOutlined
                        className="text-red-500"
                        style={{ fontSize: fontSize * 0.8 }}
                      />
                    )}
                  </div>
                ) : isArchive ? (
                  <FileZipOutlined
                    className="text-orange-500"
                    style={{ fontSize }}
                  />
                ) : (
                  <FileOutlined
                    className="text-gray-500"
                    style={{ fontSize }}
                  />
                )}
              </div>
              <Tooltip title={item.name}>
                <span className="text-xs text-gray-700 text-center break-all w-full block max-h-[2.2rem] overflow-hidden line-clamp-2">
                  {formatFileName(item.name)}
                </span>
              </Tooltip>
            </div>
          </FileContextMenu>
        );
      })}
    </div>
  );
};

export default IconView;
