"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Spin,
  Tag,
  Typography,
  Image,
  Select,
  Button,
  Empty,
  App,
  Modal,
  Input,
} from "antd";
import {
  ReloadOutlined,
  SettingOutlined,
  FolderOpenOutlined,
} from "@ant-design/icons";
import { useModalStore } from "@/app/store/explorer-modal-store";
import { parseVideoFileName } from "@/app/utils/file-utils";
import {
  computeTargetPath,
  classifyMedia,
  buildTargetFileNameWithEpisode,
  type MediaClassifyInfo,
  type MediaCategory,
  type TvSubCategory,
  type MediaTechInfo,
} from "@/app/utils/media-library";
import {
  searchTmdbAction,
  getTmdbDetailAction,
  getTmdbConfigAction,
  saveTmdbApiKeyAction,
} from "@/app/actions/tmdb-actions";
import {
  scanDirectoryMediaAction,
  batchHardLinkAction,
  getMediaLibraryBaseDirAction,
} from "@/app/actions/file-actions";

const { Text, Title, Paragraph } = Typography;

interface BatchAnalyzeContentProps {
  modalId: string;
}

interface TmdbSearchResult {
  id: number;
  name?: string;
  title?: string;
  original_name?: string;
  original_title?: string;
  overview?: string;
  poster_path?: string | null;
  first_air_date?: string;
  release_date?: string;
  vote_average?: number;
  media_type?: string;
}

interface TmdbDetail {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  original_language?: string;
  origin_country?: string[];
  overview?: string;
  poster_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  genres?: { id: number; name: string }[];
  vote_average?: number;
  number_of_seasons?: number;
  number_of_episodes?: number;
}

interface MediaFile {
  name: string;
  path: string;
  parsed: ReturnType<typeof parseVideoFileName>;
}

interface HardLinkTarget {
  sourcePath: string;
  sourceName: string;
  targetDir: string;
  newFileName: string;
}

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

const BatchAnalyzeContent = ({ modalId }: BatchAnalyzeContentProps) => {
  const { message } = App.useApp();
  const { getModalById } = useModalStore();
  const modal = getModalById(modalId);
  const batchData = modal?.batchAnalyzeData;

  const [scanning, setScanning] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [selectedFileIdx, setSelectedFileIdx] = useState<number | undefined>(
    undefined,
  );
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<TmdbSearchResult[]>([]);
  const [selectedItem, setSelectedItem] = useState<TmdbSearchResult | null>(
    null,
  );
  const [detail, setDetail] = useState<TmdbDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [mediaType, setMediaType] = useState<"movie" | "tv" | undefined>(
    undefined,
  );

  // TMDB 设置弹窗
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [apiKey, setApiKey] = useState("");

  // 整理确认弹窗
  const [organizeOpen, setOrganizeOpen] = useState(false);
  const [organizeLoading, setOrganizeLoading] = useState(false);
  const [targets, setTargets] = useState<HardLinkTarget[]>([]);
  const [category, setCategory] = useState<MediaCategory | TvSubCategory>("其他");

  // 扫描目录
  useEffect(() => {
    if (!batchData?.dirPath) return;

    const scan = async () => {
      setScanning(true);
      try {
        const files = await scanDirectoryMediaAction(batchData.dirPath);
        const parsed = files.map((f) => {
          const nameWithoutExt = f.name.replace(/\.[^.]+$/, "");
          return { ...f, parsed: parseVideoFileName(nameWithoutExt) };
        });
        setMediaFiles(parsed);

        // 自动推断类型
        const hasSeason = parsed.some(
          (f) => f.parsed.season || f.parsed.episode,
        );
        setMediaType(hasSeason ? "tv" : "movie");

        // 自动选择一个包含集数信息的文件用于识别
        const idx = parsed.findIndex(
          (f) => f.parsed.episode && !f.parsed.episode.startsWith("CM") && !f.parsed.episode.startsWith("SP") && !f.parsed.episode.startsWith("NC"),
        );
        if (idx >= 0) {
          setSelectedFileIdx(idx);
        } else if (parsed.length > 0) {
          setSelectedFileIdx(0);
        }
      } catch (error) {
        message.error("扫描目录失败");
      } finally {
        setScanning(false);
      }
    };

    scan();
  }, [batchData]);

  // 搜索 TMDB
  const doSearch = useCallback(async () => {
    if (selectedFileIdx == null || !mediaFiles[selectedFileIdx]) return;

    const file = mediaFiles[selectedFileIdx];
    setLoading(true);
    try {
      const result = await searchTmdbAction(
        file.parsed.title,
        file.parsed.year,
        mediaType,
      );
      setSearchResults(result.results || []);

      if (result.results && result.results.length > 0) {
        setSelectedItem(result.results[0]);
      } else {
        setSelectedItem(null);
        setDetail(null);
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "搜索失败";
      message.error(errMsg);
    } finally {
      setLoading(false);
    }
  }, [selectedFileIdx, mediaFiles, mediaType, message]);

  useEffect(() => {
    if (selectedFileIdx != null && mediaFiles.length > 0) {
      doSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFileIdx, mediaFiles]);

  // 获取详情
  useEffect(() => {
    if (!selectedItem) return;

    const type = (selectedItem.media_type || mediaType) as "movie" | "tv";
    if (!type) return;

    const fetchDetail = async () => {
      setDetailLoading(true);
      try {
        const data = await getTmdbDetailAction(selectedItem.id, type);
        setDetail(data);
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : "获取详情失败";
        message.error(errMsg);
      } finally {
        setDetailLoading(false);
      }
    };

    fetchDetail();
  }, [selectedItem, mediaType, message]);

  // 打开设置
  const handleOpenSettings = async () => {
    setSettingsOpen(true);
    try {
      const config = await getTmdbConfigAction();
      setApiKey(config.apiKey);
    } catch {
      setApiKey("");
    }
  };

  // 保存 API Key
  const handleSaveApiKey = async () => {
    setSettingsLoading(true);
    try {
      await saveTmdbApiKeyAction(apiKey);
      message.success("TMDB API Key 已保存");
      setSettingsOpen(false);
    } catch {
      message.error("保存失败");
    } finally {
      setSettingsLoading(false);
    }
  };

  // 计算所有硬链接目标
  const handleComputeOrganize = async () => {
    if (!detail || mediaFiles.length === 0) return;

    const currentMediaType = (selectedItem?.media_type || mediaType) as
      | "movie"
      | "tv";
    if (!currentMediaType) return;

    const baseDir = await getMediaLibraryBaseDirAction();

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
      vote_average: detail.vote_average,
    };

    // 使用第一个文件计算分类和目标目录
    const firstParsed = mediaFiles[0].parsed;
    const seasonNumber = firstParsed.season
      ? parseInt(firstParsed.season, 10)
      : undefined;

    const cat = classifyMedia(currentMediaType, info);
    setCategory(cat);

    // 为每个文件计算目标
    const linkTargets: HardLinkTarget[] = mediaFiles.map((file) => {
      const techInfo: MediaTechInfo = {
        screen_size: file.parsed.screen_size,
        audio_codec: file.parsed.audio_codec,
        source: file.parsed.source,
        video_codec: file.parsed.video_codec,
        color_depth: file.parsed.color_depth,
      };

      const ext = file.name.includes(".")
        ? "." + file.name.split(".").pop()
        : "";

      if (currentMediaType === "tv") {
        const fileSeason = file.parsed.season
          ? parseInt(file.parsed.season, 10)
          : seasonNumber;

        // 构建集数标签
        let episodeTag: string | undefined;
        if (file.parsed.episode) {
          const epNum = file.parsed.episode;
          episodeTag = `E${epNum.padStart(2, "0")}`;
        }

        const fileName = buildTargetFileNameWithEpisode(
          info,
          episodeTag,
          techInfo,
        );

        // 计算目标目录
        const { targetDir } = computeTargetPath(
          currentMediaType,
          info,
          baseDir,
          fileSeason,
          techInfo,
        );

        return {
          sourcePath: file.path,
          sourceName: file.name,
          targetDir,
          newFileName: fileName + ext,
        };
      } else {
        const { targetDir } = computeTargetPath(
          currentMediaType,
          info,
          baseDir,
          undefined,
          techInfo,
        );

        const fileName = buildTargetFileNameWithEpisode(info, undefined, techInfo);
        return {
          sourcePath: file.path,
          sourceName: file.name,
          targetDir,
          newFileName: fileName + ext,
        };
      }
    });

    setTargets(linkTargets);
    setOrganizeOpen(true);
  };

  // 执行批量硬链接
  const handleExecuteOrganize = async () => {
    setOrganizeLoading(true);
    try {
      const result = await batchHardLinkAction(targets);
      const successCount = result.results.filter((r) => r.success).length;
      const failCount = result.results.length - successCount;

      if (failCount === 0) {
        message.success(`全部 ${successCount} 个硬链接创建成功`);
        setOrganizeOpen(false);
      } else {
        message.warning(`成功 ${successCount} 个，失败 ${failCount} 个`);
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "操作失败";
      message.error(errMsg);
    } finally {
      setOrganizeLoading(false);
    }
  };

  if (!batchData) {
    return <Empty description="无数据" />;
  }

  return (
    <div
      className="p-4"
      style={{ flex: 1, minHeight: 0, overflowY: "auto" }}
    >
      {/* 目录信息 */}
      <div className="mb-4">
        <Text type="secondary" className="text-xs">
          目录
        </Text>
        <div className="font-medium text-sm mt-1">{batchData.dirName}</div>
      </div>

      {scanning ? (
        <div className="flex justify-center py-8">
          <Spin tip="扫描目录中..." />
        </div>
      ) : mediaFiles.length === 0 ? (
        <Empty description="未找到视频文件" />
      ) : (
        <>
          {/* 文件列表 */}
          <div className="mb-4">
            <Text type="secondary" className="text-xs mb-2 block">
              找到 {mediaFiles.length} 个视频文件，选择一个用于识别剧集
            </Text>
            <Select
              value={selectedFileIdx}
              onChange={(v) => setSelectedFileIdx(v)}
              style={{ width: "100%" }}
              placeholder="选择识别文件"
              options={mediaFiles.map((f, idx) => ({
                label: f.name,
                value: idx,
              }))}
            />
          </div>

          {/* 搜索控制 */}
          <div className="flex items-center gap-2 mb-4">
            <Select
              value={mediaType}
              onChange={(v) => setMediaType(v)}
              style={{ width: 100 }}
              options={[
                { label: "电影", value: "movie" },
                { label: "电视剧", value: "tv" },
              ]}
              placeholder="类型"
            />
            <Button
              icon={<ReloadOutlined />}
              onClick={doSearch}
              loading={loading}
            >
              重新搜索
            </Button>
            <Button icon={<SettingOutlined />} onClick={handleOpenSettings}>
              设置
            </Button>
          </div>

          {/* 搜索结果 */}
          {loading ? (
            <div className="flex justify-center py-8">
              <Spin size="large" />
            </div>
          ) : searchResults.length > 0 ? (
            <>
              <div className="mb-4">
                <Text type="secondary" className="text-xs mb-2 block">
                  选择匹配结果
                </Text>
                <Select
                  value={selectedItem?.id}
                  onChange={(v) => {
                    const item = searchResults.find((r) => r.id === v);
                    if (item) {
                      setSelectedItem(item);
                      setDetail(null);
                    }
                  }}
                  style={{ width: "100%" }}
                  options={searchResults.map((r) => ({
                    label: `${r.title || r.name} (${r.release_date?.slice(0, 4) || r.first_air_date?.slice(0, 4) || "未知"})`,
                    value: r.id,
                  }))}
                />
              </div>

              {/* 详情 */}
              {detailLoading ? (
                <div className="flex justify-center py-8">
                  <Spin size="large" />
                </div>
              ) : detail ? (
                <div>
                  <div className="flex gap-4 mb-4">
                    {detail.poster_path && (
                      <Image
                        src={`${TMDB_IMAGE_BASE}/w200${detail.poster_path}`}
                        alt={detail.title || detail.name}
                        width={120}
                        style={{ borderRadius: 8 }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <Title level={5} className="mt-0 mb-1">
                        <a
                          href={`https://www.themoviedb.org/${selectedItem?.media_type || mediaType}/${detail.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-blue-500 transition-colors"
                        >
                          {detail.title || detail.name}
                        </a>
                      </Title>
                      {(detail.original_title || detail.original_name) && (
                        <Text type="secondary" className="text-xs block mb-2">
                          {detail.original_title || detail.original_name}
                        </Text>
                      )}
                      <div className="flex flex-wrap gap-1 mb-2">
                        {detail.genres?.map((g) => (
                          <Tag key={g.id} color="processing">
                            {g.name}
                          </Tag>
                        ))}
                      </div>
                      {detail.vote_average != null &&
                        detail.vote_average > 0 && (
                          <Tag color="gold">
                            ⭐ {detail.vote_average.toFixed(1)}
                          </Tag>
                        )}
                    </div>
                  </div>

                  {detail.overview && (
                    <div className="mb-3">
                      <Paragraph
                        className="text-sm"
                        ellipsis={{ rows: 3, expandable: true, symbol: "展开" }}
                      >
                        {detail.overview}
                      </Paragraph>
                    </div>
                  )}

                  {/* 整理按钮 */}
                  <div className="mt-4 flex justify-end">
                    <Button
                      type="primary"
                      icon={<FolderOpenOutlined />}
                      onClick={handleComputeOrganize}
                    >
                      整理到媒体库 ({mediaFiles.length} 个文件)
                    </Button>
                  </div>
                </div>
              ) : (
                <Empty description="选择结果以查看详情" />
              )}
            </>
          ) : (
            <Empty description="未找到匹配结果，请尝试重新搜索" />
          )}
        </>
      )}

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

      {/* 整理确认弹窗 */}
      <Modal
        title="确认批量硬链接整理"
        open={organizeOpen}
        onCancel={() => setOrganizeOpen(false)}
        onOk={handleExecuteOrganize}
        confirmLoading={organizeLoading}
        okText="确认创建"
        cancelText="取消"
        destroyOnHidden
        width={640}
      >
        <div className="py-2">
          <div className="mb-3">
            <Text type="secondary" className="text-xs block mb-1">
              分类
            </Text>
            <Tag color="blue">{category}</Tag>
          </div>
          <div className="mb-3">
            <Text type="secondary" className="text-xs block mb-1">
              目标文件 ({targets.length} 个)
            </Text>
            <div
              style={{
                maxHeight: 300,
                overflowY: "auto",
                border: "1px solid #f0f0f0",
                borderRadius: 6,
                padding: 8,
              }}
            >
              {targets.map((t, idx) => (
                <div
                  key={idx}
                  className="mb-2 pb-2 border-b border-gray-100 last:border-b-0 last:mb-0 last:pb-0"
                >
                  <Text className="text-xs block text-gray-400 mb-1">
                    {t.sourceName}
                  </Text>
                  <Text className="text-xs block font-mono">
                    → {t.targetDir}/{t.newFileName}
                  </Text>
                </div>
              ))}
            </div>
          </div>
          <div>
            <Text type="warning" className="text-xs">
              将以硬链接方式创建，原文件不会被移动或删除
            </Text>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default BatchAnalyzeContent;
