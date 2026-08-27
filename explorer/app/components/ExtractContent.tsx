"use client";

import React, { useState, useRef, useEffect } from "react";
import { Form, Input, Button, App, Modal, Table } from "antd";
import { EyeOutlined, LockOutlined } from "@ant-design/icons";
import type { TextAreaRef } from "antd/es/input/TextArea";
import type { ColumnsType } from "antd/es/table";
import { useModalStore } from "@/app/store/explorer-modal-store";
import {
  extractArchive,
  listArchiveContentsAction,
} from "@/app/actions/file-actions";
import DirectoryTreeSelector from "./DirectoryTreeSelector";
import { getDisplayPath, getFullPath } from "@/app/utils/file-utils";

const { TextArea } = Input;

interface ExtractContentProps {
  modalId: string;
}

interface ArchiveFileEntry {
  path: string;
  size: number;
  compressed?: number;
}

// 格式化文件大小
function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

const ExtractContent = ({ modalId }: ExtractContentProps) => {
  const { message } = App.useApp();
  const { getModalById, closeModal, setModalLoading } = useModalStore();
  const [form] = Form.useForm();
  const [logs, setLogs] = useState<string[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const textAreaRef = useRef<TextAreaRef>(null);

  // 文件列表弹窗
  const [fileListVisible, setFileListVisible] = useState(false);
  const [fileListData, setFileListData] = useState<ArchiveFileEntry[]>([]);
  const [fileListLoading, setFileListLoading] = useState(false);

  // 确认弹窗
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [pendingValues, setPendingValues] = useState<{
    extractName: string;
    targetDir?: string;
    password?: string;
  } | null>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (textAreaRef.current?.nativeElement) {
      textAreaRef.current.nativeElement.scrollTop =
        textAreaRef.current.nativeElement.scrollHeight;
    }
  }, [logs]);

  const modal = getModalById(modalId);
  const extractData = modal?.extractData;

  // 获取当前压缩包所在目录
  const currentDirPath = extractData?.archivePath
    ? extractData.archivePath.substring(
        0,
        extractData.archivePath.lastIndexOf("/"),
      )
    : "";

  // 获取根目录（环境变量）
  const rootDir = process.env.NEXT_PUBLIC_DIR || "/";

  // 判断是否是拆分包
  const isSplitArchive =
    extractData?.archiveName && /\.\d{3,}$/.test(extractData.archiveName);

  // 添加日志
  const addLog = (log: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${log}`]);
  };

  // 查看压缩包文件列表
  const handleViewFileList = async () => {
    if (!extractData) return;
    const password = form.getFieldValue("password") || undefined;

    setFileListLoading(true);
    setFileListVisible(true);
    try {
      const result = await listArchiveContentsAction(
        extractData.archivePath,
        password,
      );
      setFileListData(result.files);
    } catch (error: any) {
      message.error(
        error?.message?.includes("Wrong password")
          ? "密码错误，无法读取文件列表"
          : "无法读取压缩包文件列表",
      );
      setFileListVisible(false);
    } finally {
      setFileListLoading(false);
    }
  };

  // 表单提交 -> 弹出确认弹窗
  const handleFormSubmit = (values: {
    extractName: string;
    targetDir?: string;
    password?: string;
  }) => {
    setPendingValues(values);
    setConfirmVisible(true);
  };

  // 确认后执行解压
  const handleConfirmExtract = async () => {
    if (!extractData || !pendingValues) return;
    setConfirmVisible(false);

    try {
      setIsExtracting(true);
      setModalLoading(modalId, true);
      addLog(`开始解压缩: ${extractData.archiveName}`);
      addLog(`解压目录名: ${pendingValues.extractName}`);
      if (isSplitArchive) {
        addLog(`检测到拆分包格式，将自动合并所有分卷`);
      }

      // 获取压缩包所在目录
      const archiveDirPath = extractData.archivePath.substring(
        0,
        extractData.archivePath.lastIndexOf("/"),
      );
      // 将显示路径转换为完整路径
      const displayTargetDir =
        pendingValues.targetDir || getDisplayPath(archiveDirPath, rootDir);
      const baseTargetDir = getFullPath(displayTargetDir, rootDir);
      const targetDirPath = `${baseTargetDir}/${pendingValues.extractName}`;

      addLog(`目标目录: ${baseTargetDir}`);
      addLog(`完整路径: ${targetDirPath}`);

      const result = await extractArchive(
        extractData.archivePath,
        targetDirPath,
        pendingValues.password || undefined,
      );

      addLog(`解压缩成功: ${result.extractPath}`);
      message.success("解压缩成功");
      closeModal(modalId);
    } catch (error: any) {
      const errMsg = error?.message || "解压缩失败";
      if (errMsg.includes("Wrong password") || errMsg.includes("password")) {
        addLog("错误: 密码错误或压缩包已加密");
        message.error("密码错误或压缩包已加密");
      } else {
        addLog(`错误: ${errMsg}`);
        message.error("解压缩失败");
      }
      console.error(error);
    } finally {
      setIsExtracting(false);
      setModalLoading(modalId, false);
    }
  };

  // 文件列表表格列
  const fileColumns: ColumnsType<ArchiveFileEntry> = [
    {
      title: "文件名",
      dataIndex: "path",
      key: "path",
      ellipsis: true,
    },
    {
      title: "原始大小",
      dataIndex: "size",
      key: "size",
      width: 100,
      render: (size: number) => formatSize(size),
    },
    {
      title: "压缩大小",
      dataIndex: "compressed",
      key: "compressed",
      width: 100,
      render: (size: number) => (size ? formatSize(size) : "-"),
    },
  ];

  return (
    <div className="p-4 flex flex-col" style={{ minHeight: "400px" }}>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFormSubmit}
        initialValues={{
          targetDir:
            extractData?.targetDir || getDisplayPath(currentDirPath, rootDir),
          extractName:
            extractData?.archiveName
              ?.replace(/\.\d{3,}$/, "")
              .replace(/\.[^/.]+$/, "") || "",
          password: "",
        }}
        disabled={isExtracting}
      >
        <Form.Item
          label="目标目录"
          name="targetDir"
          rules={[{ required: true, message: "请选择目标目录" }]}
        >
          <DirectoryTreeSelector placeholder="点击选择目标目录" />
        </Form.Item>

        <Form.Item
          label="解压缩目录名"
          name="extractName"
          rules={[
            { required: true, message: "请输入解压缩目录名" },
            {
              pattern: /^[^\\/:*?"<>|]+$/,
              message: '目录名不能包含 \\ / : * ? " < > |',
            },
          ]}
        >
          <Input placeholder="请输入解压缩后的目录名" />
        </Form.Item>

        <Form.Item label="密码（可选）" name="password">
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="如压缩包有密码请输入"
            allowClear
          />
        </Form.Item>

        {isSplitArchive && (
          <div className="mb-3 text-xs text-gray-500">
            检测到拆分包格式（如 .7z.001），解压时将自动合并所有分卷文件。
          </div>
        )}

        <Form.Item className="mb-0">
          <div className="flex justify-between">
            <Button
              icon={<EyeOutlined />}
              onClick={handleViewFileList}
              loading={fileListLoading}
            >
              查看文件列表
            </Button>
            <div className="flex gap-2">
              <Button
                onClick={() => closeModal(modalId)}
                disabled={isExtracting}
              >
                取消
              </Button>
              <Button type="primary" htmlType="submit" loading={isExtracting}>
                解压缩
              </Button>
            </div>
          </div>
        </Form.Item>
      </Form>

      {/* 日志显示区域 */}
      <div className="mt-4 flex-1">
        <div className="text-sm font-medium mb-2">解压缩日志：</div>
        <TextArea
          ref={textAreaRef}
          value={logs.join("\n") || "等待开始解压缩..."}
          readOnly
          style={{
            height: "200px",
            resize: "none",
            fontFamily: "monospace",
            fontSize: "12px",
            overflowY: "auto",
          }}
        />
      </div>

      {/* 文件列表弹窗 */}
      <Modal
        title={`压缩包内容 - ${extractData?.archiveName || ""}`}
        open={fileListVisible}
        onCancel={() => setFileListVisible(false)}
        footer={null}
        width={700}
      >
        <Table
          columns={fileColumns}
          dataSource={fileListData}
          rowKey="path"
          size="small"
          pagination={{ pageSize: 50, showSizeChanger: false }}
          scroll={{ y: 400 }}
        />
      </Modal>

      {/* 确认解压弹窗 */}
      <Modal
        title="确认解压缩"
        open={confirmVisible}
        onCancel={() => setConfirmVisible(false)}
        onOk={handleConfirmExtract}
        okText="确认解压"
        cancelText="取消"
      >
        <div className="space-y-2">
          <p>
            <strong>压缩包：</strong>
            {extractData?.archiveName}
          </p>
          <p>
            <strong>解压目录名：</strong>
            {pendingValues?.extractName}
          </p>
          {pendingValues?.password && (
            <p>
              <strong>密码：</strong>
              {"*".repeat(pendingValues.password.length)}
            </p>
          )}
          {isSplitArchive && (
            <p className="text-xs text-gray-500">
              拆分包格式，将自动合并所有分卷。
            </p>
          )}
          <p className="text-xs text-gray-400">点击"确认解压"开始解压操作。</p>
        </div>
      </Modal>
    </div>
  );
};

export default ExtractContent;
