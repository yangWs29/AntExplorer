"use client";

import { AppstoreOutlined, UnorderedListOutlined } from "@ant-design/icons";
import { Button, Tooltip, Segmented } from "antd";
import { useModalStore } from "@/app/store/explorer-modal-store";

interface ViewModeToggleProps {
  modalId: string;
}

const ViewModeToggle = ({ modalId }: ViewModeToggleProps) => {
  const { getModalById, setModalViewMode, setModalIconColumns } = useModalStore();
  
  const modal = getModalById(modalId);
  const viewMode = modal?.viewMode || "icon";
  const iconColumns = modal?.iconColumns || 4;

  const toggleViewMode = () => {
    setModalViewMode(modalId, viewMode === "list" ? "icon" : "list");
  };

  const handleColumnChange = (value: number) => {
    setModalIconColumns(modalId, value as 1 | 2 | 3 | 4);
  };

  return (
    <div className="flex justify-end items-center gap-2">
      {viewMode === "icon" && (
        <Segmented
          size="small"
          options={[
            { label: "1", value: 1 },
            { label: "2", value: 2 },
            { label: "3", value: 3 },
            { label: "4", value: 4 },
          ]}
          value={iconColumns}
          onChange={handleColumnChange}
        />
      )}
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
