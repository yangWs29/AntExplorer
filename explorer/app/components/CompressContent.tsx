"use client";

import React from "react";
import { Form, Input, Select, Button, App } from "antd";
import { useModalStore } from "@/app/store/explorer-modal-store";
import { compressFile, readDirectory } from "@/app/actions/file-actions";
import DirectoryTreeSelector from "./DirectoryTreeSelector";
import { getDisplayPath, getFullPath } from "@/app/utils/file-utils";

interface CompressContentProps {
  modalId: string;
}

const CompressContent = ({ modalId }: CompressContentProps) => {
  const { message } = App.useApp();
  const { getModalById, closeModal, setModalLoading, setModalFileList } =
    useModalStore();
  const [form] = Form.useForm();

  const modal = getModalById(modalId);
  const compressData = modal?.compressData;

  // 获取当前 explorer 的目录路径
  const currentDirPath = compressData?.sourcePath
    ? compressData.sourcePath.substring(
        0,
        compressData.sourcePath.lastIndexOf("/"),
      )
    : "";

  // 获取根目录（环境变量）
  const rootDir = process.env.NEXT_PUBLIC_DIR || "/";

  // 获取不带扩展名的文件名作为默认压缩包名称
  const getDefaultArchiveName = () => {
    if (!compressData?.sourceName) return "";
    const lastDotIndex = compressData.sourceName.lastIndexOf(".");
    if (lastDotIndex === -1) {
      // 没有扩展名，直接使用原名
      return compressData.sourceName;
    }
    // 去掉扩展名
    return compressData.sourceName.substring(0, lastDotIndex);
  };

  // 压缩格式选项
  const formatOptions = [
    { label: "7z", value: "7z" },
    { label: "zip", value: "zip" },
    { label: "tar", value: "tar" },
    { label: "gz", value: "gz" },
    { label: "bz2", value: "bz2" },
  ];

  const handleCompress = async (values: {
    archiveName: string;
    format: string;
    targetDir?: string;
  }) => {
    if (!compressData) return;

    try {
      setModalLoading(modalId, true);

      // 确定目标目录
      const sourceDirPath = compressData.sourcePath.substring(
        0,
        compressData.sourcePath.lastIndexOf("/"),
      );
      // 将显示路径转换为完整路径
      const displayTargetDir =
        values.targetDir || getDisplayPath(sourceDirPath, rootDir);
      const targetDirPath = getFullPath(displayTargetDir, rootDir);

      const archiveName = `${values.archiveName}.${values.format}`;
      await compressFile(compressData.sourcePath, archiveName, targetDirPath);

      // 刷新目标目录的文件列表
      const allModals = useModalStore.getState().modals;
      allModals.forEach((modal) => {
        if (modal.type === "explorer" && modal.path === targetDirPath) {
          readDirectory(targetDirPath).then((files) => {
            setModalFileList(modal.id, files);
          });
        }
      });

      message.success(`压缩成功: ${archiveName}`);
      closeModal(modalId);
    } catch (error) {
      message.error("压缩失败");
      console.error(error);
    } finally {
      setModalLoading(modalId, false);
    }
  };

  return (
    <div className="p-4">
      <Form
        form={form}
        layout="vertical"
        onFinish={handleCompress}
        initialValues={{
          targetDir:
            compressData?.targetDir || getDisplayPath(currentDirPath, rootDir),
          archiveName: getDefaultArchiveName(),
          format: "7z",
        }}
      >
        <Form.Item
          label="目标目录"
          name="targetDir"
          rules={[{ required: true, message: "请选择目标目录" }]}
        >
          <DirectoryTreeSelector placeholder="点击选择目标目录" />
        </Form.Item>

        <Form.Item
          label="压缩包名称"
          name="archiveName"
          rules={[
            { required: true, message: "请输入压缩包名称" },
            {
              pattern: /^[^\\/:*?"<>|]+$/,
              message: '文件名不能包含 \\ / : * ? " < > |',
            },
          ]}
        >
          <Input placeholder="请输入压缩包名称" />
        </Form.Item>

        <Form.Item
          label="压缩格式"
          name="format"
          rules={[{ required: true, message: "请选择压缩格式" }]}
        >
          <Select options={formatOptions} />
        </Form.Item>

        <Form.Item className="mb-0">
          <div className="flex justify-end gap-2">
            <Button onClick={() => closeModal(modalId)}>取消</Button>
            <Button type="primary" htmlType="submit">
              压缩
            </Button>
          </div>
        </Form.Item>
      </Form>
    </div>
  );
};

export default CompressContent;
