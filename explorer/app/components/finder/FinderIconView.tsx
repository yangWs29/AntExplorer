"use client";

import {
  FolderOutlined,
  FileOutlined,
  PlayCircleOutlined,
  FileZipOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FilePptOutlined,
  FileTextOutlined,
  SoundOutlined,
  CodeOutlined,
  Html5Outlined,
  BgColorsOutlined,
} from "@ant-design/icons";
import { Tooltip, Spin, Empty } from "antd";
import { useFinderScope } from "@/app/hooks/use-finder-scope";
import { getModalState, type FileItem } from "@/app/store/finder-store";
import { isImageFile } from "@/app/hooks/global-image-preview-context";
import { isVideoFile } from "@/app/hooks/use-video-preview";
import { useVideoThumbnail } from "@/app/hooks/use-video-thumbnail";
import { isArchiveFile, isAudioFile, toFileUrl } from "@/app/utils/file-utils";
import NextImage from "next/image";
import { useCallback, useMemo, memo, useState, useEffect, useRef } from "react";
import FinderContextMenu from "./FinderContextMenu";

interface FinderIconViewProps {
  modalId: string;
  onOpenItem: (item: {
    path: string;
    name: string;
    isDirectory: boolean;
  }) => void;
}

const iconSize = 64;

/** 根据文件后缀名返回对应的 antd 图标 + 颜色 */
function getFileIcon(fileName: string) {
  const ext = fileName.includes(".")
    ? fileName.split(".")!.pop()!.toLowerCase()
    : "";

  switch (ext) {
    // PDF
    case "pdf":
      return (
        <FilePdfOutlined
          className="text-red-400"
          style={{ fontSize: iconSize }}
        />
      );

    // Word
    case "doc":
    case "docx":
      return (
        <FileWordOutlined
          className="text-blue-500"
          style={{ fontSize: iconSize }}
        />
      );

    // Excel
    case "xls":
    case "xlsx":
      return (
        <FileExcelOutlined
          className="text-green-500"
          style={{ fontSize: iconSize }}
        />
      );

    // CSV
    case "csv":
      return (
        <FileExcelOutlined
          className="text-green-400"
          style={{ fontSize: iconSize }}
        />
      );

    // PowerPoint
    case "ppt":
    case "pptx":
      return (
        <FilePptOutlined
          className="text-orange-500"
          style={{ fontSize: iconSize }}
        />
      );

    // 代码文件
    case "js":
    case "jsx":
    case "ts":
    case "tsx":
    case "py":
    case "java":
    case "c":
    case "cpp":
    case "h":
    case "hpp":
    case "go":
    case "rs":
    case "swift":
    case "kt":
    case "scala":
    case "rb":
    case "php":
    case "sh":
    case "bash":
    case "zsh":
    case "lua":
    case "sql":
      return (
        <CodeOutlined
          className="text-cyan-400"
          style={{ fontSize: iconSize }}
        />
      );

    // HTML
    case "html":
    case "htm":
      return (
        <Html5Outlined
          className="text-orange-400"
          style={{ fontSize: iconSize }}
        />
      );

    // CSS
    case "css":
    case "scss":
    case "sass":
    case "less":
      return (
        <BgColorsOutlined
          className="text-blue-400"
          style={{ fontSize: iconSize }}
        />
      );

    // 文本 / 配置
    case "txt":
    case "md":
    case "log":
    case "json":
    case "yaml":
    case "yml":
    case "toml":
    case "xml":
    case "ini":
    case "cfg":
    case "conf":
      return (
        <FileTextOutlined
          className="text-gray-400"
          style={{ fontSize: iconSize }}
        />
      );

    default:
      return null;
  }
}

function formatFileName(name: string, maxLength: number = 20) {
  if (name.length <= maxLength) return name;
  const lastDotIndex = name.lastIndexOf(".");
  if (lastDotIndex === -1 || lastDotIndex === 0) {
    return name.substring(0, maxLength - 3) + "...";
  }
  const extension = name.substring(lastDotIndex);
  const baseName = name.substring(0, lastDotIndex);
  const maxBaseLength = maxLength - extension.length - 3;
  if (baseName.length <= maxBaseLength) return name;
  return baseName.substring(0, maxBaseLength) + "..." + extension;
}

/* ─── 单个文件项：React.memo 避免无关重渲染 ─── */

interface IconItemProps {
  modalId: string;
  item: FileItem;
  index: number;
  isSelected: boolean;
  onItemClick: (item: FileItem, index: number, e: React.MouseEvent) => void;
  onItemDoubleClick: (item: FileItem) => void;
  onDragStart: (e: React.DragEvent, path: string) => void;
}

const IconItem = memo(
  function IconItem({
    modalId,
    item,
    index,
    isSelected,
    onItemClick,
    onItemDoubleClick,
    onDragStart,
  }: IconItemProps) {
    const isImage = isImageFile(item.name);
    const isVideo = isVideoFile(item.name);
    const isArchive = isArchiveFile(item.name);
    const isAudio = isAudioFile(item.name);
    const imageUrl = isImage ? toFileUrl(item.path) : null;

    return (
      <FinderContextMenu
        modalId={modalId}
        filePath={item.path}
        fileName={item.name}
        isDirectory={item.isDirectory}
      >
        <div
          className={`flex flex-col items-center p-2 rounded-lg cursor-default content-auto [contain-intrinsic-size:auto_120px] ${
            isSelected
              ? "bg-blue-600/30 ring-1 ring-blue-500"
              : "hover:bg-gray-700/50"
          }`}
          onClick={(e) => onItemClick(item, index, e)}
          onDoubleClick={() => onItemDoubleClick(item)}
          draggable
          onDragStart={(e) => onDragStart(e, item.path)}
        >
          <div className="mb-1 w-full aspect-[4/5] flex items-center justify-center">
            {item.isDirectory ? (
              <FolderOutlined
                className="text-blue-400"
                style={{ fontSize: iconSize }}
              />
            ) : isImage && imageUrl ? (
              <div className="w-full h-full flex items-center justify-center relative">
                <NextImage
                  src={imageUrl}
                  alt={item.name}
                  fill
                  sizes="(max-width: 768px) 50vw, 100px"
                  style={{ objectFit: "cover", borderRadius: 4 }}
                />
              </div>
            ) : isVideo ? (
              <VideoThumbnailWrapper path={item.path} size={iconSize} />
            ) : isArchive ? (
              <FileZipOutlined
                className="text-orange-400"
                style={{ fontSize: iconSize }}
              />
            ) : isAudio ? (
              <SoundOutlined
                className="text-purple-400"
                style={{ fontSize: iconSize }}
              />
            ) : (
              (getFileIcon(item.name) ?? (
                <FileOutlined
                  className="text-gray-400"
                  style={{ fontSize: iconSize }}
                />
              ))
            )}
          </div>
          <Tooltip title={item.name}>
            <span className="text-xs text-gray-300 text-center break-all w-full block max-h-[2.2rem] overflow-hidden line-clamp-2">
              {formatFileName(item.name)}
            </span>
          </Tooltip>
        </div>
      </FinderContextMenu>
    );
  },
  (prev, next) =>
    prev.item === next.item &&
    prev.index === next.index &&
    prev.isSelected === next.isSelected,
);

/* ─── 主组件 ─── */

const FinderIconView = ({ modalId, onOpenItem }: FinderIconViewProps) => {
  const { fileList, loading, selectedFiles, selectFile, clearSelection } =
    useFinderScope(modalId);

  // O(1) 查找选中状态
  const selectedSet = useMemo(() => new Set(selectedFiles), [selectedFiles]);

  const handleItemClick = useCallback(
    (item: FileItem, index: number, e: React.MouseEvent) => {
      e.stopPropagation();
      const multi = e.metaKey || e.ctrlKey;
      const range = e.shiftKey;
      selectFile(item.path, index, multi, range);
    },
    [selectFile],
  );

  const handleItemDoubleClick = useCallback(
    (item: FileItem) => {
      onOpenItem(item);
    },
    [onOpenItem],
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent, path: string) => {
      const { selectedFiles: selFiles } = getModalState(modalId);
      const paths = selFiles.includes(path) ? selFiles : [path];
      e.dataTransfer.setData(
        "application/x-finder-paths",
        JSON.stringify(paths),
      );
      e.dataTransfer.effectAllowed = "move";
    },
    [modalId],
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  if (fileList.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Empty description="此目录为空" />
      </div>
    );
  }

  return (
    <div
      className="flex-1 min-h-0 overflow-y-auto p-4"
      onClick={clearSelection}
    >
      <div className="grid grid-cols-6 gap-4">
        {fileList.map((item, index) => (
          <IconItem
            key={item.path}
            modalId={modalId}
            item={item}
            index={index}
            isSelected={selectedSet.has(item.path)}
            onItemClick={handleItemClick}
            onItemDoubleClick={handleItemDoubleClick}
            onDragStart={handleDragStart}
          />
        ))}
      </div>
    </div>
  );
};

/* ─── 视频缩略图懒加载 hook：仅在接近视口时才生成 ─── */

function useLazyVideoThumbnail(path: string, isVideo: boolean) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isVideo) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isVideo]);

  return { ref, isVisible };
}

const VideoThumbnailWrapper = ({
  path,
  size,
}: {
  path: string;
  size: number;
}) => {
  const { ref, isVisible } = useLazyVideoThumbnail(path, true);
  const { thumbnail } = useVideoThumbnail(isVisible ? path : "");
  return (
    <div
      ref={ref}
      className="w-full h-full flex items-center justify-center relative bg-gray-800 rounded"
    >
      {isVisible && thumbnail ? (
        <NextImage
          src={thumbnail}
          alt=""
          fill
          style={{ objectFit: "cover", borderRadius: 4 }}
          unoptimized
        />
      ) : (
        <PlayCircleOutlined
          className="text-red-400"
          style={{ fontSize: size * 0.8 }}
        />
      )}
    </div>
  );
};

export default FinderIconView;
