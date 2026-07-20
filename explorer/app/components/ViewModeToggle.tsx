"use client";

import {
  AppstoreOutlined,
  UnorderedListOutlined,
  SortAscendingOutlined,
  CheckOutlined,
} from "@ant-design/icons";
import { Button, Tooltip, Segmented, Dropdown } from "antd";
import type { MenuProps } from "antd";
import {
  useModalStore,
  type SortField,
  type SortOrder,
} from "@/app/store/explorer-modal-store";

interface ViewModeToggleProps {
  modalId: string;
}

const SORT_OPTIONS: { label: string; field: SortField }[] = [
  { label: "名称", field: "name" },
  { label: "大小", field: "size" },
  { label: "修改时间", field: "modifiedTime" },
];

const ViewModeToggle = ({ modalId }: ViewModeToggleProps) => {
  const { getModalById, setModalViewMode, setModalIconColumns, setModalSort } =
    useModalStore();

  const modal = getModalById(modalId);
  const viewMode = modal?.viewMode || "icon";
  const iconColumns = modal?.iconColumns || 4;
  const sortField = modal?.sortField || "name";
  const sortOrder = modal?.sortOrder || "asc";

  const toggleViewMode = () => {
    setModalViewMode(modalId, viewMode === "list" ? "icon" : "list");
  };

  const handleColumnChange = (value: number) => {
    setModalIconColumns(modalId, value as 1 | 2 | 3 | 4);
  };

  const handleSortClick: MenuProps["onClick"] = ({ key }) => {
    const [field, order] = key.split(":") as [SortField, SortOrder];
    setModalSort(modalId, field, order);
  };

  const sortMenuItems: MenuProps["items"] = SORT_OPTIONS.flatMap((opt) => [
    {
      key: `${opt.field}:asc`,
      label: (
        <span className="flex items-center justify-between gap-4">
          <span>{opt.label} ↑</span>
          {sortField === opt.field && sortOrder === "asc" && (
            <CheckOutlined className="text-blue-500 text-xs" />
          )}
        </span>
      ),
    },
    {
      key: `${opt.field}:desc`,
      label: (
        <span className="flex items-center justify-between gap-4">
          <span>{opt.label} ↓</span>
          {sortField === opt.field && sortOrder === "desc" && (
            <CheckOutlined className="text-blue-500 text-xs" />
          )}
        </span>
      ),
    },
  ]);

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
      <Dropdown
        menu={{ items: sortMenuItems, onClick: handleSortClick }}
        trigger={["click"]}
      >
        <Tooltip title="排序">
          <Button type="text" size="small" icon={<SortAscendingOutlined />} />
        </Tooltip>
      </Dropdown>
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
