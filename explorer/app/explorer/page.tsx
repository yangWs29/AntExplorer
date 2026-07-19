"use client";

import {
  FolderOutlined,
  SettingOutlined,
  DatabaseOutlined,
} from "@ant-design/icons";
import { Card, theme } from "antd";
import { useModalStore } from "@/app/store/explorer-modal-store";
import ModalContainer from "@/app/components/ModalContainer";
import { Content } from "antd/es/layout/layout";

const Explorer = () => {
  const { openModal, openMediaManagementModal, openSystemModal } = useModalStore();

  const items = [
    {
      id: "system",
      icon: <SettingOutlined style={{ fontSize: 48 }} />,
      label: "System",
      onClick: () => {
        openSystemModal();
      },
    },
    {
      id: "explorer",
      icon: <FolderOutlined style={{ fontSize: 48 }} />,
      label: "Explorer",
      onClick: () => {
        openModal("Explorer", process.env.NEXT_PUBLIC_DIR || "/");
      },
    },
    {
      id: "media-management",
      icon: <DatabaseOutlined style={{ fontSize: 48 }} />,
      label: "媒体管理",
      onClick: () => {
        openMediaManagementModal({
          rootDir: process.env.NEXT_PUBLIC_DIR || "/",
        });
      },
    },
  ];

  const {
    token: { colorBgContainer },
  } = theme.useToken();

  return (
    <Content style={{ background: colorBgContainer }}>
      <div className="min-h-screen p-4">
        <div className="flex flex-col gap-6 w-fit">
          {items.map((item) => (
            <Card
              key={item.id}
              hoverable
              className="text-center w-32 cursor-pointer"
              onClick={item.onClick}
            >
              <div className="text-gray-200">{item.icon}</div>
              <div className="mt-2 text-sm text-gray-300">{item.label}</div>
            </Card>
          ))}
        </div>
      </div>
      <ModalContainer />
    </Content>
  );
};

export default Explorer;
