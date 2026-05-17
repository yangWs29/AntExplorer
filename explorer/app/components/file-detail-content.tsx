"use client";

import React, { useState } from "react";
import { Descriptions, Button, Spin, Tag, List, App } from "antd";
import {
  CalculatorOutlined,
  LinkOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import {
  useModalStore,
  FileDetailData,
} from "@/app/store/explorer-modal-store";
import {
  getFolderSize,
  getFileHardLinks,
  findHardLinks,
  deleteFiles,
} from "@/app/actions/file-actions";

interface FileDetailContentProps {
  modalId: string;
  fileDetail: FileDetailData;
}

const FileDetailContent = ({ modalId, fileDetail }: FileDetailContentProps) => {
  const { message, modal: modalConfirm } = App.useApp();
  const { setModalLoading } = useModalStore();
  const [calculating, setCalculating] = useState(false);
  const [folderSize, setFolderSize] = useState<number | undefined>(undefined);
  const [hardLinkInfo, setHardLinkInfo] = useState<{
    linkCount: number;
    inode: number;
  } | null>(null);
  const [hardLinks, setHardLinks] = useState<string[]>([]);
  const [loadingHardLinks, setLoadingHardLinks] = useState(false);

  // 计算文件夹大小
  const handleCalculateSize = async () => {
    if (!fileDetail.isDirectory || !fileDetail.path) return;

    setCalculating(true);
    try {
      const size = await getFolderSize(fileDetail.path);
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
    if (!fileDetail.path || fileDetail.isDirectory) return;

    setLoadingHardLinks(true);
    try {
      const info = await getFileHardLinks(fileDetail.path);
      setHardLinkInfo(info);

      // 如果有多个硬链接，查找所有路径
      if (info.linkCount > 1) {
        const links = await findHardLinks(fileDetail.path);
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
          const info = await getFileHardLinks(fileDetail.path);
          setHardLinkInfo(info);

          // 如果还有多个硬链接，重新查找
          if (info.linkCount > 1) {
            const links = await findHardLinks(fileDetail.path);
            setHardLinks(links);
          } else {
            setHardLinks([]);
          }

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

  return (
    <div className="p-4">
      <Descriptions column={1} bordered>
        <Descriptions.Item label="文件名">{fileDetail.name}</Descriptions.Item>
        <Descriptions.Item label="类型">
          {fileDetail.isDirectory ? "文件夹" : "文件"}
        </Descriptions.Item>
        {!fileDetail.isDirectory && (
          <>
            <Descriptions.Item label="大小">
              {formatSize(fileDetail.size)}
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
        {fileDetail.isDirectory && (
          <Descriptions.Item label="大小">
            <div className="flex items-center gap-2">
              {calculating ? (
                <Spin size="small" />
              ) : (
                <span>
                  {folderSize !== undefined ? formatSize(folderSize) : "未计算"}
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
          {fileDetail.modifiedTime
            ? new Date(fileDetail.modifiedTime).toLocaleString("zh-CN")
            : "-"}
        </Descriptions.Item>
        <Descriptions.Item label="路径">
          <span style={{ wordBreak: "break-all" }}>{fileDetail.path}</span>
        </Descriptions.Item>
      </Descriptions>
    </div>
  );
};

export default FileDetailContent;
