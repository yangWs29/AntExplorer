"use client";

import React, { useState, useEffect } from "react";
import { Input, Dropdown, Tree, Spin } from "antd";
import type { DataNode } from "antd/es/tree";
import { DownOutlined } from "@ant-design/icons";
import { getDirectoryTree, getSubDirectories } from "@/app/actions/file-actions";

interface DirectoryTreeSelectorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  rootDir?: string;
}

const DirectoryTreeSelector = ({
  value,
  onChange,
  placeholder = "点击选择目录",
  rootDir = process.env.NEXT_PUBLIC_DIR || "/",
}: DirectoryTreeSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadedKeys, setLoadedKeys] = useState<Set<string>>(new Set());

  // 将完整路径转换为相对路径（隐藏根目录）
  const getDisplayPath = (fullPath: string) => {
    if (!fullPath) return "";
    if (fullPath.startsWith(rootDir)) {
      return "/" + fullPath.substring(rootDir.length).replace(/^\//, "");
    }
    return fullPath;
  };

  // 将相对路径转换回完整路径
  const getFullPath = (displayPath: string) => {
    if (!displayPath) return rootDir;
    if (displayPath.startsWith("/")) {
      return rootDir + displayPath;
    }
    return rootDir + "/" + displayPath;
  };

  // 加载目录树
  useEffect(() => {
    const loadTree = async () => {
      setLoading(true);
      try {
        const tree = await getDirectoryTree(rootDir);
        setTreeData(
          tree.map((item) => ({
            title: item.name,
            key: item.path,
            isLeaf: false,
          })),
        );
      } catch (error) {
        console.error("Failed to load directory tree:", error);
      } finally {
        setLoading(false);
      }
    };

    loadTree();
  }, [rootDir]);

  // 懒加载子目录
  const onLoadData = async (node: DataNode) => {
    const key = node.key as string;
    if (loadedKeys.has(key)) {
      return Promise.resolve();
    }

    return new Promise<void>(async (resolve) => {
      try {
        const subDirs = await getSubDirectories(key);

        setTreeData((origin) => {
          const loop = (data: DataNode[]): DataNode[] =>
            data.map((item) => {
              if (item.key === key) {
                return {
                  ...item,
                  children: subDirs.map((child) => ({
                    title: child.name,
                    key: child.path,
                    isLeaf: false,
                  })),
                };
              }
              if (item.children) {
                return {
                  ...item,
                  children: loop(item.children),
                };
              }
              return item;
            });
          return loop(origin);
        });

        setLoadedKeys((prev) => new Set(prev).add(key));
      } catch (error) {
        console.error("Failed to load subdirectories:", error);
      }
      resolve();
    });
  };

  const handleSelect = (selectedKeys: React.Key[]) => {
    if (selectedKeys.length > 0) {
      const path = selectedKeys[0] as string;
      const displayPath = getDisplayPath(path);
      onChange?.(displayPath);
      setOpen(false);
    }
  };

  return (
    <Dropdown
      open={open}
      onOpenChange={setOpen}
      trigger={["click"]}
      popupRender={() => (
        <div
          style={{ padding: 8, width: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          <Spin spinning={loading}>
            <Tree
              treeData={treeData}
              loadData={onLoadData}
              onSelect={handleSelect}
              defaultExpandAll={false}
              showLine
              style={{
                maxHeight: "300px",
                overflowY: "auto",
              }}
            />
          </Spin>
        </div>
      )}
    >
      <Input
        placeholder={placeholder}
        value={value}
        readOnly
        suffix={<DownOutlined />}
        style={{ cursor: "pointer" }}
      />
    </Dropdown>
  );
};

export default DirectoryTreeSelector;
