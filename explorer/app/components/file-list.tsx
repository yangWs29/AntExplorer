"use client";

import { useEffect, useState, useRef } from "react";
import { Spin, Empty, App } from "antd";
import { useModalStore } from "@/app/store/explorer-modal-store";
import { readDirectory } from "@/app/actions/file-actions";
import { moveFiles } from "@/app/actions/file-operations";
import ListView from "./list-view";
import IconView from "./icon-view";

interface FileListProps {
  modalId: string;
  initialPath: string;
}

const FileList = ({ modalId, initialPath }: FileListProps) => {
  const { getModalById, setModalFileList, setModalLoading } = useModalStore();
  const [draggingFiles, setDraggingFiles] = useState<string[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const { message } = App.useApp();
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollPosRef = useRef<number>(0);

  const modal = getModalById(modalId);
  const fileList = modal?.fileList || [];
  const loading = modal?.loading || false;
  const viewMode = modal?.viewMode || "icon";

  useEffect(() => {
    const loadFiles = async () => {
      // 保存当前滚动位置
      if (scrollRef.current) {
        scrollPosRef.current = scrollRef.current.scrollTop;
      }

      setModalLoading(modalId, true);
      try {
        const files = await readDirectory(initialPath);
        setModalFileList(modalId, files);
      } catch (error) {
        console.error("Failed to load files:", error);
      } finally {
        setModalLoading(modalId, false);
      }
    };

    loadFiles();
  }, [initialPath, modalId, setModalFileList, setModalLoading]);

  // 数据加载完成后恢复滚动位置
  useEffect(() => {
    if (scrollRef.current && scrollPosRef.current > 0) {
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollPosRef.current;
        }
      });
    }
  }, [fileList]);

  // 处理拖拽开始
  const handleDragStart = (paths: string[]) => {
    setDraggingFiles(paths);
  };

  // 处理拖拽结束
  const handleDragEnd = () => {
    setDraggingFiles([]);
  };

  // 处理拖拽进入
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  // 处理拖拽离开
  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  // 处理放置
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);

    const data = e.dataTransfer.getData("application/x-explorer-paths");
    if (!data) return;

    try {
      const paths: string[] = JSON.parse(data);
      if (paths.length === 0) return;

      // 过滤掉已经在目标目录的文件
      const filesToMove = paths.filter((filePath) => {
        const sourceDir = filePath.substring(0, filePath.lastIndexOf("/"));
        return sourceDir !== initialPath;
      });

      if (filesToMove.length === 0) {
        message.info("Files are already in this location");
        return;
      }

      setModalLoading(modalId, true);
      await moveFiles(filesToMove, initialPath);

      // 重新加载目标窗口文件列表
      const files = await readDirectory(initialPath);
      setModalFileList(modalId, files);

      // 刷新源窗口的文件列表（如果源窗口仍然打开）
      const {
        modals,
        setModalFileList: setList,
        setModalLoading: setLoading,
      } = useModalStore.getState();
      const sourceDirs = new Set(
        paths.map((p) => p.substring(0, p.lastIndexOf("/"))),
      );

      for (const dir of sourceDirs) {
        const sourceModal = modals.find((m) => m.path === dir);
        if (sourceModal) {
          setLoading(sourceModal.id, true);
          const sourceFiles = await readDirectory(dir);
          setList(sourceModal.id, sourceFiles);
          setLoading(sourceModal.id, false);
        }
      }

      message.success(`Moved ${filesToMove.length} item(s)`);
    } catch (error) {
      message.error("Failed to move files");
      console.error(error);
    } finally {
      setModalLoading(modalId, false);
      setDraggingFiles([]);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  if (fileList.length === 0) {
    return (
      <div
        className={`min-h-50 flex items-center justify-center ${
          isDraggingOver
            ? "bg-blue-50 border-2 border-dashed border-blue-300"
            : ""
        }`}
      >
        {isDraggingOver ? (
          <div className="text-blue-500">Drop files here</div>
        ) : (
          <Empty description="No files or folders" className="my-8" />
        )}
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`min-h-50 max-h-[calc(70vh-180px)] overflow-y-auto transition-colors ${
        isDraggingOver ? "bg-blue-50" : ""
      }`}
    >
      {/* File List */}
      {viewMode === "list" ? (
        <ListView
          modalId={modalId}
          draggingFiles={draggingFiles}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        />
      ) : (
        <IconView
          modalId={modalId}
          draggingFiles={draggingFiles}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        />
      )}
    </div>
  );
};

export default FileList;
