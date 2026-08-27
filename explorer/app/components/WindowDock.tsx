"use client";

import React from "react";
import {
  FolderOutlined,
  SettingOutlined,
  DatabaseOutlined,
  FileOutlined,
  CompressOutlined,
  ExpandOutlined,
  BarChartOutlined,
  AppstoreOutlined,
} from "@ant-design/icons";
import { Tooltip } from "antd";
import { useModalStore, type ModalType } from "@/app/store/explorer-modal-store";

const iconMap: Record<ModalType, React.ReactNode> = {
  finder: <FolderOutlined />,
  system: <SettingOutlined />,
  "media-management": <DatabaseOutlined />,
  "file-detail": <FileOutlined />,
  compress: <CompressOutlined />,
  extract: <ExpandOutlined />,
  analyze: <BarChartOutlined />,
  "batch-analyze": <AppstoreOutlined />,
};

const WindowDock = () => {
  const modals = useModalStore((s) => s.modals);
  const bringToFront = useModalStore((s) => s.bringToFront);

  if (modals.length === 0) return null;

  // 找到最顶层窗口（zIndex 最大）
  const topZIndex = Math.max(...modals.map((m) => m.zIndex));

  return (
    <div
      className="fixed bottom-2 left-1/2 -translate-x-1/2 flex items-end gap-1.5 px-3 py-1.5 rounded-xl z-[9998]"
      style={{
        background: "rgba(40, 40, 40, 0.75)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      {modals.map((modal) => {
        const isActive = modal.zIndex === topZIndex;
        return (
          <Tooltip key={modal.id} title={modal.title} placement="top">
            <button
              className="flex flex-col items-center justify-center w-12 h-12 rounded-lg transition-all duration-150 cursor-pointer border-0"
              style={{
                background: isActive
                  ? "rgba(255,255,255,0.18)"
                  : "rgba(255,255,255,0.06)",
                color: isActive ? "#fff" : "rgba(255,255,255,0.65)",
              }}
              onClick={() => bringToFront(modal.id)}
            >
              <span className="text-base">{iconMap[modal.type]}</span>
              <span className="text-[10px] mt-0.5 truncate w-10 text-center leading-tight">
                {modal.title.length > 6
                  ? modal.title.slice(0, 6) + "…"
                  : modal.title}
              </span>
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
};

export default WindowDock;
