"use client";

import React, { useEffect, useState } from "react";
import {
  Form,
  Input,
  Button,
  App,
  Spin,
  Typography,
  Divider,
  Modal,
  List,
  Tag,
  Popconfirm,
  Empty,
} from "antd";
import {
  SaveOutlined,
  ReloadOutlined,
  DatabaseOutlined,
  DeleteOutlined,
  ClearOutlined,
} from "@ant-design/icons";
import {
  getTmdbConfigAction,
  saveTmdbConfigAction,
  listTmdbCacheAction,
  deleteTmdbCacheAction,
  clearAllTmdbCacheAction,
  type TmdbCacheItem,
} from "@/app/actions/tmdb-actions";

const { Text } = Typography;

interface SystemContentProps {
  modalId: string;
}

interface TmdbConfigForm {
  apiKey: string;
  language: string;
  baseUrl: string;
}

const SystemContent = ({ modalId }: SystemContentProps) => {
  const { message } = App.useApp();
  const [form] = Form.useForm<TmdbConfigForm>();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 缓存管理弹窗
  const [cacheModalOpen, setCacheModalOpen] = useState(false);
  const [cacheList, setCacheList] = useState<TmdbCacheItem[]>([]);
  const [cacheLoading, setCacheLoading] = useState(false);

  // 加载配置
  useEffect(() => {
    const loadConfig = async () => {
      setLoading(true);
      try {
        const config = await getTmdbConfigAction();
        form.setFieldsValue(config);
      } catch (error) {
        message.error("加载配置失败");
      } finally {
        setLoading(false);
      }
    };
    loadConfig();
  }, [form, message]);

  // 保存配置
  const handleSave = async (values: TmdbConfigForm) => {
    setSaving(true);
    try {
      await saveTmdbConfigAction(values);
      message.success("配置已保存");
    } catch (error) {
      message.error("保存失败");
    } finally {
      setSaving(false);
    }
  };

  // 重新加载
  const handleReload = async () => {
    setLoading(true);
    try {
      const config = await getTmdbConfigAction();
      form.setFieldsValue(config);
      message.info("配置已重新加载");
    } catch (error) {
      message.error("加载配置失败");
    } finally {
      setLoading(false);
    }
  };

  // 打开缓存管理弹窗
  const handleOpenCache = async () => {
    setCacheModalOpen(true);
    await loadCacheList();
  };

  // 加载缓存列表
  const loadCacheList = async () => {
    setCacheLoading(true);
    try {
      const items = await listTmdbCacheAction();
      setCacheList(items);
    } catch {
      message.error("加载缓存列表失败");
    } finally {
      setCacheLoading(false);
    }
  };

  // 删除单个缓存
  const handleDeleteCache = async (fileName: string) => {
    try {
      await deleteTmdbCacheAction(fileName);
      message.success("缓存已删除");
      setCacheList((prev) => prev.filter((item) => item.fileName !== fileName));
    } catch {
      message.error("删除失败");
    }
  };

  // 清空所有缓存
  const handleClearAllCache = async () => {
    setCacheLoading(true);
    try {
      const count = await clearAllTmdbCacheAction();
      message.success(`已清空 ${count} 个缓存文件`);
      setCacheList([]);
    } catch {
      message.error("清空失败");
    } finally {
      setCacheLoading(false);
    }
  };

  // 格式化文件大小
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  // 格式化时间
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("zh-CN");
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: 24, flex: 1, minHeight: 0, overflowY: "auto" }}>
      <Typography.Title level={5}>TMDB 配置</Typography.Title>
      <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 16 }}>
        配置 TMDB API 相关参数，用于媒体信息识别与匹配
      </Text>

      <Divider style={{ margin: "12px 0" }} />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSave}
        initialValues={{
          language: "zh-CN",
          baseUrl: "https://api.themoviedb.org/3",
        }}
      >
        <Form.Item
          label="API Key"
          name="apiKey"
          rules={[{ required: true, message: "请输入 API Key" }]}
          extra={
            <span>
              可前往{" "}
              <a
                href="https://www.themoviedb.org/settings/api"
                target="_blank"
                rel="noopener noreferrer"
              >
                TMDB 官网
              </a>{" "}
              申请 API Key
            </span>
          }
        >
          <Input.Password placeholder="请输入 TMDB API Key" />
        </Form.Item>

        <Form.Item
          label="语言"
          name="language"
          rules={[{ required: true, message: "请输入语言" }]}
          extra="API 请求的语言参数，如 zh-CN、en-US"
        >
          <Input placeholder="zh-CN" />
        </Form.Item>

        <Form.Item
          label="API 基础地址"
          name="baseUrl"
          rules={[
            { required: true, message: "请输入 API 基础地址" },
            { type: "url", message: "请输入有效的 URL" },
          ]}
          extra="TMDB API 的基础 URL，通常无需修改"
        >
          <Input placeholder="https://api.themoviedb.org/3" />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={saving}
            >
              保存配置
            </Button>
            <Button icon={<ReloadOutlined />} onClick={handleReload}>
              重新加载
            </Button>
            <Button icon={<DatabaseOutlined />} onClick={handleOpenCache}>
              缓存管理
            </Button>
          </div>
        </Form.Item>
      </Form>

      {/* 缓存管理弹窗 */}
      <Modal
        title="TMDB 缓存管理"
        open={cacheModalOpen}
        onCancel={() => setCacheModalOpen(false)}
        footer={null}
        width={640}
        destroyOnHidden
      >
        <div style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            共 {cacheList.length} 个缓存文件
          </Text>
          {cacheList.length > 0 && (
            <Popconfirm
              title="确认清空所有缓存？"
              onConfirm={handleClearAllCache}
              okText="确认"
              cancelText="取消"
              okButtonProps={{ danger: true }}
            >
              <Button
                type="text"
                danger
                size="small"
                icon={<ClearOutlined />}
              >
                清空全部
              </Button>
            </Popconfirm>
          )}
        </div>
        {cacheLoading ? (
          <div style={{ textAlign: "center", padding: 24 }}>
            <Spin />
          </div>
        ) : cacheList.length === 0 ? (
          <Empty description="暂无缓存" />
        ) : (
          <List
            size="small"
            dataSource={cacheList}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Popconfirm
                    key="del"
                    title="确认删除此缓存？"
                    onConfirm={() => handleDeleteCache(item.fileName)}
                    okText="删除"
                    cancelText="取消"
                    okButtonProps={{ danger: true }}
                  >
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                    >
                      删除
                    </Button>
                  </Popconfirm>,
                ]}
              >
                <List.Item.Meta
                  title={
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Tag
                        color={
                          item.type === "search"
                            ? "blue"
                            : item.type === "detail"
                              ? "green"
                              : "default"
                        }
                      >
                        {item.type === "search"
                          ? "搜索"
                          : item.type === "detail"
                            ? "详情"
                            : "其他"}
                      </Tag>
                      <Text
                        style={{ fontSize: 13 }}
                        ellipsis={{ tooltip: item.fileName }}
                      >
                        {item.fileName}
                      </Text>
                    </div>
                  }
                  description={
                    <div style={{ display: "flex", gap: 12, fontSize: 12 }}>
                      <Text type="secondary">{formatSize(item.size)}</Text>
                      <Text type="secondary">{formatTime(item.createdAt)}</Text>
                      {item.expired && (
                        <Tag color="red" style={{ fontSize: 11 }}>
                          已过期
                        </Tag>
                      )}
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Modal>
    </div>
  );
};

export default SystemContent;
