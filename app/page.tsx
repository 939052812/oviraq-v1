"use client";

import { useEffect, useRef, useState } from "react";

type GeneratedImageItem = { imageUrl?: string } | string;
type SelectOption = { label: string; value: string };

const IMAGE_PROVIDER = "xai";
const IMAGE_MODEL = "grok-imagine-image-quality";
const MODEL_LABEL = "Grok pro";
const modelOptions = [MODEL_LABEL];

const platformOptions = ["智能匹配", "淘宝", "小红书", "抖音", "拼多多", "亚马逊", "TikTok", "Temu"];
const languageOptions: SelectOption[] = [
  { label: "无文字(纯视觉)", value: "no_text" },
  { label: "中文(简体)", value: "zh" },
  { label: "中文(繁体)", value: "zh-Hant" },
  { label: "英语", value: "en" },
  { label: "日语", value: "ja" },
  { label: "韩语", value: "ko" },
  { label: "德语", value: "de" },
  { label: "法语", value: "fr" },
  { label: "意大利语", value: "it" },
  { label: "阿拉伯语", value: "ar" },
  { label: "俄语", value: "ru" },
  { label: "泰语", value: "th" },
  { label: "印尼语", value: "id" },
];
const ratioOptions = [
  "1:1 正方形",
  "2:3 竖版",
  "3:2 横版",
  "3:4 竖版",
  "4:3 横版",
  "4:5 竖版",
  "5:4 横版",
  "9:16 竖屏",
  "16:9 宽屏",
  "21:9 超宽屏",
];
const qualityOptions = ["标准", "高清", "超清"];
const API_BASE = "http://45.32.250.250:3001";

function getQuantityOptions(imageType: string): string[] {
  const max = imageType === "detail" ? 15 : 6;
  return Array.from({ length: max }, (_, index) => `${index + 1} 张`);
}

function parseAspectRatio(ratioLabel: string): string {
  const match = ratioLabel.match(/^[\d:]+/);
  return match ? match[0] : "1:1";
}

function getResultAspectClass(aspectRatio: string): string {
  if (aspectRatio === "3:4") return "aspect-[3/4]";
  if (aspectRatio === "4:3") return "aspect-[4/3]";
  if (aspectRatio === "9:16") return "aspect-[9/16]";
  if (aspectRatio === "16:9") return "aspect-[16/9]";
  return "aspect-square";
}

function mapQuality(value: string): string {
  if (value === "高清") return "high";
  if (value === "超清") return "ultra";
  return "standard";
}

function parseCount(quantityLabel: string, imageType = "main"): number {
  const match = quantityLabel.match(/\d+/);
  const count = match ? Number.parseInt(match[0], 10) : 1;
  const max = imageType === "detail" ? 15 : 6;
  return Math.min(max, Math.max(1, count));
}

function toText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return value.map(toText).filter(Boolean).join("、");
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).map(toText).filter(Boolean).join("、");
  }
  return String(value).trim();
}

function toList(value: unknown): string[] {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) return value.map(toText).filter(Boolean);
  const text = toText(value);
  return text ? [text] : [];
}

type AnalysisImagePlanItem = {
  role?: unknown;
  goal?: unknown;
  mustKeep?: unknown;
  mustAvoid?: unknown;
};

type ProductAnalysis = {
  version?: unknown;
  source?: unknown;
  category?: unknown;
  productForm?: unknown;
  styleDNA?: unknown;
  visibleStructure?: unknown;
  visibleMaterials?: unknown;
  visibleText?: unknown;
  recommendedScenes?: unknown;
  forbiddenScenes?: unknown;
  objectiveFacts?: unknown;
  factSafetyNote?: unknown;
  imagePlan?: unknown;
  request?: unknown;
  confidence?: unknown;
};

type AnalysisMeta = {
  analyzerVersion?: string;
  mode?: string;
  fileCount?: number;
  model?: string;
  note?: string;
};

function normalizeSelectOptions(options: string[] | SelectOption[]): SelectOption[] {
  return options.map((option) =>
    typeof option === "string" ? { label: option, value: option } : option
  );
}

const IMAGE_USAGE_DESCRIPTIONS: Record<string, string> = {
  主图: "适合作为商品首图，突出主体、质感与点击率。",
  场景图: "适合展示商品使用环境，强化生活方式和购买想象。",
  使用场景: "适合展示目标人群在真实场景中的使用感。",
  卖点图: "适合承接核心卖点、功能利益点和视觉记忆点。",
  细节图: "适合展示材质、纹理、工艺、图案和局部细节。",
  氛围图: "适合用于详情页过渡、社媒种草或店铺装修。",
};

const IMAGE_USAGE_TEMPLATES: Record<number, string[]> = {
  1: ["主图"],
  2: ["主图", "场景图"],
  3: ["主图", "场景图", "细节图"],
  4: ["主图", "场景图", "卖点图", "细节图"],
  5: ["主图", "场景图", "使用场景", "卖点图", "细节图"],
  6: ["主图", "场景图", "使用场景", "卖点图", "细节图", "氛围图"],
};

type ImageUsagePlanItem = {
  indexLabel: string;
  usage: string;
  description: string;
};

function getImageUsagePlan(total: number): ImageUsagePlanItem[] {
  const count = Math.max(1, Math.min(total, 12));
  const template = IMAGE_USAGE_TEMPLATES[Math.min(count, 6)] ?? IMAGE_USAGE_TEMPLATES[6];
  const usages: string[] = [];

  for (let i = 0; i < count; i += 1) {
    usages.push(i < template.length ? template[i] : "氛围图");
  }

  return usages.map((usage, index) => ({
    indexLabel: `#${String(index + 1).padStart(2, "0")}`,
    usage,
    description: IMAGE_USAGE_DESCRIPTIONS[usage] ?? "",
  }));
}

function extractImageUrls(data: {
  images?: GeneratedImageItem[];
  imageUrl?: string;
}): string[] {
  if (data.images && Array.isArray(data.images)) {
    const urls = data.images
      .map((item) => (typeof item === "string" ? item : item.imageUrl))
      .filter((url): url is string => Boolean(url));
    if (urls.length > 0) return urls;
  }
  if (data.imageUrl) return [data.imageUrl];
  return [];
}

export default function Home() {
  const [stage, setStage] = useState<"idle" | "analyzing" | "analysis" | "generating" | "results">("idle");
  const [preview, setPreview] = useState<number | null>(null);
  const [analyzingStep, setAnalyzingStep] = useState(0);
  const [imageType, setImageType] = useState("main");
  const [openSelectId, setOpenSelectId] = useState<string | null>(null);
  const [platform, setPlatform] = useState("智能匹配");
  const [language, setLanguage] = useState("no_text");
  const [model, setModel] = useState(MODEL_LABEL);
  const [selectedRatio, setSelectedRatio] = useState("1:1 正方形");
  const [quality, setQuality] = useState("标准");
  const [quantity, setQuantity] = useState("1 张");
  const [productInfo, setProductInfo] = useState("");
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [productImages, setProductImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [productAnalysis, setProductAnalysis] = useState<ProductAnalysis | null>(null);
  const [analysisMeta, setAnalysisMeta] = useState<AnalysisMeta | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const quantityOptions = getQuantityOptions(imageType);
  const productImagesKey = productImages
    .map((file) => `${file.name}-${file.size}-${file.lastModified}`)
    .join("|");

  function clearAnalysisState() {
    setProductAnalysis(null);
    setAnalysisMeta(null);
    setAnalysisError(null);
  }

  useEffect(() => {
    clearAnalysisState();
    if (stage === "analysis") {
      setStage("idle");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    productImagesKey,
    imageType,
    platform,
    productInfo,
    language,
    model,
    selectedRatio,
    quality,
    quantity,
  ]);

  useEffect(() => {
    const urls = productImages.map((file) => URL.createObjectURL(file));
    setPreviewUrls(urls);
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [productImages]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (selected.length === 0) return;

    setProductImages((prev) => {
      const remaining = 6 - prev.length;
      if (remaining <= 0) {
        alert("最多上传 6 张商品图");
        return prev;
      }
      const toAdd = selected.slice(0, remaining);
      if (selected.length > remaining) {
        alert("最多上传 6 张商品图");
      }
      return [...prev, ...toAdd];
    });
  }

  function removeProductImage(index: number) {
    setProductImages((prev) => prev.filter((_, i) => i !== index));
  }

  function buildAnalyzeFormData() {
    const aspectRatio = parseAspectRatio(selectedRatio);
    const imageCount = parseCount(quantity, imageType);
    const formData = new FormData();

    productImages.forEach((file) => {
      formData.append("images", file);
    });
    formData.append("image", productImages[0]);
    formData.append("productInfo", productInfo);
    formData.append("imageType", imageType);
    formData.append("platform", platform);
    formData.append("targetLanguage", language);
    formData.append("aspectRatio", aspectRatio);
    formData.append("imageCount", String(imageCount));

    return formData;
  }

  async function handleAnalyzeProduct() {
    if (productImages.length === 0) {
      alert("请至少上传 1 张商品图");
      return;
    }

    setIsAnalyzing(true);
    setAnalyzingStep(1);
    setAnalysisError(null);
    setStage("analyzing");

    try {
      const res = await fetch(`${API_BASE}/analyze-product`, {
        method: "POST",
        body: buildAnalyzeFormData(),
      });

      const data = await res.json();

      if (!res.ok || !data.success || !data.analysis) {
        const message =
          typeof data.error === "string"
            ? data.error
            : typeof data.message === "string"
              ? data.message
              : "产品分析失败，请稍后重试";
        setAnalysisError(message);
        setStage("idle");
        return;
      }

      setProductAnalysis(data.analysis);
      setAnalysisMeta(data.meta ?? null);
      if (data.aiError) {
        setAnalysisError(String(data.aiError));
      }
      setStage("analysis");
    } catch (error) {
      console.error(error);
      setAnalysisError("产品分析请求失败，请检查网络后重试");
      setStage("idle");
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function generateImages() {
    if (productImages.length === 0) {
      alert("请至少上传 1 张商品图");
      return;
    }

    if (!productAnalysis) {
      alert("请先完成产品分析");
      return;
    }

    setIsGenerating(true);
    setStage("generating");

    const count = parseCount(quantity, imageType);
    const aspectRatio = parseAspectRatio(selectedRatio);
    const qualityValue = mapQuality(quality);

    const formData = new FormData();
    productImages.forEach((file) => {
      formData.append("images", file);
    });
    formData.append("image", productImages[0]);
    formData.append("imageType", imageType);
    formData.append("platform", platform);
    formData.append("productInfo", productInfo);
    formData.append("targetLanguage", language);
    formData.append("provider", IMAGE_PROVIDER);
    formData.append("model", IMAGE_MODEL);
    formData.append("aspectRatio", aspectRatio);
    formData.append("quality", qualityValue);
    formData.append("count", String(count));
    formData.append("analysisPlanJson", JSON.stringify(productAnalysis));
    formData.append("analysisMetaJson", JSON.stringify(analysisMeta ?? {}));
    formData.append("analysisCategory", toText(productAnalysis.category));
    formData.append("analysisProductForm", toText(productAnalysis.productForm));
    formData.append("analysisFactSafetyNote", toText(productAnalysis.factSafetyNote));

    console.log("[Oviraq Frontend Submit]");
    console.log("imageType:", imageType);
    console.log("platform:", platform);
    console.log("targetLanguage:", language);
    console.log("model:", IMAGE_MODEL);
    console.log("aspectRatio:", aspectRatio);
    console.log("quality:", qualityValue);
    console.log("count:", count);

    try {
      const res = await fetch(`${API_BASE}/auto-generate-product`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      const urls = extractImageUrls(data);

      if (urls.length > 0) {
        setGeneratedImages(urls);
        setStage("results");
      } else {
        console.error(data.error ?? data);
        alert(typeof data.error === "string" ? data.error : "生成失败");
        setStage("analysis");
      }
    } catch (error) {
      console.error(error);
      alert("请求失败，请稍后重试");
      setStage("analysis");
    } finally {
      setIsGenerating(false);
    }
  }

  function handlePrimaryAction() {
    if (productAnalysis) {
      void generateImages();
      return;
    }
    void handleAnalyzeProduct();
  }

  const primaryButtonLabel = isGenerating
    ? "正在生成..."
    : isAnalyzing
      ? "正在分析..."
      : productAnalysis
        ? "确认生成图片"
        : "分析产品";

  useEffect(() => {
    if (stage !== "analyzing") return;

    const interval = setInterval(() => {
      setAnalyzingStep((step) => (step < 5 ? step + 1 : step));
    }, 1200);

    return () => {
      clearInterval(interval);
    };
  }, [stage]);

  useEffect(() => {
    function close(e: KeyboardEvent) {
      if (e.key === "Escape") setPreview(null);
    }
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  return (
    <main className="h-screen overflow-hidden bg-[#f7f7f8] p-5 text-black">
      <div className="flex h-full gap-5">
        <aside className="hide-scrollbar w-[360px] shrink-0 overflow-y-auto rounded-[30px] bg-white p-6 shadow-sm">
          <div className="mb-7 flex items-center gap-3">
            <svg width="46" height="46" viewBox="0 0 100 100" aria-hidden="true">
              <circle cx="50" cy="50" r="39" fill="black" />
              <rect x="45" y="5" width="10" height="90" fill="white" transform="rotate(45 50 50)" />
              <circle cx="50" cy="50" r="22" fill="white" />
            </svg>
            <div>
              <h1 className="text-2xl font-semibold">Oviraq AI</h1>
              <p className="text-xs text-black/45">AI Ecommerce Visual Director</p>
            </div>
          </div>

          <div className="mb-4 rounded-[22px] border border-black/8 p-3.5">
            <div className="mb-2.5 flex justify-between">
              <h2 className="text-sm font-semibold">产品图</h2>
              <span className="text-xs text-black/35">{productImages.length}/6</span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            {productImages.length === 0 ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex min-h-32 w-full flex-col items-center justify-center rounded-[18px] border border-dashed border-black/10 bg-[#fafafa] text-center transition-colors hover:bg-white"
              >
                <div className="mb-1.5 text-3xl text-black/25">+</div>
                <p className="text-sm text-black/45">上传清晰的产品图片</p>
                <p className="mt-0.5 text-xs text-black/30">建议只上传必要角度或 SKU 图</p>
              </button>
            ) : (
              <div className="rounded-[18px] border border-dashed border-black/10 bg-[#fafafa] p-3">
                <div className="grid grid-cols-3 gap-2">
                  {previewUrls.map((url, index) => (
                    <div
                      key={`${productImages[index]?.name}-${productImages[index]?.lastModified}-${index}`}
                      className="relative aspect-square"
                    >
                      <img
                        src={url}
                        alt={`商品图 ${index + 1}`}
                        className="h-full w-full rounded-[12px] object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeProductImage(index)}
                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white hover:bg-black/80"
                        aria-label={`删除商品图 ${index + 1}`}
                      >
                        ×
                      </button>
                      <span className="absolute bottom-1 left-1 rounded-[6px] bg-black/55 px-1.5 py-0.5 text-[10px] text-white">
                        {index === 0 ? "主参考" : "参考图"}
                      </span>
                    </div>
                  ))}
                  {productImages.length < 6 && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex aspect-square w-full flex-col items-center justify-center rounded-[12px] border border-dashed border-black/15 bg-white text-black/30 transition-colors hover:border-black/25 hover:text-black/45"
                    >
                      <span className="text-2xl">+</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="mb-4 grid grid-cols-2 rounded-full bg-[#f1f1f2] p-0.5">
            <button
              onClick={() => {
                setImageType("main");
                setQuantity((current) => {
                  const count = parseCount(current, "main");
                  return `${Math.min(count, 6)} 张`;
                });
              }}
              className={`rounded-full py-2 text-sm ${imageType === "main" ? "bg-black font-medium text-white" : "text-black/55"}`}
            >
              主图
            </button>
            <button
              onClick={() => {
                setImageType("detail");
                setQuantity((current) => {
                  const count = parseCount(current, "detail");
                  return `${Math.min(count, 15)} 张`;
                });
              }}
              className={`rounded-full py-2 text-sm ${imageType === "detail" ? "bg-black font-medium text-white" : "text-black/55"}`}
            >
              详情图
            </button>
          </div>

          <CustomSelect
            id="platform"
            label="目标平台"
            value={platform}
            options={platformOptions}
            onChange={setPlatform}
            openId={openSelectId}
            onOpenChange={setOpenSelectId}
          />

          <label className="mb-3 block">
            <span className="mb-1.5 block text-xs text-black/45">产品信息</span>
            <textarea
              className="h-28 w-full resize-none rounded-[18px] border border-black/8 bg-[#fafafa] p-3.5 text-sm outline-none transition-colors placeholder:text-black/30 hover:bg-white focus:border-black/25 focus:bg-white"
              placeholder="建议输入产品名称、卖点、目标人群、功能介绍、使用场景、其他要求..."
              value={productInfo}
              onChange={(e) => setProductInfo(e.target.value)}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <CustomSelect
              id="language"
              label="目标语言"
              value={language}
              options={languageOptions}
              onChange={setLanguage}
              openId={openSelectId}
              onOpenChange={setOpenSelectId}
            />
            <CustomSelect
              id="model"
              label="模型选择"
              value={model}
              options={modelOptions}
              onChange={setModel}
              openId={openSelectId}
              onOpenChange={setOpenSelectId}
            />
          </div>

          <CustomSelect
            id="ratio"
            label="尺寸比例"
            value={selectedRatio}
            options={ratioOptions}
            onChange={setSelectedRatio}
            openId={openSelectId}
            onOpenChange={setOpenSelectId}
          />

          <div className="grid grid-cols-2 gap-3">
            <CustomSelect
              id="quality"
              label="清晰度"
              value={quality}
              options={qualityOptions}
              onChange={setQuality}
              openId={openSelectId}
              onOpenChange={setOpenSelectId}
            />
            <CustomSelect
              id="quantity"
              label="生成数量"
              value={quantity}
              options={quantityOptions}
              onChange={setQuantity}
              openId={openSelectId}
              onOpenChange={setOpenSelectId}
            />
          </div>

          <button
            onClick={handlePrimaryAction}
            disabled={isAnalyzing || isGenerating}
            className="mt-5 h-12 w-full rounded-full bg-black text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:bg-black/40 disabled:hover:opacity-100"
          >
            {primaryButtonLabel}
          </button>
        </aside>

        <section className="min-w-0 flex-1 overflow-y-auto rounded-[30px] bg-white p-8 shadow-sm">
          {stage === "idle" && !analysisError && <EmptyState imageType={imageType} />}
          {stage === "idle" && analysisError && (
            <AnalysisError message={analysisError} onRetry={() => void handleAnalyzeProduct()} />
          )}
          {stage === "analyzing" && <Analyzing step={analyzingStep} />}
          {stage === "analysis" && productAnalysis && (
            <AnalysisPreview
              analysis={productAnalysis}
              meta={analysisMeta}
              warning={analysisError}
            />
          )}
          {stage === "generating" && <Generating />}
          {stage === "results" && (
            <Results
              images={generatedImages}
              generatedImages={generatedImages}
              modelName={MODEL_LABEL}
              aspectRatio={parseAspectRatio(selectedRatio)}
              onBack={() => setStage(productAnalysis ? "analysis" : "idle")}
              onPreview={setPreview}
            />
          )}
        </section>
      </div>

      {preview !== null && generatedImages.length > 0 && (
        <div onClick={() => setPreview(null)} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">
          <button className="absolute right-6 top-6 rounded-full bg-white/15 px-4 py-2 text-white">×</button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setPreview((preview + generatedImages.length - 1) % generatedImages.length);
            }}
            className="absolute left-6 rounded-full bg-white/15 px-4 py-3 text-white"
          >
            ‹
          </button>
          <img
            onClick={(e) => e.stopPropagation()}
            src={generatedImages[preview]}
            className="max-h-[85vh] max-w-[90vw] rounded-[28px] object-contain"
            alt=""
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              setPreview((preview + 1) % generatedImages.length);
            }}
            className="absolute right-6 rounded-full bg-white/15 px-4 py-3 text-white"
          >
            ›
          </button>
          <div className="absolute bottom-8 flex gap-3">
            <button className="rounded-full bg-white px-6 py-3 text-sm text-black">下载</button>
            <button className="rounded-full bg-white px-6 py-3 text-sm text-black">重新生成此图</button>
          </div>
        </div>
      )}
    </main>
  );
}

function CustomSelect({
  id,
  label,
  value,
  options,
  onChange,
  openId,
  onOpenChange,
}: {
  id: string;
  label: string;
  value: string;
  options: string[] | SelectOption[];
  onChange: (value: string) => void;
  openId: string | null;
  onOpenChange: (id: string | null) => void;
}) {
  const isOpen = openId === id;
  const normalizedOptions = normalizeSelectOptions(options);
  const selectedOption =
    normalizedOptions.find((option) => option.value === value) ?? normalizedOptions[0];

  return (
    <div className="relative mb-3">
      <span className="mb-1 block text-[11px] text-black/45">{label}</span>
      <button
        type="button"
        onClick={() => onOpenChange(isOpen ? null : id)}
        className="flex h-10 w-full items-center justify-between rounded-[14px] border border-black/8 bg-[#f7f7f8] px-3 text-xs transition hover:bg-white"
      >
        <span className="truncate">{selectedOption.label}</span>
        <span className={`ml-2 shrink-0 text-black/45 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M6 9L12 15L18 9"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>
      <div
        className={`hide-scrollbar absolute bottom-full z-50 mb-2 max-h-[320px] w-full overflow-y-auto rounded-[16px] border border-black/10 bg-white p-1 text-xs shadow-lg transition-all duration-200 ${
          isOpen
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none translate-y-1 scale-[0.98] opacity-0"
        }`}
      >
        {normalizedOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              onChange(option.value);
              onOpenChange(null);
            }}
            className={`flex w-full items-center gap-2 rounded-[12px] px-3 py-2.5 text-left text-xs hover:bg-[#f4f4f5] ${
              value === option.value ? "bg-[#f4f4f5]" : ""
            }`}
          >
            <span className="w-3.5 shrink-0 text-center">{value === option.value ? "✓" : ""}</span>
            <span>{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ imageType }: { imageType: string }) {
  return (
    <div className="flex h-full items-center justify-center text-center">
      <div>
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[#f3f3f4] text-4xl">✦</div>
        <h2 className="text-3xl font-semibold">
          {imageType === "main" ? "AI 商业视觉生成" : "AI 商品详情图生成"}
        </h2>
        <p className="mt-4 leading-8 text-black/45">
          上传商品图并填写需求后
          <br />
          点击「分析产品」查看 AI 分析结果，再确认生成图片
        </p>
      </div>
    </div>
  );
}

function AnalysisError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center text-center">
      <div className="w-full rounded-[24px] border border-black/10 bg-white p-8">
        <h2 className="text-2xl font-semibold">产品分析未完成</h2>
        <p className="mt-4 text-sm leading-7 text-black/55">{message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 h-11 rounded-full bg-black px-6 text-sm font-medium text-white"
        >
          重新分析
        </button>
      </div>
    </div>
  );
}

function AnalysisField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[20px] border border-black/8 bg-white p-4">
      <h3 className="text-xs font-medium text-black/45">{label}</h3>
      <div className="mt-2 text-sm leading-6 text-black/80">{children}</div>
    </div>
  );
}

function AnalysisPreview({
  analysis,
  meta,
  warning,
}: {
  analysis: ProductAnalysis;
  meta: AnalysisMeta | null;
  warning?: string | null;
}) {
  const styleDNAList = toList(analysis.styleDNA);
  const visibleStructureList = toList(analysis.visibleStructure);
  const visibleMaterialsList = toList(analysis.visibleMaterials);
  const visibleTextList = toList(analysis.visibleText);
  const recommendedScenesList = toList(analysis.recommendedScenes);
  const forbiddenScenesList = toList(analysis.forbiddenScenes);
  const imagePlanList = Array.isArray(analysis.imagePlan)
    ? (analysis.imagePlan as AnalysisImagePlanItem[])
    : [];
  const factSafetyNote = toText(analysis.factSafetyNote);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <p className="text-sm text-black/35">Oviraq AI · 产品分析</p>
        <h2 className="mt-2 text-3xl font-semibold">AI 产品分析结果</h2>
        <p className="mt-3 text-black/45">请确认分析结果后，点击左侧「确认生成图片」继续出图</p>
        {meta && (
          <div className="mt-4 flex flex-wrap gap-2">
            {meta.analyzerVersion && (
              <span className="rounded-full bg-[#f4f4f5] px-3 py-1.5 text-xs text-black/70">
                分析版本 {meta.analyzerVersion}
              </span>
            )}
            {meta.mode && (
              <span className="rounded-full bg-[#f4f4f5] px-3 py-1.5 text-xs text-black/70">
                模式 {meta.mode}
              </span>
            )}
            {typeof meta.fileCount === "number" && (
              <span className="rounded-full bg-[#f4f4f5] px-3 py-1.5 text-xs text-black/70">
                参考图 {meta.fileCount} 张
              </span>
            )}
          </div>
        )}
        {warning && (
          <div className="mt-4 rounded-[16px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {warning}
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <AnalysisField label="识别类目">{toText(analysis.category) || "—"}</AnalysisField>
        <AnalysisField label="产品形态">{toText(analysis.productForm) || "—"}</AnalysisField>
        <AnalysisField label="风格方向">
          {styleDNAList.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {styleDNAList.map((tag) => (
                <span key={tag} className="rounded-full border border-black/10 px-2.5 py-1 text-xs text-black/70">
                  {tag}
                </span>
              ))}
            </div>
          ) : (
            "—"
          )}
        </AnalysisField>
        <AnalysisField label="可见文字">
          {visibleTextList.length > 0 ? (
            <ul className="space-y-1">
              {visibleTextList.map((text) => (
                <li key={text}>{text}</li>
              ))}
            </ul>
          ) : (
            "未识别到清晰可读文字"
          )}
        </AnalysisField>
        <AnalysisField label="可见结构">
          {visibleStructureList.length > 0 ? visibleStructureList.join("、") : "—"}
        </AnalysisField>
        <AnalysisField label="可见材质">
          {visibleMaterialsList.length > 0 ? visibleMaterialsList.join("、") : "—"}
        </AnalysisField>
        <AnalysisField label="推荐场景">
          {recommendedScenesList.length > 0 ? recommendedScenesList.join("、") : "—"}
        </AnalysisField>
        <AnalysisField label="禁止场景">
          {forbiddenScenesList.length > 0 ? forbiddenScenesList.join("、") : "—"}
        </AnalysisField>
      </div>

      {factSafetyNote && (
        <div className="mt-4 rounded-[20px] border border-black/8 bg-[#fafafa] p-4">
          <h3 className="text-xs font-medium text-black/45">事实参数规则</h3>
          <p className="mt-2 text-sm leading-6 text-black/75">{factSafetyNote}</p>
        </div>
      )}

      {imagePlanList.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-3 text-sm font-semibold">图组规划</h3>
          <div className="grid gap-4">
            {imagePlanList.map((item, index) => {
              const role = toText(item.role);
              const goal = toText(item.goal);
              const mustKeep = toText(item.mustKeep);
              const mustAvoid = toText(item.mustAvoid);

              return (
                <div
                  key={`${role || "plan"}-${index}`}
                  className="rounded-[20px] border border-black/8 bg-white p-4"
                >
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">#{String(index + 1).padStart(2, "0")}</span>
                    {role && (
                      <span className="rounded-full bg-black px-2.5 py-1 text-[11px] text-white">{role}</span>
                    )}
                  </div>
                  {goal && (
                    <p className="text-sm leading-6 text-black/75">
                      <span className="text-black/45">目标：</span>
                      {goal}
                    </p>
                  )}
                  {mustKeep && (
                    <p className="mt-2 text-sm leading-6 text-black/75">
                      <span className="text-black/45">必须保留：</span>
                      {mustKeep}
                    </p>
                  )}
                  {mustAvoid && (
                    <p className="mt-2 text-sm leading-6 text-black/75">
                      <span className="text-black/45">必须避免：</span>
                      {mustAvoid}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Analyzing({ step }: { step: number }) {
  const steps = [
    "正在识别产品类型",
    "正在分析目标人群",
    "正在匹配商业摄影风格",
    "正在计算平台视觉策略",
    "正在生成视觉方案",
  ];
  const subTexts = [
    "AI 正在连接图像模型...",
    "正在计算商业摄影构图...",
    "正在优化光影与背景...",
    "正在生成高清视觉结果...",
  ];
  const dotSuffixes = ["", ".", "..", "..."];
  const [dotIndex, setDotIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);

  useEffect(() => {
    if (step !== 5) return;

    const dotInterval = setInterval(() => {
      setDotIndex((index) => (index + 1) % dotSuffixes.length);
    }, 500);

    const subInterval = setInterval(() => {
      setSubIndex((index) => (index + 1) % subTexts.length);
    }, 2000);

    return () => {
      clearInterval(dotInterval);
      clearInterval(subInterval);
    };
  }, [step]);

  return (
    <div className="flex h-full items-center justify-center">
      <div className="w-full max-w-xl">
        <p className="text-sm text-black/35">Oviraq AI · 产品分析</p>
        <h2 className="mt-2 text-3xl font-semibold">AI 正在分析商品</h2>
        <p className="mt-3 text-black/45">正在理解产品特征并匹配商业视觉策略</p>
        <div className="mt-10 space-y-5 text-lg">
          {steps.map((text, index) => {
            const stepNum = index + 1;
            if (step > stepNum) {
              return <p key={text}>✓ {text}</p>;
            }
            if (step === stepNum && stepNum === 5) {
              return (
                <div key={text}>
                  <p>• {text}{dotSuffixes[dotIndex]}</p>
                  <p className="mt-2 text-sm text-black/35">{subTexts[subIndex]}</p>
                </div>
              );
            }
            if (step === stepNum) {
              return <p key={text}>• {text}</p>;
            }
            return (
              <p key={text} className="text-black/25">
                · {text}
              </p>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Schemes({ onGenerate }: { onGenerate: () => void }) {
  const schemes = ["极简高级主图", "氛围感生活场景", "高转化卖点视觉"];
  return (
    <div>
      <p className="text-sm text-black/35">Oviraq AI · 视觉方案</p>
      <h2 className="mt-2 text-3xl font-semibold">AI 推荐视觉方案</h2>
      <p className="mt-3 text-black/45">根据商品特征、平台策略与商业摄影逻辑生成</p>

      <div className="mt-8 grid grid-cols-2 gap-5">
        {schemes.map((title, index) => (
          <div key={title} className="rounded-[28px] border border-black/10 bg-white p-4 transition hover:-translate-y-1 hover:shadow-lg">
            <div className="mb-5 h-[260px] rounded-[24px] bg-gradient-to-br from-[#f5f5f5] to-[#dededc] p-8">
              <div className="flex h-full items-center justify-center rounded-[20px] bg-white/50">
                <div className="h-24 w-36 rounded-3xl bg-black/80" />
              </div>
            </div>
            <h3 className="text-xl font-semibold">{title}</h3>
            <p className="mt-3 text-sm leading-6 text-black/55">AI 根据商品属性推荐该商业摄影方向，适合提升点击率和视觉质感。</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {["极简", "留白", "柔光", "高级感"].map((tag) => (
                <span key={tag} className="rounded-full border border-black/10 px-3 py-1 text-xs text-black/55">{tag}</span>
              ))}
            </div>
            <button onClick={onGenerate} className="mt-5 h-11 w-full rounded-full bg-black text-sm font-medium text-white">生成该方案</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Generating() {
  return (
    <div>
      <p className="text-sm text-black/35">Oviraq AI · 生成中</p>
      <h2 className="mt-2 text-3xl font-semibold">正在生成商业视觉</h2>
      <p className="mt-3 text-black/45">AI 正在根据商品特征生成商业摄影内容</p>
      <div className="mt-8 grid grid-cols-2 gap-5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-[340px] animate-pulse rounded-[28px] bg-gradient-to-br from-[#eeeeef] to-[#fafafa]" />
        ))}
      </div>
    </div>
  );
}

function resolveResultImages({
  images,
  generatedImages,
  imageUrls,
  imageUrl,
}: {
  images?: string[];
  generatedImages?: string[];
  imageUrls?: string[];
  imageUrl?: string;
}): string[] {
  if (images && images.length > 0) return images;
  if (generatedImages && generatedImages.length > 0) return generatedImages;
  if (imageUrls && imageUrls.length > 0) return imageUrls;
  if (imageUrl) return [imageUrl];
  return [];
}

function ResultImageCard({
  url,
  index,
  planItem,
  aspectClass,
  isPrimary,
  onPreview,
}: {
  url: string;
  index: number;
  planItem: ImageUsagePlanItem;
  aspectClass: string;
  isPrimary?: boolean;
  onPreview: (index: number) => void;
}) {
  return (
    <article className="w-full overflow-hidden rounded-[20px] border border-black/8 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
      <div className="border-b border-black/6 px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold tracking-wide text-black">{planItem.indexLabel}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium text-white ${
              isPrimary ? "bg-black ring-1 ring-black/15" : "bg-black/85"
            }`}
          >
            {planItem.usage}
          </span>
        </div>
        <p className="mt-1 line-clamp-2 text-xs leading-snug text-black/50">{planItem.description}</p>
      </div>

      <div className="p-3 pt-2">
        <div
          className={`group relative w-full max-h-[420px] overflow-hidden rounded-2xl bg-neutral-50 ${aspectClass}`}
        >
          <button
            type="button"
            onClick={() => onPreview(index)}
            className="block h-full w-full cursor-zoom-in text-left"
          >
            <img
              src={url}
              alt={`${planItem.usage} ${planItem.indexLabel}`}
              className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.02]"
            />
          </button>

          <button
            type="button"
            onClick={(event) => event.stopPropagation()}
            className="absolute right-2 top-2 z-10 rounded-full bg-black/70 px-2.5 py-1 text-[10px] text-white transition hover:bg-black"
          >
            重新生成
          </button>

          <div className="absolute bottom-2 right-2 z-10 flex gap-1.5">
            <button
              type="button"
              onClick={(event) => event.stopPropagation()}
              className="rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-medium text-white transition hover:bg-black"
            >
              下载
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onPreview(index);
              }}
              className="rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-medium text-white transition hover:bg-black"
            >
              放大
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function Results({
  images,
  generatedImages,
  imageUrls,
  imageUrl,
  modelName,
  aspectRatio,
  onBack,
  onPreview,
}: {
  images?: string[];
  generatedImages?: string[];
  imageUrls?: string[];
  imageUrl?: string;
  modelName: string;
  aspectRatio: string;
  onBack: () => void;
  onPreview: (i: number) => void;
}) {
  const displayImages = resolveResultImages({ images, generatedImages, imageUrls, imageUrl });
  const actualImageCount = displayImages.length || 1;
  const usagePlan = getImageUsagePlan(displayImages.length || 1);
  const aspectClass = getResultAspectClass(aspectRatio);
  const isSingleResult = displayImages.length === 1;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-black/35">Oviraq AI · 生成结果</p>
          <h2 className="mt-2 text-3xl font-semibold">商业视觉生成结果</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              `已生成 ${actualImageCount} 张`,
              `模型 ${modelName}`,
              "平台 淘宝",
              `尺寸 ${aspectRatio}`,
              "耗时 12 秒",
              "消耗 4 积分",
            ].map((item) => (
              <span
                key={item}
                className="rounded-full bg-[#f4f4f5] px-3 py-1.5 text-xs text-black/70"
              >
                {item}
              </span>
            ))}
          </div>
          <p className="mt-3 text-black/45">
            已生成 {actualImageCount} 张符合平台策略的商业视觉内容
          </p>
        </div>
        <button className="shrink-0 rounded-full bg-black px-5 py-3 text-sm text-white">再次生成</button>
      </div>

      <div className={isSingleResult ? "mt-8 max-w-[520px]" : "mt-8"}>
        <div
          className={
            isSingleResult
              ? "grid grid-cols-1 gap-5"
              : "grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3"
          }
        >
          {displayImages.map((url, index) => {
            const planItem = usagePlan[index];
            if (!planItem) return null;

            return (
              <ResultImageCard
                key={`${url}-${index}`}
                url={url}
                index={index}
                planItem={planItem}
                aspectClass={aspectClass}
                isPrimary={index === 0}
                onPreview={onPreview}
              />
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={onBack}
        className="mt-8 inline-flex h-12 w-auto max-w-[240px] items-center justify-center rounded-full border border-black/10 px-8 text-sm"
      >
        返回视觉方案
      </button>
    </div>
  );
}