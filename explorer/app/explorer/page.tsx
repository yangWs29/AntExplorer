"use client";

import {
  FolderOutlined,
  SettingOutlined,
  DatabaseOutlined,
} from "@ant-design/icons";
import { theme } from "antd";
import { useModalStore } from "@/app/store/explorer-modal-store";
import ModalContainer from "@/app/components/ModalContainer";
import OSMenuBar from "@/app/components/OSMenuBar";
import WindowDock from "@/app/components/WindowDock";

const appConfigs = [
  {
    id: "finder",
    icon: <FolderOutlined style={{ fontSize: 28 }} />,
    label: "Finder",
    boxStyle: {
      background: "rgba(59, 130, 246, 0.12)",
      borderColor: "rgba(59, 130, 246, 0.25)",
    },
    iconColor: "text-blue-400",
    action: "openFinderModal",
  },
  {
    id: "media-management",
    icon: <DatabaseOutlined style={{ fontSize: 28 }} />,
    label: "媒体管理",
    boxStyle: {
      background: "rgba(16, 185, 129, 0.12)",
      borderColor: "rgba(16, 185, 129, 0.25)",
    },
    iconColor: "text-emerald-400",
    action: "openMediaManagementModal",
  },
  {
    id: "system",
    icon: <SettingOutlined style={{ fontSize: 28 }} />,
    label: "System",
    boxStyle: {
      background: "rgba(161, 161, 170, 0.10)",
      borderColor: "rgba(161, 161, 170, 0.20)",
    },
    iconColor: "text-zinc-400",
    action: "openSystemModal",
  },
];

const Explorer = () => {
  const { openMediaManagementModal, openSystemModal, openFinderModal } =
    useModalStore();

  const {
    token: { colorBgContainer },
  } = theme.useToken();

  const handleClick = (item: (typeof appConfigs)[number]) => {
    if (item.action === "openFinderModal") {
      openFinderModal(process.env.NEXT_PUBLIC_DIR || "/");
    } else if (item.action === "openMediaManagementModal") {
      openMediaManagementModal({
        rootDir: process.env.NEXT_PUBLIC_DIR || "/",
      });
    } else if (item.action === "openSystemModal") {
      openSystemModal();
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <OSMenuBar />
      <div
        className="flex-1 overflow-auto"
        style={{ background: colorBgContainer }}
      >
        <div className="p-8">
          <div className="flex flex-wrap gap-8">
            {appConfigs.map((item) => (
              <div
                key={item.id}
                onClick={() => handleClick(item)}
                className="group flex w-24 flex-col items-center gap-3 cursor-pointer transition-transform duration-200 hover:scale-110 active:scale-95"
              >
                <div
                  className="flex h-20 w-20 items-center justify-center rounded-2xl border transition-shadow duration-200 group-hover:shadow-lg group-hover:shadow-black/20"
                  style={item.boxStyle}
                >
                  <span className={item.iconColor}>{item.icon}</span>
                </div>
                <span className="text-xs text-gray-400 transition-colors duration-200 group-hover:text-gray-200">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
        <ModalContainer />
      </div>
      <WindowDock />
    </div>
  );
};

export default Explorer;
