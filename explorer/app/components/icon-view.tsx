"use client";

import { FolderOutlined, FileOutlined } from "@ant-design/icons";
import { Tooltip } from "antd";
import { useModalStore } from "@/app/store/explorer-modal-store";
import {
  useGlobalImagePreview,
  isImageFile,
} from "@/app/hooks/global-image-preview-context";
import NextImage from "next/image";

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

  return (
    <div className="grid grid-cols-4 gap-4 p-4">
      {fileList.map((item) => {
        const isImage = isImageFile(item.name);
        const imageUrl = isImage
          ? `/api/file?path=${encodeURIComponent(item.path)}`
          : null;

        return (
          <div
            key={item.path}
            className={`flex flex-col items-center p-3 rounded-lg hover:bg-blue-100 cursor-pointer transition-colors duration-200 group h-28 overflow-hidden ${
              isSelected(item.path) ? "opacity-50" : ""
            }`}
            onClick={() => handleItemClick(item)}
            draggable
            onDragStart={(e) => handleItemDragStart(e, item.path)}
            onDragEnd={onDragEnd}
          >
            <div className="mb-2 w-12 h-12 flex items-center justify-center">
              {item.isDirectory ? (
                <FolderOutlined
                  className="text-blue-500"
                  style={{ fontSize: 48 }}
                />
              ) : isImage && imageUrl ? (
                <div className="w-12 h-12 flex items-center justify-center relative">
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
                  style={{ fontSize: 48 }}
                />
              )}
            </div>
            <Tooltip title={item.name}>
              <span className="text-xs text-gray-700 text-center break-all line-clamp-2 w-full block">
                {item.name}
              </span>
            </Tooltip>
          </div>
        );
      })}
    </div>
  );
};

export default IconView;
