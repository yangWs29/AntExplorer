"use client";

import { FolderOutlined, FileOutlined } from "@ant-design/icons";
import { Tooltip } from "antd";
import { useModalStore } from "@/app/store/explorer-modal-store";
import {
  useGlobalImagePreview,
  isImageFile,
} from "@/app/hooks/global-image-preview-context";
import NextImage from "next/image";
import { FileContextMenu } from "./file-context-menu";

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
  const { navigateToPath } = useModalStore();
  const { openPreview } = useGlobalImagePreview();

  const modal = getModalById(modalId);
  const fileList = modal?.fileList || [];
  const iconColumns = modal?.iconColumns || 4;

  const handleItemClick = (item: (typeof fileList)[0]) => {
    if (item.isDirectory) {
      navigateToPath(modalId, item.path, item.name);
    } else if (isImageFile(item.name)) {
      const imageFiles = fileList.filter((file) => isImageFile(file.name));
      const items = imageFiles.map(
        (img) => `/api/file?path=${encodeURIComponent(img.path)}`,
      );
      const index = imageFiles.findIndex((img) => img.path === item.path);
      if (index >= 0) {
        openPreview(items, index);
      }
    } else {
      console.log("File clicked:", item.name);
    }
  };

  const handleItemDragStart = (e: React.DragEvent, path: string) => {
    onDragStart([path]);
    e.dataTransfer.setData(
      "application/x-explorer-paths",
      JSON.stringify([path]),
    );
    e.dataTransfer.effectAllowed = "move";
  };

  const isSelected = (path: string) => draggingFiles.includes(path);

  // 根据列数动态计算网格类名和图标大小
  const gridColsClass = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
  }[iconColumns];

  // 根据列数调整图标容器大小（保持高:宽 = 5:4，即 aspect-ratio 4/5）
  // 所有列数都使用 w-full + aspect-[4/5]，让图片撑满列宽并自动计算高度
  const iconSize = "w-full aspect-[4/5]";

  // 1 列模式使用横向布局，其他模式使用纵向布局
  const isSingleColumn = iconColumns === 1;

  // 所有列数使用统一的字体大小
  const fontSize = 64;

  return (
    <div className={`grid ${gridColsClass} gap-4 p-4`}>
      {fileList.map((item) => {
        const isImage = isImageFile(item.name);
        const imageUrl = isImage
          ? `/api/file?path=${encodeURIComponent(item.path)}`
          : null;

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
                      style={{ objectFit: "cover" }}
                      unoptimized
                    />
                  </div>
                ) : (
                  <FileOutlined
                    className="text-gray-500"
                    style={{ fontSize }}
                  />
                )}
              </div>
              <Tooltip title={item.name}>
                <span className="text-xs text-gray-700 text-center break-all line-clamp-2 w-full block">
                  {item.name}
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
