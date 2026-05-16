"use client";

import { FolderOutlined, FileOutlined } from "@ant-design/icons";
import { List } from "antd";
import { useModalStore } from "@/app/store/explorer-modal-store";
import {
  useGlobalImagePreview,
  isImageFile,
} from "@/app/hooks/global-image-preview-context";
import NextImage from "next/image";
import { FileContextMenu } from "./file-context-menu";

interface ListViewProps {
  modalId: string;
  draggingFiles: string[];
  onDragStart: (paths: string[]) => void;
  onDragEnd: () => void;
}

const ListView = ({
  modalId,
  draggingFiles,
  onDragStart,
  onDragEnd,
}: ListViewProps) => {
  const { getModalById } = useModalStore();
  const { navigateToPath } = useModalStore();
  const { openPreview } = useGlobalImagePreview();

  const modal = getModalById(modalId);
  const fileList = modal?.fileList || [];

  const handleItemClick = (item: (typeof fileList)[0]) => {
    if (item.isDirectory) {
      navigateToPath(modalId, item.path, item.name);
    } else {
      if (isImageFile(item.name)) {
        const imageFiles = fileList.filter((file) => isImageFile(file.name));
        const items = imageFiles.map((img) => ({
          src: `/api/file?path=${encodeURIComponent(img.path)}`,
          alt: img.name,
        }));
        const index = imageFiles.findIndex((img) => img.path === item.path);
        if (index >= 0) {
          openPreview(
            items.map((item) => item.src),
            index,
          );
        }
      } else {
        console.log("File clicked:", item.name);
      }
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
    <List
      dataSource={fileList}
      renderItem={(item) => {
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
            <List.Item
              className={`cursor-pointer px-4 hover:bg-blue-100 ${
                isSelected(item.path) ? "opacity-50" : ""
              }`}
              onClick={() => handleItemClick(item)}
              draggable
              onDragStart={(e) => handleItemDragStart(e, item.path)}
              onDragEnd={onDragEnd}
            >
              <div className="flex items-center gap-3 w-full">
                {item.isDirectory ? (
                  <FolderOutlined className="text-blue-500 text-lg" />
                ) : isImage && imageUrl ? (
                  <div className="w-6 h-6 flex items-center justify-center relative">
                    <NextImage
                      src={imageUrl}
                      alt={item.name}
                      fill
                      style={{ objectFit: "cover" }}
                      unoptimized
                    />
                  </div>
                ) : (
                  <FileOutlined className="text-gray-500 text-lg" />
                )}
                <span className="flex-1">{item.name}</span>
              </div>
            </List.Item>
          </FileContextMenu>
        );
      }}
    />
  );
};

export default ListView;
