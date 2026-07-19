"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Spin,
  Tag,
  Typography,
  Image,
  Descriptions,
  Select,
  Button,
  Empty,
  App,
  Modal,
  Input,
} from "antd";
import {
  ReloadOutlined,
  FolderOpenOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useModalStore } from "@/app/store/explorer-modal-store";
import { parseVideoFileName } from "@/app/utils/file-utils";
import {
  computeTargetPath,
  type MediaClassifyInfo,
  type MediaCategory,
  type TvSubCategory,
} from "@/app/utils/media-library";
import {
  searchTmdbAction,
  getTmdbDetailAction,
} from "@/app/actions/tmdb-actions";
import {
  hardLinkToLibraryAction,
  getMediaLibraryBaseDirAction,
} from "@/app/actions/file-actions";

const { Text, Title, Paragraph } = Typography;

interface AnalyzeContentProps {
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
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  runtime?: number;
  number_of_seasons?: number;
  number_of_episodes?: number;
  genres?: { id: number; name: string }[];
  vote_average?: number;
  status?: string;
  tagline?: string;
  production_companies?: { id: number; name: string }[];
}

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

const AnalyzeContent = ({ modalId }: AnalyzeContentProps) => {
  const { message } = App.useApp();
  const { getModalById } = useModalStore();
  const modal = getModalById(modalId);
  const analyzeData = modal?.analyzeData;

  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<TmdbSearchResult[]>([]);
  const [selectedItem, setSelectedItem] = useState<TmdbSearchResult | null>(
    null,
  );
  const [detail, setDetail] = useState<TmdbDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [parsedInfo, setParsedInfo] = useState<{
    title: string;
    year?: string;
    season?: string;
    episode?: string;
    screen_size?: string;
    audio_codec?: string;
    source?: string;
    video_codec?: string;
    color_depth?: string;
  } | null>(null);
  const [mediaType, setMediaType] = useState<"movie" | "tv" | undefined>(
    undefined,
  );

  // 手动指定 TMDB ID
  const [manualTmdbId, setManualTmdbId] = useState("");

  // 整理弹窗状态
  const [organizeOpen, setOrganizeOpen] = useState(false);
  const [organizeLoading, setOrganizeLoading] = useState(false);
  const [organizeTarget, setOrganizeTarget] = useState<{
    category: MediaCategory | TvSubCategory;
    targetDir: string;
    fileName: string;
  } | null>(null);

  // 解析文件名
  useEffect(() => {
    if (!analyzeData?.fileName) return;
    // 去掉扩展名
    const nameWithoutExt = analyzeData.fileName.replace(/\.[^.]+$/, "");
    const parsed = parseVideoFileName(nameWithoutExt);
    setParsedInfo(parsed);

    // 根据是否有季/集信息推断类型
    if (parsed.season || parsed.episode) {
      setMediaType("tv");
    } else {
      setMediaType("movie");
    }
  }, [analyzeData]);

  // 自动搜索
  const doSearch = useCallback(async () => {
    if (!parsedInfo?.title) return;

    setLoading(true);
    try {
      const result = await searchTmdbAction(
        parsedInfo.title,
        parsedInfo.year,
        mediaType,
      );
      setSearchResults(result.results || []);

      // 如果有结果，自动选中第一个
      if (result.results && result.results.length > 0) {
        const first = result.results[0];
        setSelectedItem(first);
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
  }, [parsedInfo, mediaType, message]);

  useEffect(() => {
    if (parsedInfo) {
      doSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedInfo]);

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

  const handleSelectChange = (value: number) => {
    const item = searchResults.find((r) => r.id === value);
    if (item) {
      setSelectedItem(item);
      setDetail(null);
    }
  };

  // 手动指定 TMDB ID 获取详情
  const handleManualIdSearch = async () => {
    const id = parseInt(manualTmdbId.trim(), 10);
    if (!id || isNaN(id)) {
      message.warning("请输入有效的 TMDB ID");
      return;
    }
    const type = mediaType;
    if (!type) {
      message.warning("请先选择类型（电影/电视剧）");
      return;
    }
    setDetailLoading(true);
    try {
      const data = await getTmdbDetailAction(id, type);
      setDetail(data);
      // 构造一个 selectedItem 以便后续流程（整理等）正常工作
      setSelectedItem({
        id: data.id,
        title: data.title,
        name: data.name,
        original_title: data.original_title,
        original_name: data.original_name,
        media_type: type,
        poster_path: data.poster_path,
        release_date: data.release_date,
        first_air_date: data.first_air_date,
        vote_average: data.vote_average,
      });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "获取详情失败";
      message.error(errMsg);
    } finally {
      setDetailLoading(false);
    }
  };

  // 计算整理目标路径
  const handleComputeOrganize = async () => {
    if (!detail || !analyzeData) return;

    const currentMediaType = (selectedItem?.media_type || mediaType) as
      | "movie"
      | "tv";
    if (!currentMediaType) return;

    const baseDir = await getMediaLibraryBaseDirAction();

    // 从 parsedInfo 获取季号
    const seasonNumber = parsedInfo?.season
      ? parseInt(parsedInfo.season, 10)
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

    // 从文件名解析的技术参数
    const techInfo = parsedInfo
      ? {
          screen_size: parsedInfo.screen_size,
          audio_codec: parsedInfo.audio_codec,
          source: parsedInfo.source,
          video_codec: parsedInfo.video_codec,
          color_depth: parsedInfo.color_depth,
        }
      : undefined;

    const target = computeTargetPath(
      currentMediaType,
      info,
      baseDir,
      seasonNumber,
      techInfo,
    );
    setOrganizeTarget(target);
    setOrganizeOpen(true);
  };

  // 执行硬链接整理
  const handleExecuteOrganize = async () => {
    if (!analyzeData || !organizeTarget) return;

    setOrganizeLoading(true);
    try {
      // 文件名保留原始扩展名
      const ext = analyzeData.fileName.includes(".")
        ? "." + analyzeData.fileName.split(".").pop()
        : "";
      const newFileName = organizeTarget.fileName + ext;

      await hardLinkToLibraryAction(
        analyzeData.filePath,
        organizeTarget.targetDir,
        newFileName,
      );
      message.success("硬链接创建成功");
      setOrganizeOpen(false);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "硬链接创建失败";
      message.error(errMsg);
    } finally {
      setOrganizeLoading(false);
    }
  };

  if (!analyzeData) {
    return <Empty description="无分析数据" />;
  }

  return (
    <div
      className="p-4"
      style={{ maxHeight: "calc(70vh - 140px)", overflowY: "auto" }}
    >
      {/* 文件信息 */}
      <div className="mb-4">
        <Text type="secondary" className="text-xs">
          文件名
        </Text>
        <div className="font-medium text-sm mt-1">{analyzeData.fileName}</div>
        {parsedInfo && (
          <div className="mt-2 flex flex-wrap gap-2">
            <Tag color="blue">{parsedInfo.title}</Tag>
            {parsedInfo.year && <Tag color="green">{parsedInfo.year}</Tag>}
            {parsedInfo.season && (
              <Tag color="orange">第 {parsedInfo.season} 季</Tag>
            )}
            {parsedInfo.episode && (
              <Tag color="orange">第 {parsedInfo.episode} 集</Tag>
            )}
          </div>
        )}
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
        <Button icon={<ReloadOutlined />} onClick={doSearch} loading={loading}>
          重新搜索
        </Button>
      </div>

      {/* 搜索结果选择 */}
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
              onChange={handleSelectChange}
              style={{ width: "100%" }}
              options={searchResults.map((r) => ({
                label: `#${r.id} - ${r.title || r.name} (${r.release_date?.slice(0, 4) || r.first_air_date?.slice(0, 4) || "未知"})`,
                value: r.id,
              }))}
            />
          </div>

          <div className="mb-4">
            <Text type="secondary" className="text-xs mb-2 block">
              手动指定 TMDB ID
            </Text>
            <div className="flex gap-2">
              <Input
                value={manualTmdbId}
                onChange={(e) => setManualTmdbId(e.target.value)}
                onPressEnter={handleManualIdSearch}
                placeholder="输入 TMDB ID"
                style={{ flex: 1 }}
              />
              <Button
                icon={<SearchOutlined />}
                onClick={handleManualIdSearch}
                loading={detailLoading}
              >
                匹配
              </Button>
            </div>
          </div>

          {/* 详情展示 */}
          {detailLoading ? (
            <div className="flex justify-center py-8">
              <Spin size="large" />
            </div>
          ) : detail ? (
            <div>
              {/* 海报与基本信息 */}
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
                  {detail.tagline && (
                    <Text
                      type="secondary"
                      italic
                      className="text-xs block mb-2"
                    >
                      {detail.tagline}
                    </Text>
                  )}
                  <div className="flex flex-wrap gap-1 mb-2">
                    {detail.genres?.map((g) => (
                      <Tag key={g.id} color="processing">
                        {g.name}
                      </Tag>
                    ))}
                  </div>
                  {detail.vote_average != null && detail.vote_average > 0 && (
                    <Tag color="gold">⭐ {detail.vote_average.toFixed(1)}</Tag>
                  )}
                </div>
              </div>

              {/* 详细描述 */}
              <Descriptions
                column={1}
                size="small"
                styles={{
                  label: { width: 80, fontWeight: 500 },
                }}
              >
                {(detail.release_date || detail.first_air_date) && (
                  <Descriptions.Item label="上映日期">
                    {detail.release_date || detail.first_air_date}
                  </Descriptions.Item>
                )}
                {detail.runtime != null && (
                  <Descriptions.Item label="片长">
                    {detail.runtime} 分钟
                  </Descriptions.Item>
                )}
                {detail.number_of_seasons != null && (
                  <Descriptions.Item label="季数">
                    {detail.number_of_seasons} 季
                  </Descriptions.Item>
                )}
                {detail.number_of_episodes != null && (
                  <Descriptions.Item label="集数">
                    {detail.number_of_episodes} 集
                  </Descriptions.Item>
                )}
                {detail.status && (
                  <Descriptions.Item label="状态">
                    {detail.status}
                  </Descriptions.Item>
                )}
                {detail.production_companies &&
                  detail.production_companies.length > 0 && (
                    <Descriptions.Item label="制作公司">
                      {detail.production_companies
                        .map((c) => c.name)
                        .join(", ")}
                    </Descriptions.Item>
                  )}
              </Descriptions>

              {detail.overview && (
                <div className="mt-3">
                  <Text type="secondary" className="text-xs mb-1 block">
                    简介
                  </Text>
                  <Paragraph
                    className="text-sm"
                    ellipsis={{ rows: 4, expandable: true, symbol: "展开" }}
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
                  整理到媒体库
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

      {/* 整理确认弹窗 */}
      <Modal
        title="确认硬链接整理"
        open={organizeOpen}
        onCancel={() => setOrganizeOpen(false)}
        onOk={handleExecuteOrganize}
        confirmLoading={organizeLoading}
        okText="确认创建"
        cancelText="取消"
        destroyOnHidden
      >
        {organizeTarget && (
          <div className="py-2">
            <div className="mb-3">
              <Text type="secondary" className="text-xs block mb-1">
                分类
              </Text>
              <Tag color="blue">{organizeTarget.category}</Tag>
            </div>
            <div className="mb-3">
              <Text type="secondary" className="text-xs block mb-1">
                目标目录
              </Text>
              <Text className="text-sm break-all font-mono  p-2 rounded block">
                {organizeTarget.targetDir}
              </Text>
            </div>
            <div>
              <Text type="secondary" className="text-xs block mb-1">
                文件名
              </Text>
              <Text className="text-sm font-mono  p-2 rounded block">
                {organizeTarget.fileName}
                {analyzeData?.fileName.includes(".")
                  ? "." + analyzeData.fileName.split(".").pop()
                  : ""}
              </Text>
            </div>
            <div className="mt-3">
              <Text type="warning" className="text-xs">
                将以硬链接方式创建，原文件不会被移动或删除
              </Text>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AnalyzeContent;
