"use client";

import React from "react";
import { Dropdown, App } from "antd";
import type { MenuProps } from "antd";
import {
  CopyOutlined,
  ScissorOutlined,
  DeleteOutlined,
  SnippetsOutlined,
  InfoCircleOutlined,
  FileZipOutlined,
  UnorderedListOutlined,
  BarChartOutlined,
  EditOutlined,
  FolderAddOutlined,
} from "@ant-design/icons";
import { useFinderStore } from "@/app/store/finder-store";
import {
  deleteFiles,
  pasteFiles,
  readDirectory,
  compressFile,
  extractArchive,
  getFileStatsAction,
  createDirectoryAction,
} from "@/app/actions/file-actions";
import { isArchiveFile, isVideoFile } from "@/app/utils/file-utils";

interface FinderContextMenuProps {
  filePath?: string;
  fileName?: string;
  isDirectory?: boolean;
  children: React.ReactNode;
}

const FinderContextMenu = ({
  filePath,
  fileName,
  isDirectory,
  children,
}: FinderContextMenuProps) => {
  const { message, modal: modalConfirm } = App.useApp();
  const {
    currentPath,
    fileList,
    selectedFiles,
    clipboardFiles,
    clipboardMode,
    copyFiles,
    cutFiles,
    clearClipboard,
    setFileList,
    setLoading,
    setDetailFile,
    setRenamingFile,
    navigateTo,
  } = useFinderStore();

  const currentFile = fileList.find((f) => f.path === filePath);

  // 复制
  const handleCopy = () => {
    if (!filePath) return;
    copyFiles([filePath]);
    message.success(`已复制: ${fileName}`);
  };

  // 剪切
  const handleCut = () => {
    if (!filePath) return;
    cutFiles([filePath]);
    message.success(`已剪切: ${fileName}`);
  };

  // 删除
  const handleDelete = () => {
    const paths = filePath ? [filePath] : selectedFiles;
    if (paths.length === 0) return;

    const names = paths.map((p) => p.split("/").pop()).join(", ");
    modalConfirm.confirm({
      title: "确认删除",
      content: `确定要删除 "${names}" 吗？此操作不可撤销。`,
      okText: "删除",
      okType: "danger",
      cancelText: "取消",
      onOk: async () => {
        try {
          setLoading(true);
          await deleteFiles(paths);
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

  // 粘贴
  const handlePaste = async () => {
    if (clipboardFiles.length === 0) {
      message.warning("没有可粘贴的文件");
      return;
    }

    try {
      setLoading(true);
      if (clipboardMode === "move") {
        const { moveFiles } = await import("@/app/actions/file-actions");
        await moveFiles(clipboardFiles, currentPath);
      } else {
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

  // 重命名
  const handleRename = () => {
    if (!filePath || !fileName) return;
    setRenamingFile({ path: filePath, name: fileName });
  };

  // 显示详情
  const handleShowDetails = async () => {
    const targetPath = filePath || currentPath;
    try {
      const stats = await getFileStatsAction(targetPath);
      setDetailFile(stats);
    } catch (error) {
      message.error("获取文件详情失败");
      console.error(error);
    }
  };

  // 压缩
  const handleCompress = async () => {
    if (!filePath || !fileName) return;
    try {
      setLoading(true);
      await compressFile(filePath);
      const files = await readDirectory(currentPath);
      setFileList(files);
      message.success("压缩成功");
    } catch (error) {
      message.error("压缩失败");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 解压缩
  const handleExtract = async () => {
    if (!filePath || !fileName) return;
    try {
      setLoading(true);
      await extractArchive(filePath);
      const files = await readDirectory(currentPath);
      setFileList(files);
      message.success("解压成功");
    } catch (error) {
      message.error("解压失败");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 新建文件夹
  const handleNewFolder = async () => {
    const name = "新建文件夹";
    try {
      setLoading(true);
      await createDirectoryAction(currentPath, name);
      const files = await readDirectory(currentPath);
      setFileList(files);
      message.success("文件夹创建成功");
    } catch (error) {
      message.error("创建文件夹失败");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 构建文件右键菜单
  const fileMenuItems: MenuProps["items"] = [
    {
      key: "copy",
      label: "复制",
      icon: <CopyOutlined />,
      onClick: handleCopy,
    },
    {
      key: "cut",
      label: "剪切",
      icon: <ScissorOutlined />,
      onClick: handleCut,
    },
    {
      key: "rename",
      label: "重命名",
      icon: <EditOutlined />,
      onClick: handleRename,
    },
    { type: "divider" },
    {
      key: "details",
      label: "显示详情",
      icon: <InfoCircleOutlined />,
      onClick: handleShowDetails,
    },
    ...(fileName && isVideoFile(fileName)
      ? [
          {
            key: "analyze",
            label: "识别",
            icon: <BarChartOutlined />,
            onClick: () => {
              // 视频识别功能 - 可以通过 store 触发
              message.info("视频识别功能");
            },
          },
        ]
      : []),
    { type: "divider" },
    ...(fileName && isArchiveFile(fileName)
      ? [
          {
            key: "extract",
            label: "解压缩",
            icon: <UnorderedListOutlined />,
            onClick: handleExtract,
          },
        ]
      : [
          {
            key: "compress",
            label: "压缩",
            icon: <FileZipOutlined />,
            onClick: handleCompress,
          },
        ]),
    { type: "divider" },
    {
      key: "delete",
      label: "删除",
      icon: <DeleteOutlined />,
      danger: true,
      onClick: handleDelete,
    },
  ];

  // 空白处右键菜单
  const emptyMenuItems: MenuProps["items"] = [
    {
      key: "paste",
      label: "粘贴",
      icon: <SnippetsOutlined />,
      disabled: clipboardFiles.length === 0,
      onClick: handlePaste,
    },
    {
      key: "new-folder",
      label: "新建文件夹",
      icon: <FolderAddOutlined />,
      onClick: handleNewFolder,
    },
    { type: "divider" },
    {
      key: "details",
      label: "显示详情",
      icon: <InfoCircleOutlined />,
      onClick: handleShowDetails,
    },
  ];

  const menuItems = filePath ? fileMenuItems : emptyMenuItems;

  return (
    <Dropdown menu={{ items: menuItems }} trigger={["contextMenu"]}>
      <div style={{ display: "contents" }} onContextMenu={(e) => e.stopPropagation()}>
        {children}
      </div>
    </Dropdown>
  );
};

export default FinderContextMenu;
