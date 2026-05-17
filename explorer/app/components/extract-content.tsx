"use client";

import React, { useState, useRef, useEffect } from "react";
import { Form, Input, Button, App } from "antd";
import type { TextAreaRef } from "antd/es/input/TextArea";
const { TextArea } = Input;
import { useModalStore } from "@/app/store/explorer-modal-store";
import { extractArchive, readDirectory } from "@/app/actions/file-actions";

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

  // 添加日志
  const addLog = (log: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${log}`]);
  };

  const handleExtract = async (values: { extractName: string }) => {
    if (!extractData) return;

    try {
      setIsExtracting(true);
      setModalLoading(modalId, true);
      addLog(`开始解压缩: ${extractData.archiveName}`);
      addLog(`目标目录: ${values.extractName}`);

      // 获取压缩包所在目录
      const archiveDirPath = extractData.archivePath.substring(
        0,
        extractData.archivePath.lastIndexOf("/"),
      );
      const targetDirPath = `${archiveDirPath}/${values.extractName}`;

      addLog(`完整路径: ${targetDirPath}`);

      const result = await extractArchive(
        extractData.archivePath,
        targetDirPath,
      );

      addLog(`解压缩成功: ${result.extractPath}`);

      // 查找并刷新所有匹配的 explorer 窗口
      const allModals = useModalStore.getState().modals;
      allModals.forEach((m) => {
        if (m.type === "explorer" && m.path === archiveDirPath) {
          readDirectory(archiveDirPath).then((files) => {
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
          extractName: extractData?.archiveName?.replace(/\.[^/.]+$/, "") || "",
        }}
        disabled={isExtracting}
      >
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
