"use client";

import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  ArrowUpOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  ColumnWidthOutlined,
  FolderAddOutlined,
} from "@ant-design/icons";
import { Button, Breadcrumb, Segmented, Tooltip } from "antd";
import { useFinderStore } from "@/app/store/finder-store";
import { useMemo } from "react";

interface FinderToolbarProps {
  onNewFolder: () => void;
}

const FinderToolbar = ({ onNewFolder }: FinderToolbarProps) => {
  const {
    currentPath,
    viewMode,
    canGoBack,
    canGoForward,
    goBack,
    goForward,
    goUp,
    navigateTo,
    setViewMode,
  } = useFinderStore();

  const breadcrumbItems = useMemo(() => {
    const segments = currentPath.split("/").filter(Boolean);
    const items = [];

    // 根目录
    items.push({
      title: (
        <span
          className="cursor-pointer hover:text-blue-400 transition-colors"
          onClick={() => navigateTo("/")}
        >
          /
        </span>
      ),
      key: "/",
    });

    let accumulated = "";
    segments.forEach((seg, idx) => {
      accumulated += "/" + seg;
      const isLast = idx === segments.length - 1;
      items.push({
        title: isLast ? (
          <span className="text-gray-400">{seg}</span>
        ) : (
          <span
            className="cursor-pointer hover:text-blue-400 transition-colors"
            onClick={() => navigateTo(accumulated)}
          >
            {seg}
          </span>
        ),
        key: accumulated,
      });
    });

    return items;
  }, [currentPath, navigateTo]);

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-700">
      {/* 导航按钮 */}
      <Tooltip title="后退">
        <Button
          type="text"
          size="small"
          icon={<ArrowLeftOutlined />}
          disabled={!canGoBack()}
          onClick={goBack}
        />
      </Tooltip>
      <Tooltip title="前进">
        <Button
          type="text"
          size="small"
          icon={<ArrowRightOutlined />}
          disabled={!canGoForward()}
          onClick={goForward}
        />
      </Tooltip>
      <Tooltip title="上级目录">
        <Button
          type="text"
          size="small"
          icon={<ArrowUpOutlined />}
          onClick={goUp}
        />
      </Tooltip>

      {/* 面包屑 */}
      <Breadcrumb items={breadcrumbItems} className="flex-1 min-w-0 mx-2" />

      {/* 视图模式切换 */}
      <Segmented
        size="small"
        value={viewMode}
        options={[
          { value: "icon", icon: <AppstoreOutlined /> },
          { value: "list", icon: <UnorderedListOutlined /> },
          { value: "column", icon: <ColumnWidthOutlined /> },
        ]}
        onChange={(val) => setViewMode(val as "icon" | "list" | "column")}
      />

      {/* 新建文件夹 */}
      <Tooltip title="新建文件夹">
        <Button
          type="text"
          size="small"
          icon={<FolderAddOutlined />}
          onClick={onNewFolder}
        />
      </Tooltip>
    </div>
  );
};

export default FinderToolbar;
