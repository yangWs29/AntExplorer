"use client";

import { useEffect, useState, useRef, memo, useCallback } from "react";
import { Spin, Empty, App, Dropdown, MenuProps } from "antd";
import { useModalStore } from "@/app/store/explorer-modal-store";
import {
  readDirectory,
  moveFiles,
  pasteFiles,
} from "@/app/actions/file-actions";
import ListView from "./ListView";
import IconView from "./IconView";
import { SnippetsOutlined } from "@ant-design/icons";

interface FileListProps {
  modalId: string;
  initialPath: string;
}

const FileList = memo(({ modalId, initialPath }: FileListProps) => {
  // 使用选择器只订阅需要的状态，避免不必要的重渲染
  const fileList = useModalStore(
    (state) => state.modals.find((m) => m.id === modalId)?.fileList || [],
  );
  const loading = useModalStore(
    (state) => state.modals.find((m) => m.id === modalId)?.loading || false,
  );
  const viewMode = useModalStore(
    (state) => state.modals.find((m) => m.id === modalId)?.viewMode || "icon",
  );
  const copiedFiles = useModalStore((state) => state.copiedFiles);

  const { setModalFileList, setModalLoading, clearCopiedFiles } =
    useModalStore();

  const [draggingFiles, setDraggingFiles] = useState<string[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const { message } = App.useApp();
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollPosRef = useRef<number>(0);

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
  const handleDragStart = useCallback((paths: string[]) => {
    setDraggingFiles(paths);
  }, []);

  // 处理拖拽结束
  const handleDragEnd = useCallback(() => {
    setDraggingFiles([]);
  }, []);

  // 处理拖拽进入
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  }, []);

  // 处理拖拽离开
  const handleDragLeave = useCallback(() => {
    setIsDraggingOver(false);
  }, []);

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

  // 空白处粘贴
  const handlePaste = async () => {
    if (copiedFiles.length === 0) {
      message.warning("没有可粘贴的文件");
      return;
    }

    try {
      setModalLoading(modalId, true);
      await pasteFiles(copiedFiles, initialPath);

      // 刷新文件列表
      const files = await readDirectory(initialPath);
      setModalFileList(modalId, files);

      message.success("粘贴成功");
      clearCopiedFiles();
    } catch (error) {
      message.error("粘贴失败");
      console.error(error);
    } finally {
      setModalLoading(modalId, false);
    }
  };

  // 空白处右键菜单项
  const emptyMenuItems: MenuProps["items"] = [
    {
      key: "paste",
      label: "粘贴",
      icon: <SnippetsOutlined />,
      disabled: copiedFiles.length === 0,
      onClick: handlePaste,
    },
  ];

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
    <Dropdown menu={{ items: emptyMenuItems }} trigger={["contextMenu"]}>
      <div>
        <div
          ref={scrollRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`h-[calc(70vh-180px)] overflow-y-auto transition-colors ${
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
      </div>
    </Dropdown>
  );
});

export default FileList;
