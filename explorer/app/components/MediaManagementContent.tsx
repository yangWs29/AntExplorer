"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Tree,
  Button,
  Tag,
  Typography,
  Input,
  Spin,
  Empty,
  App,
  Card,
  Divider,
  Modal,
  Popconfirm,
  List,
  Layout,
  Breadcrumb,
  theme,
} from "antd";
import type { DataNode } from "antd/es/tree";
import {
  FolderOutlined,
  FolderOpenOutlined,
  SwapOutlined,
  LinkOutlined,
  DeleteOutlined,
  EditOutlined,
  SearchOutlined,
  SettingOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import { useModalStore } from "@/app/store/explorer-modal-store";
import {
  readDirectory,
  getDirectoryTree,
  getSubDirectories,
  findHardLinks,
  deleteFiles,
  renameFileAction,
  hardLinkToLibraryAction,
  getMediaLibraryBaseDirAction,
} from "@/app/actions/file-actions";
import {
  searchTmdbAction,
  getTmdbDetailAction,
  getTmdbConfigAction,
  saveTmdbApiKeyAction,
} from "@/app/actions/tmdb-actions";
import {
  computeTargetPath,
  type MediaClassifyInfo,
  type MediaCategory,
  type TvSubCategory,
} from "@/app/utils/media-library";
import { parseVideoFileName, isVideoFile } from "@/app/utils/file-utils";

const { Text } = Typography;
const { Sider, Content, Footer } = Layout;

interface MediaManagementContentProps {
  modalId: string;
}

interface MediaFileItem {
  name: string;
  path: string;
  size?: number;
  isDirectory: boolean;
  parsed?: ReturnType<typeof parseVideoFileName>;
}

const MediaManagementContent = ({ modalId }: MediaManagementContentProps) => {
  const { message } = App.useApp();
  const { getModalById, openAnalyzeModal, openBatchAnalyzeModal } =
    useModalStore();
  const modal = getModalById(modalId);
  const rootDir = modal?.mediaManagementData?.rootDir || "/";

  // 目录树状态
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const [loadedKeys, setLoadedKeys] = useState<Set<string>>(new Set());
  const [selectedDir, setSelectedDir] = useState<string>(rootDir);
  const [treeLoading, setTreeLoading] = useState(false);

  // 文件列表状态
  const [files, setFiles] = useState<MediaFileItem[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);

  // 硬链接查询弹窗
  const [hardLinkModalOpen, setHardLinkModalOpen] = useState(false);
  const [hardLinks, setHardLinks] = useState<string[]>([]);
  const [hardLinkLoading, setHardLinkLoading] = useState(false);
  const [hardLinkSource, setHardLinkSource] = useState<string>("");

  // 重命名弹窗
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renameLoading, setRenameLoading] = useState(false);
  const [renameTarget, setRenameTarget] = useState<MediaFileItem | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // 转移（整理到媒体库）弹窗
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferTarget, setTransferTarget] = useState<{
    category: MediaCategory | TvSubCategory;
    targetDir: string;
    fileName: string;
  } | null>(null);
  const [transferSource, setTransferSource] = useState<MediaFileItem | null>(
    null,
  );

  // TMDB 设置
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [apiKey, setApiKey] = useState("");

  // 加载目录树
  useEffect(() => {
    const loadTree = async () => {
      setTreeLoading(true);
      try {
        const tree = await getDirectoryTree(rootDir);
        setTreeData(
          tree.map((item) => ({
            title: item.name,
            key: item.path,
            isLeaf: false,
          })),
        );
      } catch (error) {
        console.error("加载目录树失败:", error);
      } finally {
        setTreeLoading(false);
      }
    };
    loadTree();
  }, [rootDir]);

  // 懒加载子目录
  const onLoadData = async (node: DataNode) => {
    const key = node.key as string;
    if (loadedKeys.has(key)) return Promise.resolve();

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
        console.error("加载子目录失败:", error);
      }
      resolve();
    });
  };

  // 加载目录文件
  const loadFiles = useCallback(async (dirPath: string) => {
    setFilesLoading(true);
    try {
      const items = await readDirectory(dirPath);
      const videoFiles = items
        .filter((f) => !f.isDirectory && isVideoFile(f.name))
        .map((f) => {
          const nameWithoutExt = f.name.replace(/\.[^.]+$/, "");
          return {
            ...f,
            parsed: parseVideoFileName(nameWithoutExt),
          };
        });
      setFiles(videoFiles);
    } catch (error) {
      console.error("加载文件列表失败:", error);
    } finally {
      setFilesLoading(false);
    }
  }, []);

  // 选择目录时加载文件
  useEffect(() => {
    if (selectedDir) {
      loadFiles(selectedDir);
    }
  }, [selectedDir, loadFiles]);

  // 格式化文件大小
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    if (bytes < 1024 * 1024 * 1024)
      return (bytes / (1024 * 1024)).toFixed(2) + " MB";
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
  };

  // 构建议标签
  const buildTags = (file: MediaFileItem) => {
    const tags: { label: string; color: string }[] = [];
    const parsed = file.parsed;
    if (!parsed) return tags;

    // 分辨率
    if (parsed.screen_size) {
      tags.push({ label: parsed.screen_size, color: "blue" });
    }
    // 视频编码
    if (parsed.video_codec) {
      tags.push({ label: parsed.video_codec.toUpperCase(), color: "purple" });
    }
    // 音频编码
    if (parsed.audio_codec) {
      tags.push({ label: parsed.audio_codec, color: "cyan" });
    }
    // 来源
    if (parsed.source) {
      tags.push({ label: parsed.source, color: "green" });
    }
    // 季集
    if (parsed.season) {
      tags.push({
        label: `S${parsed.season.padStart(2, "0")}`,
        color: "orange",
      });
    }
    if (parsed.episode) {
      tags.push({
        label: `E${parsed.episode.padStart(2, "0")}`,
        color: "orange",
      });
    }

    return tags;
  };

  // 识别：打开分析弹窗
  const handleAnalyze = (file: MediaFileItem) => {
    openAnalyzeModal({ fileName: file.name, filePath: file.path });
  };

  // 转移：自动搜索 TMDB 并弹出整理确认弹窗
  const handleTransfer = async (file: MediaFileItem) => {
    const parsed = file.parsed;
    if (!parsed?.title) {
      message.warning("无法解析文件名");
      return;
    }

    // 推断媒体类型
    const mediaType: "movie" | "tv" =
      parsed.season || parsed.episode ? "tv" : "movie";

    setTransferLoading(true);
    try {
      // 搜索 TMDB
      const result = await searchTmdbAction(
        parsed.title,
        parsed.year,
        mediaType,
      );
      const results = result.results || [];
      if (results.length === 0) {
        message.warning("未找到匹配的 TMDB 结果，请先点击「识别」");
        setTransferLoading(false);
        return;
      }

      // 取第一个结果获取详情
      const first = results[0];
      const detail = await getTmdbDetailAction(
        first.id,
        (first.media_type || mediaType) as "movie" | "tv",
      );

      // 计算目标路径
      const baseDir = await getMediaLibraryBaseDirAction();
      const seasonNumber = parsed.season
        ? parseInt(parsed.season, 10)
        : undefined;

      const info: MediaClassifyInfo = {
        title: detail.title,
        name: detail.name,
        original_title: detail.original_title,
        original_name: detail.original_name,
        original_language: detail.original_language,
        origin_country: detail.origin_country,
        release_date: detail.release_date,
        first_air_date: detail.first_air_date,
        genres: detail.genres,
        runtime: detail.runtime,
        vote_average: detail.vote_average,
        production_companies: detail.production_companies,
      };

      const techInfo = parsed
        ? {
            screen_size: parsed.screen_size,
            audio_codec: parsed.audio_codec,
            source: parsed.source,
            video_codec: parsed.video_codec,
            color_depth: parsed.color_depth,
          }
        : undefined;

      const target = computeTargetPath(
        (first.media_type || mediaType) as "movie" | "tv",
        info,
        baseDir,
        seasonNumber,
        techInfo,
      );

      setTransferTarget(target);
      setTransferSource(file);
      setTransferModalOpen(true);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "转移操作失败";
      message.error(errMsg);
    } finally {
      setTransferLoading(false);
    }
  };

  // 执行转移（创建硬链接）
  const handleExecuteTransfer = async () => {
    if (!transferSource || !transferTarget) return;
    setTransferLoading(true);
    try {
      const ext = transferSource.name.includes(".")
        ? "." + transferSource.name.split(".").pop()
        : "";
      const newFileName = transferTarget.fileName + ext;
      await hardLinkToLibraryAction(
        transferSource.path,
        transferTarget.targetDir,
        newFileName,
      );
      message.success("硬链接创建成功");
      setTransferModalOpen(false);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "硬链接创建失败";
      message.error(errMsg);
    } finally {
      setTransferLoading(false);
    }
  };

  // 硬链接查询
  const handleQueryHardLinks = async (file: MediaFileItem) => {
    setHardLinkSource(file.path);
    setHardLinkModalOpen(true);
    setHardLinkLoading(true);
    try {
      const links = await findHardLinks(file.path, rootDir);
      // 排除自身
      setHardLinks(links.filter((l) => l !== file.path));
    } catch (error) {
      message.error("查询硬链接失败");
      setHardLinks([]);
    } finally {
      setHardLinkLoading(false);
    }
  };

  // 删除硬链接
  const handleDeleteHardLink = async (linkPath: string) => {
    try {
      await deleteFiles([linkPath]);
      message.success("硬链接已删除");
      setHardLinks((prev) => prev.filter((l) => l !== linkPath));
    } catch (error) {
      message.error("删除硬链接失败");
    }
  };

  // 重命名
  const handleOpenRename = (file: MediaFileItem) => {
    setRenameTarget(file);
    setRenameValue(file.name);
    setRenameModalOpen(true);
  };

  const handleExecuteRename = async () => {
    if (!renameTarget || !renameValue.trim()) return;
    setRenameLoading(true);
    try {
      await renameFileAction(renameTarget.path, renameValue.trim());
      message.success("重命名成功");
      setRenameModalOpen(false);
      // 刷新文件列表
      loadFiles(selectedDir);
    } catch (error) {
      message.error("重命名失败");
    } finally {
      setRenameLoading(false);
    }
  };

  // 删除文件
  const handleDeleteFile = async (file: MediaFileItem) => {
    try {
      await deleteFiles([file.path]);
      message.success("删除成功");
      loadFiles(selectedDir);
    } catch (error) {
      message.error("删除失败");
    }
  };

  // TMDB 设置
  const handleOpenSettings = async () => {
    setSettingsOpen(true);
    try {
      const config = await getTmdbConfigAction();
      setApiKey(config.apiKey);
    } catch {
      setApiKey("");
    }
  };

  const handleSaveApiKey = async () => {
    setSettingsLoading(true);
    try {
      await saveTmdbApiKeyAction(apiKey);
      message.success("TMDB API Key 已保存");
      setSettingsOpen(false);
    } catch (error) {
      message.error("保存失败");
    } finally {
      setSettingsLoading(false);
    }
  };

  const {
    token: { colorBgContainer, colorSplit },
  } = theme.useToken();

  return (
    <Layout
      className="mt-1"
      style={{ flex: 1, minHeight: 0, overflow: "hidden" }}
    >
      {/* 上部：左右分栏 */}
      <Layout style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        {/* 左侧：上下分区 */}
        <Sider
          width={280}
          style={{
            borderRight: `1px solid ${colorSplit}`,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            background: colorBgContainer,
          }}
        >
          {/* 左侧：目录树 */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* 目录树 */}
            <div className="flex-1 overflow-y-auto" style={{ padding: 8 }}>
              <Spin spinning={treeLoading}>
                <Tree
                  treeData={treeData}
                  loadData={onLoadData}
                  selectedKeys={[selectedDir]}
                  onSelect={(keys) => {
                    if (keys.length > 0) {
                      setSelectedDir(keys[0] as string);
                    }
                  }}
                  defaultExpandAll={false}
                  showLine
                  switcherIcon={({ expanded }) =>
                    expanded ? <FolderOpenOutlined /> : <FolderOutlined />
                  }
                  styles={{
                    root: {
                      fontSize: 13,
                      background: "transparent",
                    },
                  }}
                />
              </Spin>
            </div>
          </div>
        </Sider>

        {/* 右侧：文件列表 */}
        <Content
          className="flex flex-col overflow-hidden"
          style={{
            background: colorBgContainer,
          }}
        >
          {/* 顶部工具栏 */}
          <div
            className="flex items-center justify-between"
            style={{
              padding: "12px 16px",
              borderBottom: `1px solid ${colorSplit}`,
            }}
          >
            <div style={{ display: "flex", gap: 8 }}>
              <Button
                icon={<SwapOutlined />}
                size="small"
                onClick={() => {
                  const dirName = selectedDir.split("/").pop() || selectedDir;
                  openBatchAnalyzeModal({
                    dirPath: selectedDir,
                    dirName,
                  });
                }}
              >
                转移目录
              </Button>
              <Button icon={<LinkOutlined />} size="small">
                所有硬链接
              </Button>
            </div>
          </div>

          {/* 文件列表 */}
          <div className="flex-1 overflow-y-auto" style={{ padding: 16 }}>
            {filesLoading ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  padding: 48,
                }}
              >
                <Spin size="large" />
              </div>
            ) : files.length === 0 ? (
              <Empty description="该目录下没有视频文件" />
            ) : (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {files.map((file) => (
                  <Card
                    key={file.path}
                    size="small"
                    styles={{
                      body: { padding: "12px 16px" },
                    }}
                  >
                    {/* 标题 */}
                    <div style={{ marginBottom: 8 }}>
                      <Text
                        strong
                        style={{ fontSize: 14 }}
                        className="break-all"
                      >
                        {file.name}
                      </Text>
                    </div>

                    {/* 标签 + 文件大小 */}
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 4,
                        marginBottom: 8,
                        alignItems: "center",
                      }}
                    >
                      {buildTags(file).map((tag, idx) => (
                        <Tag key={idx} color={tag.color}>
                          {tag.label}
                        </Tag>
                      ))}
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {file.size != null ? formatSize(file.size) : "-"}
                      </Text>
                    </div>

                    <Divider style={{ margin: "8px 0" }} />

                    {/* 操作按钮 */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      <Button
                        size="small"
                        icon={<SearchOutlined />}
                        onClick={() => handleAnalyze(file)}
                      >
                        识别
                      </Button>
                      <Button
                        size="small"
                        icon={<SwapOutlined />}
                        onClick={() => handleTransfer(file)}
                      >
                        转移
                      </Button>
                      <Button
                        size="small"
                        icon={<LinkOutlined />}
                        onClick={() => handleQueryHardLinks(file)}
                      >
                        硬链接查询
                      </Button>
                      <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => handleOpenRename(file)}
                      >
                        重命名
                      </Button>
                      <Popconfirm
                        title="确认删除"
                        description={`确定要删除 "${file.name}" 吗？`}
                        onConfirm={() => handleDeleteFile(file)}
                        okText="删除"
                        cancelText="取消"
                        okButtonProps={{ danger: true }}
                      >
                        <Button size="small" danger icon={<DeleteOutlined />}>
                          删除
                        </Button>
                      </Popconfirm>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </Content>
      </Layout>

      {/* 底部 */}
      <Footer
        style={{
          flex: "none",
          padding: "4px 16px",
          borderTop: `1px solid ${colorSplit}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: colorBgContainer,
          flexShrink: 0,
        }}
      >
        <Button
          type="text"
          size="small"
          icon={<SettingOutlined />}
          onClick={handleOpenSettings}
        />
        <Breadcrumb
          style={{ fontSize: 12 }}
          items={(() => {
            const relativePath = selectedDir.startsWith(rootDir)
              ? selectedDir.substring(rootDir.length).replace(/^\//, "")
              : "";
            const segments = relativePath
              ? relativePath.split("/").filter(Boolean)
              : [];
            const crumbs: { title: React.ReactNode; path: string }[] = [
              { title: <HomeOutlined />, path: rootDir },
            ];
            let accumulated = rootDir.endsWith("/") ? rootDir : rootDir + "/";
            for (const seg of segments) {
              accumulated += seg + "/";
              crumbs.push({ title: seg, path: accumulated });
            }
            return crumbs.map((item, idx) => ({
              title:
                idx < crumbs.length - 1 ? (
                  <a
                    onClick={() => setSelectedDir(item.path.replace(/\/$/, ""))}
                  >
                    {item.title}
                  </a>
                ) : (
                  item.title
                ),
            }));
          })()}
        />
        <Text type="secondary" style={{ fontSize: 12 }}>
          {files.length} 个视频文件
        </Text>
      </Footer>

      {/* TMDB 设置弹窗 */}
      <Modal
        title="TMDB 配置"
        open={settingsOpen}
        onCancel={() => setSettingsOpen(false)}
        onOk={handleSaveApiKey}
        confirmLoading={settingsLoading}
        okText="保存"
        cancelText="取消"
        destroyOnHidden
      >
        <div className="py-2">
          <div className="mb-3">
            <Text type="secondary" className="text-xs">
              API Key
            </Text>
            <Input.Password
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="请输入 TMDB API Key"
              className="mt-1"
            />
          </div>
          <Text type="secondary" className="text-xs">
            可前往{" "}
            <a
              href="https://www.themoviedb.org/settings/api"
              target="_blank"
              rel="noopener noreferrer"
            >
              TMDB 官网
            </a>{" "}
            申请 API Key
          </Text>
        </div>
      </Modal>

      {/* 硬链接查询弹窗 */}
      <Modal
        title="硬链接列表"
        open={hardLinkModalOpen}
        onCancel={() => setHardLinkModalOpen(false)}
        footer={null}
        width={600}
        destroyOnHidden
      >
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            源文件：{hardLinkSource}
          </Text>
        </div>
        {hardLinkLoading ? (
          <div style={{ textAlign: "center", padding: 24 }}>
            <Spin />
          </div>
        ) : hardLinks.length === 0 ? (
          <Empty description="未找到硬链接" />
        ) : (
          <List
            size="small"
            dataSource={hardLinks}
            renderItem={(link) => (
              <List.Item
                actions={[
                  <Popconfirm
                    key="del"
                    title="确认删除此硬链接？"
                    onConfirm={() => handleDeleteHardLink(link)}
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
                <Text
                  style={{ fontSize: 13 }}
                  className="break-all"
                  ellipsis={{ tooltip: link }}
                >
                  {link}
                </Text>
              </List.Item>
            )}
          />
        )}
      </Modal>

      {/* 转移确认弹窗 */}
      <Modal
        title="确认硬链接整理"
        open={transferModalOpen}
        onCancel={() => setTransferModalOpen(false)}
        onOk={handleExecuteTransfer}
        confirmLoading={transferLoading}
        okText="确认创建"
        cancelText="取消"
        destroyOnHidden
      >
        {transferTarget && transferSource && (
          <div style={{ padding: "8px 0" }}>
            <div style={{ marginBottom: 12 }}>
              <Text
                type="secondary"
                style={{ fontSize: 12, display: "block", marginBottom: 4 }}
              >
                分类
              </Text>
              <Tag color="blue">{transferTarget.category}</Tag>
            </div>
            <div style={{ marginBottom: 12 }}>
              <Text
                type="secondary"
                style={{ fontSize: 12, display: "block", marginBottom: 4 }}
              >
                目标目录
              </Text>
              <Text
                className="break-all"
                style={{
                  fontSize: 13,
                  fontFamily: "monospace",
                  display: "block",
                  padding: "4px 8px",
                  borderRadius: 4,
                }}
              >
                {transferTarget.targetDir}
              </Text>
            </div>
            <div>
              <Text
                type="secondary"
                style={{ fontSize: 12, display: "block", marginBottom: 4 }}
              >
                文件名
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "monospace",
                  display: "block",
                  padding: "4px 8px",
                  borderRadius: 4,
                }}
              >
                {transferTarget.fileName}
                {transferSource.name.includes(".")
                  ? "." + transferSource.name.split(".").pop()
                  : ""}
              </Text>
            </div>
            <div style={{ marginTop: 12 }}>
              <Text type="warning" style={{ fontSize: 12 }}>
                将以硬链接方式创建，原文件不会被移动或删除
              </Text>
            </div>
          </div>
        )}
      </Modal>

      {/* 重命名弹窗 */}
      <Modal
        title="重命名"
        open={renameModalOpen}
        onCancel={() => setRenameModalOpen(false)}
        onOk={handleExecuteRename}
        confirmLoading={renameLoading}
        okText="确认"
        cancelText="取消"
        destroyOnHidden
      >
        <div style={{ padding: "12px 0" }}>
          <Text
            type="secondary"
            style={{ fontSize: 12, display: "block", marginBottom: 8 }}
          >
            新文件名
          </Text>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onPressEnter={handleExecuteRename}
            placeholder="请输入新文件名"
          />
        </div>
      </Modal>
    </Layout>
  );
};

export default MediaManagementContent;
