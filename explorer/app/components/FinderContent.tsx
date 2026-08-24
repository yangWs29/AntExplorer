"use client";

import { useEffect, useCallback, useState } from "react";
import { App, Modal, Input, Descriptions, Spin } from "antd";
import { useFinderScope } from "@/app/hooks/use-finder-scope";
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
    detailFile,
    renamingFile,
    navigateTo,
    setFileList,
    setLoading,
    clearSelection,
    setDetailFile,
    setRenamingFile,
  } = useFinderScope(modalId);

  // 挂载时初始化该 modalId 的 finder 状态（每个窗口独立）
  useEffect(() => {
    const m = useModalStore.getState().modals.find((mod) => mod.id === modalId);
    if (!m) return;
    useFinderStore.getState().initModal(modalId, m.path);
  }, [modalId]);

  // finder currentPath 变化 → 同步 modal 的 path/title，不操作 history
  useEffect(() => {
    const m = useModalStore.getState().modals.find((mod) => mod.id === modalId);
    if (!m || m.path === currentPath) return;

    const folderName = currentPath.split("/").pop() || currentPath;
    useModalStore.setState((state) => ({
      modals: state.modals.map((mod) =>
        mod.id === modalId
          ? { ...mod, path: currentPath, title: folderName }
          : mod,
      ),
    }));
  }, [currentPath, modalId]);

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
    [fileList, navigateTo, openPreview, openVideoPreview],
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
      <FinderToolbar modalId={modalId} onNewFolder={handleNewFolder} />

      {/* 主体区域 */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* 侧边栏 */}
        <FinderSidebar modalId={modalId} />

        {/* 内容区域 */}
        <FinderContextMenu modalId={modalId}>
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
              <FinderIconView modalId={modalId} onOpenItem={handleOpenItem} />
            ) : viewMode === "list" ? (
              <FinderListView modalId={modalId} onOpenItem={handleOpenItem} />
            ) : (
              <FinderColumnView modalId={modalId} onOpenItem={handleOpenItem} />
            )}

            {/* 底部状态栏 */}
            <div className="px-3 py-1.5 border-t border-gray-700 text-xs text-gray-500 flex items-center justify-between">
              <span>
                {fileList.length} 个项目
                {selectedFiles.length > 0 &&
                  `，已选中 ${selectedFiles.length} 个`}
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
            <Descriptions.Item label="名称">
              {detailStats.name}
            </Descriptions.Item>
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
