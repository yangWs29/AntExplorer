"use client";

import React, { useState } from "react";
import {
  Dropdown,
  MenuProps,
  App,
  Modal,
  Descriptions,
  Button,
  Spin,
  Tag,
  List,
} from "antd";
import {
  CopyOutlined,
  DeleteOutlined,
  SnippetsOutlined,
  InfoCircleOutlined,
  CalculatorOutlined,
  LinkOutlined,
} from "@ant-design/icons";
import { useModalStore } from "@/app/store/explorer-modal-store";
import {
  copyFiles,
  deleteFiles,
  pasteFiles,
  getFolderSize,
  getFileHardLinks,
  findHardLinks,
} from "@/app/actions/file-actions";
import { unlink } from "fs/promises";

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
  } = useModalStore();
  const [detailVisible, setDetailVisible] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [folderSize, setFolderSize] = useState<number | undefined>(undefined);
  const [hardLinkInfo, setHardLinkInfo] = useState<{
    linkCount: number;
    inode: number;
  } | null>(null);
  const [hardLinks, setHardLinks] = useState<string[]>([]);
  const [loadingHardLinks, setLoadingHardLinks] = useState(false);

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
    setHardLinkInfo(null); // 重置硬链接信息
    setHardLinks([]); // 重置硬链接列表
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

  // 获取硬链接信息
  const handleGetHardLinks = async () => {
    if (!filePath || currentFile?.isDirectory) return;

    setLoadingHardLinks(true);
    try {
      const info = await getFileHardLinks(filePath);
      setHardLinkInfo(info);

      // 如果有多个硬链接，查找所有路径
      if (info.linkCount > 1) {
        const links = await findHardLinks(filePath);
        setHardLinks(links);
      }

      message.success("获取成功");
    } catch (error) {
      message.error("获取失败");
      console.error(error);
    } finally {
      setLoadingHardLinks(false);
    }
  };

  // 删除硬链接
  const handleDeleteHardLink = (linkPath: string) => {
    modalConfirm.confirm({
      title: "确认删除硬链接",
      content: `确定要删除硬链接 "${linkPath}" 吗？\n注意：这只会删除该硬链接，不会影响其他硬链接和原始文件。`,
      okText: "删除",
      okType: "danger",
      cancelText: "取消",
      onOk: async () => {
        try {
          setModalLoading(modalId, true);
          await deleteFiles([linkPath]);

          // 重新获取硬链接信息
          const info = await getFileHardLinks(filePath!);
          setHardLinkInfo(info);

          // 如果还有多个硬链接，重新查找
          if (info.linkCount > 1) {
            const links = await findHardLinks(filePath!);
            setHardLinks(links);
          } else {
            setHardLinks([]);
          }

          // 刷新当前目录文件列表
          const { readDirectory } = await import("@/app/actions/file-actions");
          const files = await readDirectory(currentPath);
          setModalFileList(modalId, files);

          message.success("硬链接删除成功");
        } catch (error) {
          message.error("删除失败");
          console.error(error);
        } finally {
          setModalLoading(modalId, false);
        }
      },
    });
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
            <>
              <Descriptions.Item label="大小">
                {formatSize(currentFile?.size)}
              </Descriptions.Item>
              <Descriptions.Item label="硬链接">
                <div className="flex items-center gap-2">
                  {loadingHardLinks ? (
                    <Spin size="small" />
                  ) : hardLinkInfo ? (
                    <Tag color="blue">{hardLinkInfo.linkCount} 个链接</Tag>
                  ) : (
                    <span>未检查</span>
                  )}
                  <Button
                    type="primary"
                    size="small"
                    icon={<LinkOutlined />}
                    onClick={handleGetHardLinks}
                    loading={loadingHardLinks}
                    disabled={loadingHardLinks}
                  >
                    检查硬链接
                  </Button>
                </div>
              </Descriptions.Item>
              {hardLinks.length > 1 && (
                <Descriptions.Item label="硬链接路径">
                  <List
                    size="small"
                    dataSource={hardLinks}
                    renderItem={(link) => (
                      <List.Item
                        actions={[
                          <Button
                            key="delete"
                            type="text"
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            onClick={() => handleDeleteHardLink(link)}
                          >
                            删除
                          </Button>,
                        ]}
                      >
                        <span
                          style={{ wordBreak: "break-all", fontSize: "12px" }}
                        >
                          {link}
                        </span>
                      </List.Item>
                    )}
                  />
                </Descriptions.Item>
              )}
            </>
          )}
          {currentFile?.isDirectory && (
            <Descriptions.Item label="大小">
              <div className="flex items-center gap-2">
                {calculating ? (
                  <Spin size="small" />
                ) : (
                  <span>
                    {folderSize !== undefined
                      ? formatSize(folderSize)
                      : "未计算"}
                  </span>
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
