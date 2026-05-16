"use client";

import { FolderOutlined, SettingOutlined } from "@ant-design/icons";
import { Card } from "antd";

const Explorer = () => {
  const items = [
    {
      id: "system",
      icon: <SettingOutlined style={{ fontSize: 48 }} />,
      label: "System",
    },
    {
      id: "explorer",
      icon: <FolderOutlined style={{ fontSize: 48 }} />,
      label: "Explorer",
    },
  ];

  return (
    <div className="min-h-screen p-4">
      <div className="flex flex-col gap-6 w-fit">
        {items.map((item) => (
          <Card key={item.id} hoverable className="text-center w-32">
            <div className="text-gray-200">{item.icon}</div>
            <div className="mt-2 text-sm text-gray-300">{item.label}</div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Explorer;
