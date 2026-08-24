"use client";

import {
  FolderOutlined,
  FileOutlined,
  PlayCircleOutlined,
  FileZipOutlined,
} from "@ant-design/icons";
import { Table, Spin, Empty } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useFinderScope } from "@/app/hooks/use-finder-scope";
import { getModalState } from "@/app/store/finder-store";
import { isImageFile } from "@/app/hooks/global-image-preview-context";
import { isVideoFile } from "@/app/hooks/use-video-preview";
import { isArchiveFile } from "@/app/utils/file-utils";
import { useCallback } from "react";

interface FinderListViewProps {
  modalId: string;
  onOpenItem: (item: { path: string; name: string; isDirectory: boolean }) => void;
}

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return "-";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
};

const formatDate = (date?: Date): string => {
  if (!date) return "-";
  const d = new Date(date);
  return d.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getFileType = (name: string, isDirectory: boolean): string => {
  if (isDirectory) return "文件夹";
  const ext = name.includes(".") ? name.split(".").pop()?.toUpperCase() : "";
  if (!ext) return "文件";
  if (isVideoFile(name)) return "视频";
  if (isImageFile(name)) return "图片";
  if (isArchiveFile(name)) return "压缩包";
  return ext;
};

const FinderListView = ({ modalId, onOpenItem }: FinderListViewProps) => {
  const {
    fileList,
    loading,
    selectedFiles,
    selectFile,
    clearSelection,
  } = useFinderScope(modalId);

  const handleRowClick = useCallback(
    (item: (typeof fileList)[0], index: number, e: React.MouseEvent) => {
      e.stopPropagation();
      const multi = e.metaKey || e.ctrlKey;
      const range = e.shiftKey;
      selectFile(item.path, index, multi, range);
    },
    [selectFile],
  );

  const handleRowDoubleClick = useCallback(
    (item: (typeof fileList)[0]) => {
      onOpenItem(item);
    },
    [onOpenItem],
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent, path: string) => {
      const { selectedFiles: selFiles } = getModalState(modalId);
      const paths = selFiles.includes(path) ? selFiles : [path];
      e.dataTransfer.setData(
        "application/x-finder-paths",
        JSON.stringify(paths),
      );
      e.dataTransfer.effectAllowed = "move";
    },
    [modalId],
  );

  const getFileIcon = (item: (typeof fileList)[0]) => {
    if (item.isDirectory) return <FolderOutlined className="text-blue-400" />;
    if (isVideoFile(item.name)) return <PlayCircleOutlined className="text-red-400" />;
    if (isArchiveFile(item.name)) return <FileZipOutlined className="text-orange-400" />;
    return <FileOutlined className="text-gray-400" />;
  };

  const columns: ColumnsType<(typeof fileList)[0]> = [
    {
      title: "名称",
      dataIndex: "name",
      key: "name",
      render: (name: string, record) => (
        <div className="flex items-center gap-2">
          {getFileIcon(record)}
          <span>{name}</span>
        </div>
      ),
    },
    {
      title: "大小",
      dataIndex: "size",
      key: "size",
      width: 120,
      render: (size: number, record) =>
        record.isDirectory ? "-" : formatFileSize(size),
    },
    {
      title: "修改时间",
      dataIndex: "modifiedTime",
      key: "modifiedTime",
      width: 180,
      render: (time: Date) => formatDate(time),
    },
    {
      title: "类型",
      key: "type",
      width: 100,
      render: (_, record) => getFileType(record.name, record.isDirectory),
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
      <div className="flex items-center justify-center h-full">
        <Empty description="此目录为空" />
      </div>
    );
  }

  return (
    <div
      className="flex-1 min-h-0 overflow-auto"
      onClick={clearSelection}
    >
      <Table
        columns={columns}
        dataSource={fileList}
        rowKey="path"
        pagination={false}
        size="small"
        onRow={(record, index) => ({
          onClick: (e) => handleRowClick(record, index || 0, e),
          onDoubleClick: () => handleRowDoubleClick(record),
          draggable: true,
          onDragStart: (e) => handleDragStart(e, record.path),
          className: `${
            selectedFiles.includes(record.path)
              ? "!bg-blue-600/30"
              : "hover:bg-gray-700/50"
          } cursor-pointer`,
        })}
        styles={{
          header: {
            background: "transparent",
          } as any,
        }}
      />
    </div>
  );
};

export default FinderListView;
