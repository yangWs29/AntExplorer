"use client";

import {
  FolderOutlined,
  FileOutlined,
  PlayCircleOutlined,
  FileZipOutlined,
} from "@ant-design/icons";
import { Divider } from "antd";
import { useModalStore } from "@/app/store/explorer-modal-store";
import { isImageFile } from "@/app/hooks/global-image-preview-context";
import { isVideoFile } from "@/app/hooks/use-video-preview";
import { useFileItemClick } from "@/app/hooks/use-file-item-click";
import { useFileItemDrag } from "@/app/hooks/use-file-item-drag";
import { isArchiveFile, toFileUrl } from "@/app/utils/file-utils";
import NextImage from "next/image";
import { FileContextMenu } from "./FileContextMenu";

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

  const modal = getModalById(modalId);
  const fileList = modal?.fileList || [];

  const { handleItemClick } = useFileItemClick({ modalId, fileList });
  const { handleItemDragStart, isSelected } = useFileItemDrag({
    draggingFiles,
    onDragStart,
  });

  return (
    <div>
      {fileList.map((item, index) => {
        const isImage = isImageFile(item.name);
        const isVideo = isVideoFile(item.name);
        const isArchive = isArchiveFile(item.name);
        const imageUrl = isImage
          ? toFileUrl(item.path)
          : null;

        return (
          <div key={item.path}>
            <FileContextMenu
              modalId={modalId}
              filePath={item.path}
              fileName={item.name}
              isDirectory={item.isDirectory}
            >
              <div
                className={`cursor-pointer px-4 py-3 hover:bg-blue-100 flex items-center gap-3 w-full ${
                  isSelected(item.path) ? "opacity-50" : ""
                }`}
                onClick={() => handleItemClick(item)}
                draggable
                onDragStart={(e) => handleItemDragStart(e, item.path)}
                onDragEnd={onDragEnd}
              >
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
                ) : isVideo ? (
                  <PlayCircleOutlined className="text-red-500 text-lg" />
                ) : isArchive ? (
                  <FileZipOutlined className="text-orange-500 text-lg" />
                ) : (
                  <FileOutlined className="text-gray-500 text-lg" />
                )}
                <span className="flex-1">{item.name}</span>
              </div>
            </FileContextMenu>
            {index < fileList.length - 1 && <Divider style={{ margin: "0" }} />}
          </div>
        );
      })}
    </div>
  );
};

export default ListView;
