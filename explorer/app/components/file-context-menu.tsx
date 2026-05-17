"use client";

import React from "react";
import { Dropdown, MenuProps, App } from "antd";
import {
  CopyOutlined,
  DeleteOutlined,
  SnippetsOutlined,
  InfoCircleOutlined,
  FileZipOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import { useModalStore } from "@/app/store/explorer-modal-store";
import {
  copyFiles,
  deleteFiles,
  pasteFiles,
  readDirectory,
  compressFile,
  extractArchive,
} from "@/app/actions/file-actions";
import { isArchiveFile } from "@/app/utils/file-utils";

interface FileContextMenuProps {
  modalId: string;
  filePath?: string;
  fileName?: string;
  isDirectory?: boolean;
  children: React.ReactNode;
}

export const FileContextMenu = ({
  modalId,
  filePath,
  fileName,
  isDirectory,
  children,
}: FileContextMenuProps) => {
  const { message, modal: modalConfirm } = App.useApp();
  const {
    getModalById,
    setModalFileList,
    setModalLoading,
    copiedFiles,
    setCopiedFiles,
    clearCopiedFiles,
    openFileDetailModal,
    openCompressModal,
    openExtractModal,
  } = useModalStore();

  const currentModal = getModalById(modalId);
  const currentPath = currentModal?.path || "";

  // 查找当前文件的详细信息
  const currentFile = currentModal?.fileList.find((f) => f.path === filePath);

  // 复制文件
  const handleCopy = async () => {
    if (!filePath) return;
    setCopiedFiles([filePath]);
    message.success(`已复制: ${fileName}`);
  };

  // 删除文件
  const handleDelete = () => {
    if (!filePath || !fileName) return;

    modalConfirm.confirm({
      title: "确认删除",
      content: `确定要删除 "${fileName}" 吗？`,
      okText: "删除",
      okType: "danger",
      cancelText: "取消",
      onOk: async () => {
        try {
          setModalLoading(modalId, true);
          await deleteFiles([filePath]);

          // 刷新文件列表
          const files = await readDirectory(currentPath);
          setModalFileList(modalId, files);

          message.success("删除成功");
        } catch (error) {
          message.error("删除失败");
          console.error(error);
        } finally {
          setModalLoading(modalId, false);
        }
      },
    });
  };

  // 粘贴文件
  const handlePaste = async () => {
    if (copiedFiles.length === 0) {
      message.warning("没有可粘贴的文件");
      return;
    }

    try {
      setModalLoading(modalId, true);
      await pasteFiles(copiedFiles, currentPath);

      // 刷新文件列表
      const files = await readDirectory(currentPath);
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

  // 显示详情
  const handleShowDetails = () => {
    if (!currentFile) return;

    openFileDetailModal({
      name: currentFile.name,
      path: currentFile.path,
      isDirectory: currentFile.isDirectory,
      size: currentFile.size,
      modifiedTime: currentFile.modifiedTime,
    });
  };

  // 压缩文件
  const handleCompress = () => {
    if (!filePath || !fileName) return;

    openCompressModal({
      sourcePath: filePath,
      sourceName: fileName,
    });
  };

  // 解压缩文件
  const handleExtract = () => {
    if (!filePath || !fileName) return;

    openExtractModal({
      archivePath: filePath,
      archiveName: fileName,
    });
  };

  // 文件右键菜单
  const fileItems: MenuProps["items"] = [
    {
      key: "copy",
      label: "复制",
      icon: <CopyOutlined />,
      onClick: handleCopy,
    },
    {
      key: "details",
      label: "显示详情",
      icon: <InfoCircleOutlined />,
      onClick: handleShowDetails,
    },
    {
      type: "divider",
    },
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
    {
      type: "divider",
    },
    {
      key: "delete",
      label: "删除",
      icon: <DeleteOutlined />,
      danger: true,
      onClick: handleDelete,
    },
  ];

  // 空白处右键菜单
  const emptyItems: MenuProps["items"] = [
    {
      key: "paste",
      label: "粘贴",
      icon: <SnippetsOutlined />,
      disabled: copiedFiles.length === 0,
      onClick: handlePaste,
    },
  ];

  const menuItems = filePath ? fileItems : emptyItems;

  return (
    <>
      <div
        onContextMenu={(e) => {
          e.stopPropagation();
        }}
      >
        <Dropdown menu={{ items: menuItems }} trigger={["contextMenu"]}>
          <div style={{ display: "contents" }}>{children}</div>
        </Dropdown>
      </div>
    </>
  );
};
