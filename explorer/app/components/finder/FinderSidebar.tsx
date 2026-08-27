"use client";

import { useState, useEffect, useRef } from "react";
import { Tree } from "antd";
import type { DataNode } from "antd/es/tree";
import { FolderOutlined } from "@ant-design/icons";
import { getDirectoryTree, getSubDirectories } from "@/app/actions/file-actions";
import { useFinderScope } from "@/app/hooks/use-finder-scope";

const ROOT_DIR = process.env.NEXT_PUBLIC_DIR || "/";

interface FinderSidebarProps {
  modalId: string;
}

const FinderSidebar = ({ modalId }: FinderSidebarProps) => {
  const { currentPath, navigateTo } = useFinderScope(modalId);
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const [loadedKeys, setLoadedKeys] = useState<Set<string>>(new Set());
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 加载根目录树
  useEffect(() => {
    const loadTree = async () => {
      try {
        const tree = await getDirectoryTree(ROOT_DIR);
        setTreeData(
          tree.map((item) => ({
            title: item.name,
            key: item.path,
            icon: <FolderOutlined />,
            isLeaf: false,
          })),
        );
      } catch (error) {
        console.error("Failed to load directory tree:", error);
      }
    };
    loadTree();
  }, []);

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
                    icon: <FolderOutlined />,
                    isLeaf: false,
                  })),
                };
              }
              if (item.children) {
                return { ...item, children: loop(item.children) };
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
      navigateTo(selectedKeys[0] as string);
    }
  };

  // 自动展开当前路径的父目录
  useEffect(() => {
    const parts = currentPath.split("/").filter(Boolean);
    const keysToExpand: React.Key[] = [];
    let accumulated = "";
    for (const part of parts) {
      accumulated += "/" + part;
      keysToExpand.push(accumulated);
    }
    // 只展开到父目录
    if (keysToExpand.length > 1) {
      setExpandedKeys(keysToExpand.slice(0, -1));
    }
  }, [currentPath]);

  // 将选中的树节点滚动到可视区域
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // 等待树渲染完成
    const raf = requestAnimationFrame(() => {
      const selectedNode = container.querySelector(
        ".ant-tree-node-selected"
      ) as HTMLElement | null;
      if (selectedNode) {
        selectedNode.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [currentPath, expandedKeys]);

  return (
    <div className="w-52 border-r border-gray-700 flex flex-col overflow-hidden">
      {/* 快速访问 */}
      <div className="px-3 py-2 border-b border-gray-700">
        <div className="text-xs text-gray-500 mb-1">快速访问</div>
        <div
          className="flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-gray-700 transition-colors"
          onClick={() => navigateTo(ROOT_DIR)}
        >
          <FolderOutlined className="text-blue-400" />
          <span className="text-sm truncate">根目录</span>
        </div>
      </div>

      {/* 目录树 */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-1 py-2">
        <div className="text-xs text-gray-500 mb-1 px-2">目录</div>
        <Tree
          treeData={treeData}
          loadData={onLoadData}
          onSelect={handleSelect}
          onExpand={(keys) => setExpandedKeys(keys)}
          expandedKeys={expandedKeys}
          selectedKeys={[currentPath]}
          showLine={false}
          blockNode
          className="finder-sidebar-tree"
        />
      </div>
    </div>
  );
};

export default FinderSidebar;
