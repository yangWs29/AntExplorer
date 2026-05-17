"use client";

import React, { useState, useRef, useEffect } from "react";
import { Form, Input, Button, App } from "antd";
import type { TextAreaRef } from "antd/es/input/TextArea";
import { useModalStore } from "@/app/store/explorer-modal-store";
import { extractArchive, readDirectory } from "@/app/actions/file-actions";
import DirectoryTreeSelector from "./directory-tree-selector";
import { getDisplayPath, getFullPath } from "@/app/utils/file-utils";

const { TextArea } = Input;

interface ExtractContentProps {
  modalId: string;
}

const ExtractContent = ({ modalId }: ExtractContentProps) => {
  const { message } = App.useApp();
  const { getModalById, closeModal, setModalLoading, setModalFileList } =
    useModalStore();
  const [form] = Form.useForm();
  const [logs, setLogs] = useState<string[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const textAreaRef = useRef<TextAreaRef>(null);

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

  // 添加日志
  const addLog = (log: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${log}`]);
  };

  const handleExtract = async (values: {
    extractName: string;
    targetDir?: string;
  }) => {
    if (!extractData) return;

    try {
      setIsExtracting(true);
      setModalLoading(modalId, true);
      addLog(`开始解压缩: ${extractData.archiveName}`);
      addLog(`解压目录名: ${values.extractName}`);

      // 获取压缩包所在目录
      const archiveDirPath = extractData.archivePath.substring(
        0,
        extractData.archivePath.lastIndexOf("/"),
      );
      // 将显示路径转换为完整路径
      const displayTargetDir =
        values.targetDir || getDisplayPath(archiveDirPath, rootDir);
      const baseTargetDir = getFullPath(displayTargetDir, rootDir);
      const targetDirPath = `${baseTargetDir}/${values.extractName}`;

      addLog(`目标目录: ${baseTargetDir}`);
      addLog(`完整路径: ${targetDirPath}`);

      const result = await extractArchive(
        extractData.archivePath,
        targetDirPath,
      );

      addLog(`解压缩成功: ${result.extractPath}`);

      // 查找并刷新所有匹配的 explorer 窗口
      const allModals = useModalStore.getState().modals;
      allModals.forEach((m) => {
        if (m.type === "explorer" && m.path === baseTargetDir) {
          readDirectory(baseTargetDir).then((files) => {
            setModalFileList(m.id, files);
          });
        }
      });

      addLog("文件列表已刷新");
      message.success("解压缩成功");
    } catch (error: any) {
      addLog(`错误: ${error.message || "解压缩失败"}`);
      message.error("解压缩失败");
      console.error(error);
    } finally {
      setIsExtracting(false);
      setModalLoading(modalId, false);
    }
  };

  return (
    <div className="p-4 flex flex-col" style={{ minHeight: "400px" }}>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleExtract}
        initialValues={{
          targetDir:
            extractData?.targetDir || getDisplayPath(currentDirPath, rootDir),
          extractName: extractData?.archiveName?.replace(/\.[^/.]+$/, "") || "",
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

        <Form.Item className="mb-0">
          <div className="flex justify-end gap-2">
            <Button onClick={() => closeModal(modalId)} disabled={isExtracting}>
              取消
            </Button>
            <Button type="primary" htmlType="submit" loading={isExtracting}>
              解压缩
            </Button>
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
            height: "240px",
            resize: "none",
            fontFamily: "monospace",
            fontSize: "12px",
            overflowY: "auto",
          }}
        />
      </div>
    </div>
  );
};

export default ExtractContent;
