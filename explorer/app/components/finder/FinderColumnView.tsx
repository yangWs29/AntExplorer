"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  FolderOutlined,
  FileOutlined,
  PlayCircleOutlined,
  FileZipOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { Spin, Empty } from "antd";
import { useFinderScope } from "@/app/hooks/use-finder-scope";
import { type FileItem } from "@/app/store/finder-store";
import { readDirectory } from "@/app/actions/file-actions";
import {
  isImageFile,
  useGlobalImagePreview,
} from "@/app/hooks/global-image-preview-context";
import { isVideoFile } from "@/app/hooks/use-video-preview";
import { useVideoPreview } from "@/app/hooks/video-preview-context";
import type { VideoListItem } from "@/app/hooks/video-preview-context";
import { isArchiveFile, toFileUrl } from "@/app/utils/file-utils";
import FinderContextMenu from "./FinderContextMenu";

interface FinderColumnViewProps {
  modalId: string;
  onOpenItem: (item: {
    path: string;
    name: string;
    isDirectory: boolean;
  }) => void;
}

const DEFAULT_COLUMN_WIDTH = 220;
const MIN_COLUMN_WIDTH = 120;
const MAX_COLUMN_WIDTH = 500;

const FinderColumnView = ({ modalId, onOpenItem }: FinderColumnViewProps) => {
  const {
    columnPaths,
    columnSelections,
    setColumnPath,
    setColumnSelection,
    resetColumnView,
    currentPath,
  } = useFinderScope(modalId);

  const { openPreview } = useGlobalImagePreview();
  const { openVideoPreview } = useVideoPreview();

  // 每栏宽度（按索引）
  const [columnWidths, setColumnWidths] = useState<Record<number, number>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  // 当 currentPath 变化时（通过面包屑/后退等导航），重置分栏
  useEffect(() => {
    resetColumnView();
    setColumnWidths({});
  }, [currentPath, resetColumnView]);

  // 当分栏数量变化时，清理多余的宽度记录
  useEffect(() => {
    setColumnWidths((prev) => {
      const next: Record<number, number> = {};
      for (let i = 0; i < columnPaths.length; i++) {
        if (prev[i] !== undefined) next[i] = prev[i];
      }
      return next;
    });
  }, [columnPaths.length]);

  // 拖拽调整栏宽
  const handleResizeStart = useCallback(
    (e: React.MouseEvent, level: number) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startWidth = columnWidths[level] ?? DEFAULT_COLUMN_WIDTH;

      const handleMouseMove = (ev: MouseEvent) => {
        const delta = ev.clientX - startX;
        const newWidth = Math.min(
          MAX_COLUMN_WIDTH,
          Math.max(MIN_COLUMN_WIDTH, startWidth + delta),
        );
        setColumnWidths((prev) => ({ ...prev, [level]: newWidth }));
      };

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [columnWidths],
  );

  const getWidth = (level: number) =>
    columnWidths[level] ?? DEFAULT_COLUMN_WIDTH;

  return (
    <div
      ref={containerRef}
      className="flex-1 min-h-0 self-stretch flex overflow-x-auto overflow-y-hidden"
    >
      {columnPaths.map((path, level) => {
        const isLast = level === columnPaths.length - 1;
        return (
          <div
            key={`${path}-${level}`}
            className="flex relative"
            style={
              isLast
                ? { flex: "1 1 0", minWidth: MIN_COLUMN_WIDTH }
                : { flexShrink: 0, width: getWidth(level) }
            }
          >
            <ColumnPanel
              modalId={modalId}
              path={path}
              level={level}
              width={isLast ? undefined : getWidth(level)}
              selectedPath={columnSelections[level]}
              onSelect={(item) => {
                setColumnSelection(level, item.path);
                if (item.isDirectory) {
                  setColumnPath(level, item.path);
                }
              }}
              onOpenItem={onOpenItem}
              openPreview={openPreview}
              openVideoPreview={openVideoPreview}
            />
            {/* 拖拽分隔条（非最后一栏） */}
            {!isLast && (
              <div
                className="absolute right-0 top-0 bottom-0 w-[3px] cursor-col-resize hover:bg-blue-500/50 active:bg-blue-500/70 transition-colors z-10"
                style={{ backgroundColor: "rgb(55 65 81 / 0.5)" }}
                onMouseDown={(e) => handleResizeStart(e, level)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

interface ColumnPanelProps {
  modalId: string;
  path: string;
  level: number;
  width?: number;
  selectedPath?: string;
  onSelect: (item: FileItem) => void;
  onOpenItem: (item: {
    path: string;
    name: string;
    isDirectory: boolean;
  }) => void;
  openPreview: (items: string[], current: number) => void;
  openVideoPreview: (url: string, name: string, list?: VideoListItem[]) => void;
}

const ColumnPanel = ({
  modalId,
  path,
  width,
  selectedPath,
  onSelect,
  onOpenItem,
  openPreview,
  openVideoPreview,
}: ColumnPanelProps) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    readDirectory(path)
      .then((result) => {
        if (!cancelled) {
          setFiles(result);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load column files:", err);
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  const handleItemClick = useCallback(
    (item: FileItem, e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect(item);
    },
    [onSelect],
  );

  const handleItemDoubleClick = useCallback(
    (item: FileItem, e: React.MouseEvent) => {
      e.stopPropagation();
      if (item.isDirectory) return;
      // 使用当前栏的文件列表，确保画廊包含同目录下的所有同类文件
      if (isImageFile(item.name)) {
        const imageFiles = files.filter((f) => isImageFile(f.name));
        const items = imageFiles.map((img) => toFileUrl(img.path));
        const index = imageFiles.findIndex((img) => img.path === item.path);
        if (index >= 0) {
          openPreview(items, index);
        }
      } else if (isVideoFile(item.name)) {
        const videoFiles = files.filter((f) => isVideoFile(f.name));
        const videoList: VideoListItem[] = videoFiles.map((f) => ({
          url: toFileUrl(f.path),
          title: f.name,
        }));
        const videoUrl = toFileUrl(item.path);
        openVideoPreview(videoUrl, item.name, videoList);
      } else {
        onOpenItem(item);
      }
    },
    [files, onOpenItem, openPreview, openVideoPreview],
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent, itemPath: string) => {
      e.dataTransfer.setData(
        "application/x-finder-paths",
        JSON.stringify([itemPath]),
      );
      e.dataTransfer.effectAllowed = "move";
    },
    [],
  );

  const getFileIcon = (item: FileItem) => {
    if (item.isDirectory) return <FolderOutlined className="text-blue-400" />;
    if (isVideoFile(item.name))
      return <PlayCircleOutlined className="text-red-400" />;
    if (isArchiveFile(item.name))
      return <FileZipOutlined className="text-orange-400" />;
    return <FileOutlined className="text-gray-400" />;
  };

  const folderName = path.split("/").pop() || path;

  return (
    <div
      ref={scrollRef}
      className="border-r border-gray-700/50 flex flex-col overflow-hidden self-stretch"
      style={{ width: width ?? "100%", minWidth: MIN_COLUMN_WIDTH }}
    >
      {/* 栏标题 */}
      <div className="px-3 py-2 border-b border-gray-700 text-xs text-gray-400 font-medium truncate">
        {folderName}
      </div>

      {/* 文件列表 */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <Spin size="small" />
          </div>
        ) : files.length === 0 ? (
          <div className="flex justify-center items-center h-32">
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="空" />
          </div>
        ) : (
          files.map((item) => {
            const isSelected = selectedPath === item.path;
            return (
              <FinderContextMenu
                key={item.path}
                modalId={modalId}
                filePath={item.path}
                fileName={item.name}
                isDirectory={item.isDirectory}
              >
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-colors text-sm ${
                    isSelected
                      ? "bg-blue-600/30 text-blue-300"
                      : "hover:bg-gray-700/50 text-gray-300"
                  }`}
                  onClick={(e) => handleItemClick(item, e)}
                  onDoubleClick={(e) => handleItemDoubleClick(item, e)}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item.path)}
                >
                  {getFileIcon(item)}
                  <span className="flex-1 truncate">{item.name}</span>
                  {item.isDirectory && (
                    <RightOutlined className="text-gray-500 text-xs" />
                  )}
                </div>
              </FinderContextMenu>
            );
          })
        )}
      </div>
    </div>
  );
};

export default FinderColumnView;
