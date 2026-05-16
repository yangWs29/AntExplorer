"use client";

import { AppstoreOutlined, UnorderedListOutlined } from "@ant-design/icons";
import { Button, Tooltip } from "antd";
import { useModalStore } from "@/app/store/explorer-modal-store";

interface ViewModeToggleProps {
  modalId: string;
}

const ViewModeToggle = ({ modalId }: ViewModeToggleProps) => {
  const { getModalById, setModalViewMode } = useModalStore();
  
  const modal = getModalById(modalId);
  const viewMode = modal?.viewMode || "icon";

  const toggleViewMode = () => {
    setModalViewMode(modalId, viewMode === "list" ? "icon" : "list");
  };

  return (
    <div className="flex justify-end">
      <Tooltip title={viewMode === "list" ? "Icon View" : "List View"}>
        <Button
          type="text"
          size="small"
          icon={
            viewMode === "list" ? (
              <AppstoreOutlined />
            ) : (
              <UnorderedListOutlined />
            )
          }
          onClick={toggleViewMode}
        />
      </Tooltip>
    </div>
  );
};

export default ViewModeToggle;
