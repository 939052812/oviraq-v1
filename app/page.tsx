"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type SelectOption = { label: string; value: string };
type CustomerView = Record<string, unknown>;
type ProductPlan = Record<string, unknown>;
type FrontendResultImage = Record<string, unknown>;
type FrontendResult = {
  summary?: unknown;
  images?: FrontendResultImage[];
};

const MODEL_LABEL = "Grok pro";
const modelOptions = [MODEL_LABEL];
const DISPLAY_EMPTY = "—";
const API_BASE = process.env.NEXT_PUBLIC_OVIRAQ_API_BASE || "http://45.32.250.250:3002";

const platformOptions = [
  "智能匹配",
  "淘宝",
  "天猫",
  "拼多多",
  "抖音",
  "小红书",
  "京东",
  "亚马逊",
  "Temu",
  "TikTok",
  "SHEIN",
];
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
  "9:16 竖屏",
  "16:9 宽屏",
];
const qualityOptions = ["标准", "高清", "超清"];

function getQuantityOptions(imageType: string): string[] {
  const max = imageType === "detail" ? 15 : 6;
  return Array.from({ length: max }, (_, index) => `${index + 1} 张`);
}

function parseAspectRatio(ratioLabel: string): string {
  const match = ratioLabel.match(/^[\d:]+/);
  return match ? match[0] : "1:1";
}

function getResultAspectClass(aspectRatio: string): string {
  if (aspectRatio === "2:3") return "aspect-[2/3]";
  if (aspectRatio === "3:2") return "aspect-[3/2]";
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

function normalizeSelectOptions(options: string[] | SelectOption[]): SelectOption[] {
  return options.map((option) =>
    typeof option === "string" ? { label: option, value: option } : option
  );
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function readSummaryItems(summary: unknown): string[] {
  if (summary === null || summary === undefined) return [];
  if (typeof summary === "string") return summary.trim() ? [summary.trim()] : [];
  if (Array.isArray(summary)) {
    return summary.flatMap((item) => readSummaryItems(item));
  }
  const record = asRecord(summary);
  if (!record) return [];
  return Object.values(record).flatMap((item) => readSummaryItems(item));
}

function renderCustomerContent(value: unknown): ReactNode {
  if (value === null || value === undefined) return DISPLAY_EMPTY;
  if (typeof value === "string") return value.trim() || DISPLAY_EMPTY;
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  if (Array.isArray(value)) {
    if (value.length === 0) return DISPLAY_EMPTY;
    return (
      <div className="space-y-3">
        {value.map((item, index) => (
          <div key={`item-${index}`} className="rounded-[16px] border border-black/6 bg-[#fafafa] p-3">
            {renderCustomerContent(item)}
          </div>
        ))}
      </div>
    );
  }

  const record = asRecord(value);
  if (!record) return DISPLAY_EMPTY;

  const title = readString(record.title ?? record.label ?? record.name ?? record.roleLabel);
  const body = record.content ?? record.text ?? record.description ?? record.value;

  if (title && body !== undefined && body !== null && typeof body !== "object") {
    return (
      <div>
        <p className="font-medium text-black/85">{title}</p>
        <p className="mt-1 text-sm leading-6 text-black/70">{renderCustomerContent(body)}</p>
      </div>
    );
  }

  const entries = Object.entries(record).filter(([, item]) => item !== null && item !== undefined && item !== "");
  if (entries.length === 0) return DISPLAY_EMPTY;

  return (
    <div className="space-y-2">
      {entries.map(([key, item]) => (
        <div key={key}>
          <span className="text-black/45">{key}：</span>
          <span className="text-black/80">{renderCustomerContent(item)}</span>
        </div>
      ))}
    </div>
  );
}

function unwrapApiPayload(data: Record<string, unknown>): Record<string, unknown> {
  const nested = asRecord(data.data);
  return nested ?? data;
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
  const [productImages, setProductImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [customerView, setCustomerView] = useState<CustomerView | null>(null);
  const [productPlan, setProductPlan] = useState<ProductPlan | null>(null);
  const [frontendResult, setFrontendResult] = useState<FrontendResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewImageIndex, setPreviewImageIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mainSectionRef = useRef<HTMLElement>(null);
  const generateAbortRef = useRef<AbortController | null>(null);
  const generationRequestIdRef = useRef(0);

  const quantityOptions = getQuantityOptions(imageType);
  const productImagesKey = productImages
    .map((file) => `${file.name}-${file.size}-${file.lastModified}`)
    .join("|");

  function clearAnalysisState() {
    setCustomerView(null);
    setProductPlan(null);
    setFrontendResult(null);
    setAnalysisError(null);
    setGenerationError(null);
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
    setPreviewImageIndex((current) => {
      if (current === null) return null;
      if (current === index) return null;
      if (current > index) return current - 1;
      return current;
    });
  }

  function handleBackFromAnalysis() {
    setStage("idle");
  }

  function handleBackToAnalysis() {
    if (customerView) {
      setStage("analysis");
    }
  }

  function handleCancelGenerate() {
    generationRequestIdRef.current += 1;
    generateAbortRef.current?.abort();
    generateAbortRef.current = null;
    setIsGenerating(false);
    setStage(customerView ? "analysis" : "idle");
  }

  function handleNewProject() {
    generationRequestIdRef.current += 1;
    generateAbortRef.current?.abort();
    generateAbortRef.current = null;

    setStage("idle");
    setPreview(null);
    setPreviewImageIndex(null);
    setAnalyzingStep(0);
    setImageType("main");
    setOpenSelectId(null);
    setPlatform("智能匹配");
    setLanguage("no_text");
    setModel(MODEL_LABEL);
    setSelectedRatio("1:1 正方形");
    setQuality("标准");
    setQuantity("3 张");
    setProductInfo("");
    setProductImages([]);
    clearAnalysisState();
    setIsAnalyzing(false);
    setIsGenerating(false);

    window.scrollTo({ top: 0, behavior: "smooth" });
    mainSectionRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }

  function buildAnalyzeFormData() {
    const aspectRatio = parseAspectRatio(selectedRatio);
    const formData = new FormData();

    productImages.forEach((file) => {
      formData.append("images", file);
    });
    formData.append("requirements", productInfo);
    formData.append("count", String(parseCount(quantity, imageType)));
    formData.append("imageType", imageType);
    formData.append("platform", platform);
    formData.append("targetLanguage", language);
    formData.append("aspectRatio", aspectRatio);
    formData.append("quality", mapQuality(quality));

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
    setGenerationError(null);
    setStage("analyzing");

    try {
      const res = await fetch(`${API_BASE}/analyze-product`, {
        method: "POST",
        body: buildAnalyzeFormData(),
      });

      const data = (await res.json()) as Record<string, unknown>;
      const payload = unwrapApiPayload(data);
      const nextCustomerView = asRecord(payload.customerView);
      const nextProductPlan = asRecord(payload.plan);

      if (!res.ok || data.success === false || !nextCustomerView || !nextProductPlan) {
        const message =
          readString(data.error) ||
          readString(data.message) ||
          readString(payload.error) ||
          "产品分析失败，请稍后重试";
        setAnalysisError(message);
        setStage("idle");
        return;
      }

      setCustomerView(nextCustomerView);
      setProductPlan(nextProductPlan);
      if (readString(data.aiError)) {
        setAnalysisError(readString(data.aiError));
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

    if (!productPlan) {
      alert("请先完成产品分析");
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    setStage("generating");

    const requestId = generationRequestIdRef.current + 1;
    generationRequestIdRef.current = requestId;
    const abortController = new AbortController();
    generateAbortRef.current = abortController;

    const formData = buildAnalyzeFormData();
    formData.append("productPlanJson", JSON.stringify(productPlan));
    formData.append("realRun", "true");

    try {
      const res = await fetch(`${API_BASE}/generate`, {
        method: "POST",
        body: formData,
        signal: abortController.signal,
      });

      if (generationRequestIdRef.current !== requestId) return;

      const data = (await res.json()) as Record<string, unknown>;
      const payload = unwrapApiPayload(data);
      const nextFrontendResult = asRecord(payload.frontendResult) as FrontendResult | null;

      if (generationRequestIdRef.current !== requestId) return;

      if (!res.ok || data.success === false || !nextFrontendResult) {
        const message =
          readString(data.error) ||
          readString(data.message) ||
          readString(payload.error) ||
          "生成失败，请稍后重试";
        setGenerationError(message);
        alert(message);
        setStage("analysis");
        return;
      }

      setFrontendResult(nextFrontendResult);
      setStage("results");
    } catch (error) {
      if (abortController.signal.aborted || generationRequestIdRef.current !== requestId) return;
      console.error(error);
      const message = "请求失败，请稍后重试";
      setGenerationError(message);
      alert(message);
      setStage("analysis");
    } finally {
      if (generationRequestIdRef.current === requestId) {
        setIsGenerating(false);
        generateAbortRef.current = null;
      }
    }
  }

  const primaryButtonLabel = isGenerating
    ? "正在生成..."
    : isAnalyzing
      ? "正在分析..."
      : customerView
        ? "重新分析产品"
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
      if (e.key === "Escape") {
        setPreview(null);
        setPreviewImageIndex(null);
      }
    }
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  const resultImages = Array.isArray(frontendResult?.images) ? frontendResult.images : [];

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
                      <button
                        type="button"
                        onClick={() => setPreviewImageIndex(index)}
                        className="group relative block h-full w-full cursor-pointer overflow-hidden rounded-[12px] text-left"
                      >
                        <img
                          src={url}
                          alt={`商品图 ${index + 1}`}
                          className="h-full w-full rounded-[12px] object-cover transition duration-200 group-hover:scale-[1.04] group-hover:shadow-md"
                        />
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-[12px] border border-transparent transition duration-200 group-hover:border-black/15 group-hover:bg-black/35">
                          <span className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-medium text-black opacity-0 transition duration-200 group-hover:opacity-100">
                            点击预览
                          </span>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          removeProductImage(index);
                        }}
                        className="absolute right-1 top-1 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white hover:bg-black/80"
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

          <div className="mt-5 space-y-3">
            {stage === "results" ? (
              <>
                <button
                  type="button"
                  onClick={handleNewProject}
                  className="h-12 w-full rounded-full bg-black text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  新建项目
                </button>
                <button
                  type="button"
                  onClick={handleBackToAnalysis}
                  className="h-12 w-full rounded-full border border-black/10 bg-[#fafafa] text-sm transition-colors hover:bg-white"
                >
                  返回视觉方案
                </button>
              </>
            ) : stage === "analysis" ? (
              <>
                <button
                  type="button"
                  onClick={() => void generateImages()}
                  disabled={isGenerating}
                  className="h-12 w-full rounded-full bg-black text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:bg-black/40 disabled:hover:opacity-100"
                >
                  确认生成图片
                </button>
                <button
                  type="button"
                  onClick={handleBackFromAnalysis}
                  className="h-12 w-full rounded-full border border-black/10 bg-[#fafafa] text-sm transition-colors hover:bg-white"
                >
                  返回上一步
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => void handleAnalyzeProduct()}
                disabled={isAnalyzing || isGenerating}
                className="h-12 w-full rounded-full bg-black text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:bg-black/40 disabled:hover:opacity-100"
              >
                {primaryButtonLabel}
              </button>
            )}
          </div>
        </aside>

        <section ref={mainSectionRef} className="min-w-0 flex-1 overflow-y-auto rounded-[30px] bg-white p-8 shadow-sm">
          {stage === "idle" && !analysisError && <EmptyState imageType={imageType} />}
          {stage === "idle" && analysisError && (
            <AnalysisError message={analysisError} onRetry={() => void handleAnalyzeProduct()} />
          )}
          {stage === "analyzing" && <Analyzing step={analyzingStep} />}
          {stage === "analysis" && customerView && (
            <CustomerViewPreview
              customerView={customerView}
              productPlan={productPlan}
              warning={analysisError}
            />
          )}
          {stage === "generating" && <Generating onCancel={handleCancelGenerate} />}
          {stage === "results" && frontendResult && (
            <Results
              frontendResult={frontendResult}
              aspectRatio={parseAspectRatio(selectedRatio)}
              onRegenerate={() => void generateImages()}
              onPreview={setPreview}
            />
          )}
          {generationError && stage === "analysis" && (
            <div className="mt-4 rounded-[16px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {generationError}
            </div>
          )}
        </section>
      </div>

      {previewImageIndex !== null && previewUrls.length > 0 && (
        <div
          onClick={() => setPreviewImageIndex(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md"
        >
          <button
            type="button"
            onClick={() => setPreviewImageIndex(null)}
            className="absolute right-6 top-6 rounded-full bg-white/15 px-4 py-2 text-white"
          >
            ×
          </button>
          {previewUrls.length > 1 && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setPreviewImageIndex(
                  (previewImageIndex + previewUrls.length - 1) % previewUrls.length
                );
              }}
              className="absolute left-6 rounded-full bg-white/15 px-4 py-3 text-white"
            >
              ‹
            </button>
          )}
          <img
            onClick={(event) => event.stopPropagation()}
            src={previewUrls[previewImageIndex]}
            className="max-h-[85vh] max-w-[90vw] rounded-[28px] object-contain"
            alt={`商品图 ${previewImageIndex + 1}`}
          />
          {previewUrls.length > 1 && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setPreviewImageIndex((previewImageIndex + 1) % previewUrls.length);
              }}
              className="absolute right-6 rounded-full bg-white/15 px-4 py-3 text-white"
            >
              ›
            </button>
          )}
        </div>
      )}

      {preview !== null && resultImages.length > 0 && readString(resultImages[preview]?.imageUrl) && (
        <div onClick={() => setPreview(null)} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">
          <button className="absolute right-6 top-6 rounded-full bg-white/15 px-4 py-2 text-white">×</button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setPreview((preview + resultImages.length - 1) % resultImages.length);
            }}
            className="absolute left-6 rounded-full bg-white/15 px-4 py-3 text-white"
          >
            ‹
          </button>
          <img
            onClick={(e) => e.stopPropagation()}
            src={readString(resultImages[preview]?.imageUrl)}
            className="max-h-[85vh] max-w-[90vw] rounded-[28px] object-contain"
            alt=""
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              setPreview((preview + 1) % resultImages.length);
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
  children: ReactNode;
}) {
  return (
    <div className="rounded-[20px] border border-black/8 bg-white p-4">
      <h3 className="text-xs font-medium text-black/45">{label}</h3>
      <div className="mt-2 text-sm leading-6 text-black/80">{children}</div>
    </div>
  );
}

function AnalysisSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="mt-6">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </div>
  );
}

function getCustomerIntentDisplayView(
  productPlan: ProductPlan | null | undefined
): Record<string, unknown> | null {
  if (!productPlan) return null;
  const customerIntent = asRecord(productPlan.customerIntent);
  if (!customerIntent) return null;
  return asRecord(customerIntent.displayView);
}

function readStringList(value: unknown): string[] {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item !== "string") return [];
    const trimmed = item.trim();
    return trimmed ? [trimmed] : [];
  });
}

function readDisplaySections(displayView: Record<string, unknown>): Record<string, unknown>[] {
  if (!Array.isArray(displayView.sections)) return [];
  return displayView.sections
    .map((section) => asRecord(section))
    .filter((section): section is Record<string, unknown> => section !== null);
}

function CustomerIntentDisplayView({ productPlan }: { productPlan: ProductPlan | null }) {
  const displayView = getCustomerIntentDisplayView(productPlan);
  if (!displayView) return null;

  const summaryItems = readStringList(displayView.summary);
  const sections = readDisplaySections(displayView);
  if (summaryItems.length === 0 && sections.length === 0) return null;

  return (
    <AnalysisSection title="客户输入理解">
      <div className="space-y-4 md:col-span-2">
        <p className="text-xs leading-5 text-black/35">
          这部分只用于分析确认，不直接参与生图指令。真正进入生图前，仍需要统一成最终生成合同。
        </p>
        {summaryItems.length > 0 && (
          <AnalysisField label="摘要">
            <ul className="list-disc space-y-1 pl-4">
              {summaryItems.map((item, index) => (
                <li key={`customer-intent-summary-${index}`}>{item}</li>
              ))}
            </ul>
          </AnalysisField>
        )}
        {sections.map((section, index) => {
          const title = readString(section.title ?? section.label ?? section.name);
          const items = readStringList(section.items);
          const label = title || `理解项 ${index + 1}`;

          return (
            <AnalysisField key={`customer-intent-section-${index}`} label={label}>
              {items.length > 0 ? (
                <ul className="list-disc space-y-1 pl-4">
                  {items.map((item, itemIndex) => (
                    <li key={`customer-intent-item-${index}-${itemIndex}`}>{item}</li>
                  ))}
                </ul>
              ) : (
                DISPLAY_EMPTY
              )}
            </AnalysisField>
          );
        })}
      </div>
    </AnalysisSection>
  );
}

function CustomerViewPreview({
  customerView,
  productPlan,
  warning,
}: {
  customerView: CustomerView;
  productPlan?: ProductPlan | null;
  warning?: string | null;
}) {
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <p className="text-sm text-black/35">Oviraq AI · 视觉导演</p>
        <h2 className="mt-2 text-3xl font-semibold">AI 电商视觉导演方案</h2>
        <p className="mt-3 text-black/45">请确认导演方案后，点击左侧「确认生成图片」继续出图</p>
        {warning && (
          <div className="mt-4 rounded-[16px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {warning}
          </div>
        )}
      </div>

      <AnalysisSection title="产品摘要">
        <div className="md:col-span-2">
          <AnalysisField label="产品摘要">{renderCustomerContent(customerView.productSummary)}</AnalysisField>
        </div>
      </AnalysisSection>

      <AnalysisSection title="视觉方向">
        <div className="md:col-span-2">
          <AnalysisField label="视觉方向">{renderCustomerContent(customerView.visualDirection)}</AnalysisField>
        </div>
      </AnalysisSection>

      <AnalysisSection title="图组规划">
        <div className="md:col-span-2">
          <AnalysisField label="图组规划">{renderCustomerContent(customerView.imagePlan)}</AnalysisField>
        </div>
      </AnalysisSection>

      <AnalysisSection title="事实安全">
        <div className="md:col-span-2">
          <AnalysisField label="事实安全">{renderCustomerContent(customerView.factSafety)}</AnalysisField>
        </div>
      </AnalysisSection>

      <CustomerIntentDisplayView productPlan={productPlan ?? null} />
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
                  <p>
                    • {text}
                    {dotSuffixes[dotIndex]}
                  </p>
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

function Generating({ onCancel }: { onCancel: () => void }) {
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
      <button
        type="button"
        onClick={onCancel}
        className="mt-8 inline-flex h-12 items-center justify-center rounded-full border border-black/10 px-8 text-sm"
      >
        取消生成
      </button>
    </div>
  );
}

function ResultImageCard({
  image,
  index,
  aspectClass,
  onPreview,
}: {
  image: FrontendResultImage;
  index: number;
  aspectClass: string;
  onPreview: (index: number) => void;
}) {
  const imageUrl = readString(image.imageUrl);
  const status = readString(image.status).toLowerCase();
  const isPreviewPlaceholder = !imageUrl && status === "preview";
  const title =
    readString(image.title) ||
    readString(image.roleLabel) ||
    readString(image.role) ||
    readString(image.name) ||
    `图片 ${index + 1}`;
  const description =
    readString(image.description) || readString(image.goal) || readString(image.summary) || "";
  const indexLabel = `#${String(index + 1).padStart(2, "0")}`;

  return (
    <article className="w-full overflow-hidden rounded-[20px] border border-black/8 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
      <div className="border-b border-black/6 px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold tracking-wide text-black">
            {indexLabel} {title}
          </span>
        </div>
        {description && (
          <p className="mt-1 line-clamp-2 text-xs leading-snug text-black/50">{description}</p>
        )}
      </div>

      <div className="p-3 pt-2">
        <div
          className={`group relative w-full max-h-[420px] overflow-hidden rounded-2xl bg-neutral-50 ${aspectClass}`}
        >
          {isPreviewPlaceholder ? (
            <div className="flex h-full min-h-[280px] flex-col items-center justify-center bg-[#ececee] px-6 text-center">
              <p className="text-sm font-medium text-black/55">预览任务，尚未真实出图</p>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onPreview(index)}
              className="block h-full w-full cursor-zoom-in text-left"
            >
              <img
                src={imageUrl}
                alt={`${title} ${indexLabel}`}
                className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.02]"
              />
            </button>
          )}

          {!isPreviewPlaceholder && (
            <>
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
            </>
          )}
        </div>
      </div>
    </article>
  );
}

function Results({
  frontendResult,
  aspectRatio,
  onRegenerate,
  onPreview,
}: {
  frontendResult: FrontendResult;
  aspectRatio: string;
  onRegenerate: () => void;
  onPreview: (i: number) => void;
}) {
  const images = Array.isArray(frontendResult.images) ? frontendResult.images : [];
  const summaryItems = readSummaryItems(frontendResult.summary);
  const aspectClass = getResultAspectClass(aspectRatio);
  const isSingleResult = images.length === 1;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-black/35">Oviraq AI · 生成结果</p>
          <h2 className="mt-2 text-3xl font-semibold">商业视觉生成结果</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {summaryItems.map((item) => (
              <span key={item} className="rounded-full bg-[#f4f4f5] px-3 py-1.5 text-xs text-black/70">
                {item}
              </span>
            ))}
            <span className="rounded-full bg-[#f4f4f5] px-3 py-1.5 text-xs text-black/70">
              已生成 {images.length} 张
            </span>
            <span className="rounded-full bg-[#f4f4f5] px-3 py-1.5 text-xs text-black/70">
              尺寸 {aspectRatio}
            </span>
          </div>
          <p className="mt-3 text-black/45">已生成 {images.length} 张符合平台策略的商业视觉内容</p>
        </div>
        <button
          type="button"
          onClick={onRegenerate}
          className="shrink-0 rounded-full bg-black px-5 py-3 text-sm text-white"
        >
          再次生成
        </button>
      </div>

      <div className={isSingleResult ? "mt-8 max-w-[520px]" : "mt-8"}>
        <div
          className={
            isSingleResult
              ? "grid grid-cols-1 gap-5"
              : "grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3"
          }
        >
          {images.map((image, index) => (
            <ResultImageCard
              key={`result-${index}`}
              image={image}
              index={index}
              aspectClass={aspectClass}
              onPreview={onPreview}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
