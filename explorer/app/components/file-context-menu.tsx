"use client";

import React, { useState } from "react";
import { Dropdown, MenuProps, App, Modal, Descriptions, Button, Spin } from "antd";
import { CopyOutlined, DeleteOutlined, SnippetsOutlined, InfoCircleOutlined, CalculatorOutlined } from "@ant-design/icons";
import { useModalStore } from "@/app/store/explorer-modal-store";
import { copyFiles, deleteFiles, pasteFiles, getFolderSize } from "@/app/actions/file-actions";

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
  const { getModalById, setModalFileList, setModalLoading, copiedFiles, setCopiedFiles, clearCopiedFiles } = useModalStore();
  const [detailVisible, setDetailVisible] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [folderSize, setFolderSize] = useState<number | undefined>(undefined);

  const currentModal = getModalById(modalId);
  const currentPath = currentModal?.path || "";

  // 查找当前文件的详细信息
  const currentFile = currentModal?.fileList.find(f => f.path === filePath);

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
          const { readDirectory } = await import("@/app/actions/file-actions");
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
      const { readDirectory } = await import("@/app/actions/file-actions");
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
    setDetailVisible(true);
    setFolderSize(undefined); // 重置文件夹大小
  };

  // 计算文件夹大小
  const handleCalculateSize = async () => {
    if (!currentFile?.isDirectory || !filePath) return;
    
    setCalculating(true);
    try {
      const size = await getFolderSize(filePath);
      setFolderSize(size);
      message.success("计算完成");
    } catch (error) {
      message.error("计算失败");
      console.error(error);
    } finally {
      setCalculating(false);
    }
  };

  // 格式化文件大小
  const formatSize = (bytes?: number) => {
    if (bytes === undefined) return "-";
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
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

      {/* 文件详情模态框 */}
      <Modal
        title="文件详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={500}
      >
        <Descriptions column={1} bordered>
          <Descriptions.Item label="文件名">
            {currentFile?.name || fileName}
          </Descriptions.Item>
          <Descriptions.Item label="类型">
            {currentFile?.isDirectory ? "文件夹" : "文件"}
          </Descriptions.Item>
          {!currentFile?.isDirectory && (
            <Descriptions.Item label="大小">
              {formatSize(currentFile?.size)}
            </Descriptions.Item>
          )}
          {currentFile?.isDirectory && (
            <Descriptions.Item label="大小">
              <div className="flex items-center gap-2">
                {calculating ? (
                  <Spin size="small" />
                ) : (
                  <span>{folderSize !== undefined ? formatSize(folderSize) : "未计算"}</span>
                )}
                <Button
                  type="primary"
                  size="small"
                  icon={<CalculatorOutlined />}
                  onClick={handleCalculateSize}
                  loading={calculating}
                  disabled={calculating}
                >
                  统计大小
                </Button>
              </div>
            </Descriptions.Item>
          )}
          <Descriptions.Item label="修改时间">
            {currentFile?.modifiedTime 
              ? new Date(currentFile.modifiedTime).toLocaleString("zh-CN")
              : "-"}
          </Descriptions.Item>
          <Descriptions.Item label="路径">
            <span style={{ wordBreak: "break-all" }}>
              {currentFile?.path || filePath}
            </span>
          </Descriptions.Item>
        </Descriptions>
      </Modal>
    </>
  );
};
