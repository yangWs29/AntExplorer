"use client";

import { useEffect, useCallback, useState } from "react";
import { App, Modal, Input, Descriptions, Spin } from "antd";
import { useFinderStore } from "@/app/store/finder-store";
import {
  readDirectory,
  moveFiles,
  renameFileAction,
  createDirectoryAction,
} from "@/app/actions/file-actions";
import { isImageFile } from "@/app/hooks/global-image-preview-context";
import { isVideoFile } from "@/app/hooks/use-video-preview";
import { useGlobalImagePreview } from "@/app/hooks/global-image-preview-context";
import { useVideoPreview } from "@/app/hooks/video-preview-context";
import { toFileUrl } from "@/app/utils/file-utils";
import { useModalStore } from "@/app/store/explorer-modal-store";
import FinderToolbar from "@/app/components/finder/FinderToolbar";
import FinderSidebar from "@/app/components/finder/FinderSidebar";
import FinderIconView from "@/app/components/finder/FinderIconView";
import FinderListView from "@/app/components/finder/FinderListView";
import FinderColumnView from "@/app/components/finder/FinderColumnView";
import FinderContextMenu from "@/app/components/finder/FinderContextMenu";

interface FinderContentProps {
  modalId: string;
}

const FinderContent = ({ modalId }: FinderContentProps) => {
  const { message } = App.useApp();
  const { openPreview } = useGlobalImagePreview();
  const { openVideoPreview } = useVideoPreview();

  const {
    currentPath,
    fileList,
    loading,
    viewMode,
    selectedFiles,
    clipboardFiles,
    clipboardMode,
    detailFile,
    renamingFile,
    navigateTo,
    setFileList,
    setLoading,
    clearSelection,
    selectAll,
    copyFiles,
    cutFiles,
    clearClipboard,
    setDetailFile,
    setRenamingFile,
  } = useFinderStore();

  // 同步 modal store 的导航到 finder store
  const { getModalById, navigateToPath, goBack: modalGoBack } = useModalStore();
  const modal = getModalById(modalId);

  // 当 modal path 变化时（通过面包屑/后退导航），同步到 finder store
  useEffect(() => {
    if (modal && modal.path !== currentPath) {
      navigateTo(modal.path);
    }
  }, [modal?.path]);

  const [renameValue, setRenameValue] = useState("");
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailStats, setDetailStats] = useState<{
    name: string;
    path: string;
    isDirectory: boolean;
    size: number;
    modifiedTime: Date;
    createdTime: Date;
    permissions: string;
    linkCount: number;
  } | null>(null);

  // 加载文件列表
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    readDirectory(currentPath)
      .then((files) => {
        if (!cancelled) setFileList(files);
      })
      .catch((err) => {
        console.error("Failed to load files:", err);
        if (!cancelled) message.error("加载文件列表失败");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentPath, setFileList, setLoading, message]);

  // 监听 store 中的 detailFile 变化
  useEffect(() => {
    if (detailFile) {
      setDetailStats(detailFile);
      setDetailModalOpen(true);
    }
  }, [detailFile]);

  // 监听 store 中的 renamingFile 变化
  useEffect(() => {
    if (renamingFile) {
      setRenameValue(renamingFile.name);
      setRenameModalOpen(true);
    }
  }, [renamingFile]);

  // 打开文件/文件夹
  const handleOpenItem = useCallback(
    (item: { path: string; name: string; isDirectory: boolean }) => {
      if (item.isDirectory) {
        navigateTo(item.path, item.name);
        // 同步到 modal store
        navigateToPath(modalId, item.path, item.name);
      } else if (isImageFile(item.name)) {
        const imageFiles = fileList.filter((f) => isImageFile(f.name));
        const items = imageFiles.map((img) => toFileUrl(img.path));
        const index = imageFiles.findIndex((img) => img.path === item.path);
        if (index >= 0) {
          openPreview(items, index);
        }
      } else if (isVideoFile(item.name)) {
        const videoUrl = toFileUrl(item.path);
        openVideoPreview(videoUrl, item.name);
      } else {
        window.open(toFileUrl(item.path), "_blank");
      }
    },
    [fileList, navigateTo, navigateToPath, modalId, openPreview, openVideoPreview],
  );

  // 新建文件夹
  const handleNewFolder = useCallback(() => {
    setRenamingFile({ path: currentPath, name: "" });
    setRenameValue("新建文件夹");
    setRenameModalOpen(true);
  }, [currentPath, setRenamingFile]);

  // 确认重命名
  const handleRenameConfirm = async () => {
    if (!renamingFile || !renameValue.trim()) {
      setRenameModalOpen(false);
      setRenamingFile(null);
      return;
    }

    // 如果是新建文件夹
    if (!renamingFile.path || renamingFile.path === currentPath) {
      try {
        setLoading(true);
        await createDirectoryAction(currentPath, renameValue.trim());
        const files = await readDirectory(currentPath);
        setFileList(files);
        message.success("文件夹创建成功");
      } catch (error) {
        message.error("创建文件夹失败");
        console.error(error);
      } finally {
        setLoading(false);
      }
    } else {
      // 重命名文件
      try {
        setLoading(true);
        await renameFileAction(renamingFile.path, renameValue.trim());
        const files = await readDirectory(currentPath);
        setFileList(files);
        message.success("重命名成功");
      } catch (error) {
        message.error("重命名失败");
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    setRenameModalOpen(false);
    setRenamingFile(null);
  };

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      if (modKey && e.key === "a") {
        e.preventDefault();
        selectAll();
      } else if (modKey && e.key === "c") {
        e.preventDefault();
        if (selectedFiles.length > 0) {
          copyFiles(selectedFiles);
          message.success(`已复制 ${selectedFiles.length} 个项目`);
        }
      } else if (modKey && e.key === "x") {
        e.preventDefault();
        if (selectedFiles.length > 0) {
          cutFiles(selectedFiles);
          message.success(`已剪切 ${selectedFiles.length} 个项目`);
        }
      } else if (modKey && e.key === "v") {
        e.preventDefault();
        handlePasteFromKeyboard();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedFiles.length > 0) {
          e.preventDefault();
          handleDeleteSelected();
        } else if (!modKey) {
          e.preventDefault();
          const parent = currentPath.substring(0, currentPath.lastIndexOf("/"));
          if (parent) {
            const upPath = parent || "/";
            navigateTo(upPath);
            navigateToPath(modalId, upPath);
          }
        }
      } else if (e.key === "F2") {
        e.preventDefault();
        if (selectedFiles.length === 1) {
          const file = fileList.find((f) => f.path === selectedFiles[0]);
          if (file) {
            setRenamingFile({ path: file.path, name: file.name });
          }
        }
      } else if (e.key === "Enter") {
        if (selectedFiles.length === 1) {
          const file = fileList.find((f) => f.path === selectedFiles[0]);
          if (file) {
            handleOpenItem(file);
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedFiles,
    fileList,
    currentPath,
    selectAll,
    copyFiles,
    cutFiles,
    clearClipboard,
    navigateTo,
    navigateToPath,
    modalId,
    setRenamingFile,
    message,
  ]);

  const handlePasteFromKeyboard = async () => {
    if (clipboardFiles.length === 0) {
      message.warning("没有可粘贴的文件");
      return;
    }
    try {
      setLoading(true);
      if (clipboardMode === "move") {
        await moveFiles(clipboardFiles, currentPath);
      } else {
        const { pasteFiles } = await import("@/app/actions/file-actions");
        await pasteFiles(clipboardFiles, currentPath);
      }
      const files = await readDirectory(currentPath);
      setFileList(files);
      message.success("粘贴成功");
      clearClipboard();
    } catch (error) {
      message.error("粘贴失败");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedFiles.length === 0) return;
    Modal.confirm({
      title: "确认删除",
      content: `确定要删除选中的 ${selectedFiles.length} 个项目吗？`,
      okText: "删除",
      okType: "danger",
      cancelText: "取消",
      onOk: async () => {
        try {
          setLoading(true);
          const { deleteFiles } = await import("@/app/actions/file-actions");
          await deleteFiles(selectedFiles);
          const files = await readDirectory(currentPath);
          setFileList(files);
          message.success("删除成功");
        } catch (error) {
          message.error("删除失败");
          console.error(error);
        } finally {
          setLoading(false);
        }
      },
    });
  };

  // 处理拖拽到内容区域
  const handleContentDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const data = e.dataTransfer.getData("application/x-finder-paths");
    if (!data) return;

    try {
      const paths: string[] = JSON.parse(data);
      const filesToMove = paths.filter((p) => {
        const sourceDir = p.substring(0, p.lastIndexOf("/"));
        return sourceDir !== currentPath;
      });

      if (filesToMove.length === 0) {
        message.info("文件已在当前位置");
        return;
      }

      setLoading(true);
      await moveFiles(filesToMove, currentPath);
      const files = await readDirectory(currentPath);
      setFileList(files);
      message.success(`已移动 ${filesToMove.length} 个项目`);
    } catch (error) {
      message.error("移动文件失败");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleContentDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return "-";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* 工具栏 */}
      <FinderToolbar onNewFolder={handleNewFolder} />

      {/* 主体区域 */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* 侧边栏 */}
        <FinderSidebar />

        {/* 内容区域 */}
        <FinderContextMenu>
          <div
            className="flex-1 flex flex-col min-h-0 overflow-hidden"
            onDrop={handleContentDrop}
            onDragOver={handleContentDragOver}
            onClick={clearSelection}
          >
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <Spin size="large" />
              </div>
            ) : viewMode === "icon" ? (
              <FinderIconView onOpenItem={handleOpenItem} />
            ) : viewMode === "list" ? (
              <FinderListView onOpenItem={handleOpenItem} />
            ) : (
              <FinderColumnView onOpenItem={handleOpenItem} />
            )}

            {/* 底部状态栏 */}
            <div className="px-3 py-1.5 border-t border-gray-700 text-xs text-gray-500 flex items-center justify-between">
              <span>
                {fileList.length} 个项目
                {selectedFiles.length > 0 && `，已选中 ${selectedFiles.length} 个`}
              </span>
              <span>{currentPath}</span>
            </div>
          </div>
        </FinderContextMenu>
      </div>

      {/* 详情弹窗 */}
      <Modal
        title="文件详情"
        open={detailModalOpen}
        onCancel={() => {
          setDetailModalOpen(false);
          setDetailFile(null);
        }}
        footer={null}
        width={500}
        styles={{
          body: { padding: "16px" },
        }}
      >
        {detailStats ? (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="名称">{detailStats.name}</Descriptions.Item>
            <Descriptions.Item label="类型">
              {detailStats.isDirectory ? "文件夹" : "文件"}
            </Descriptions.Item>
            {!detailStats.isDirectory && (
              <Descriptions.Item label="大小">
                {formatSize(detailStats.size)}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="权限">
              {detailStats.permissions}
            </Descriptions.Item>
            <Descriptions.Item label="硬链接数">
              {detailStats.linkCount}
            </Descriptions.Item>
            <Descriptions.Item label="修改时间">
              {new Date(detailStats.modifiedTime).toLocaleString("zh-CN")}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {new Date(detailStats.createdTime).toLocaleString("zh-CN")}
            </Descriptions.Item>
            <Descriptions.Item label="路径">
              <span style={{ wordBreak: "break-all" }}>{detailStats.path}</span>
            </Descriptions.Item>
          </Descriptions>
        ) : (
          <div className="flex justify-center py-8">
            <Spin />
          </div>
        )}
      </Modal>

      {/* 重命名/新建文件夹弹窗 */}
      <Modal
        title={
          renamingFile?.path === currentPath && !renamingFile?.name
            ? "新建文件夹"
            : "重命名"
        }
        open={renameModalOpen}
        onOk={handleRenameConfirm}
        onCancel={() => {
          setRenameModalOpen(false);
          setRenamingFile(null);
        }}
        okText="确定"
        cancelText="取消"
      >
        <Input
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          placeholder="请输入名称"
          onPressEnter={handleRenameConfirm}
          autoFocus
        />
      </Modal>
    </div>
  );
};

export default FinderContent;
