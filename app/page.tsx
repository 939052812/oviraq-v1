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
  "9:16 竖屏",
  "16:9 宽屏",
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

function toText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return value.map(toText).filter(Boolean).join("、");
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const preferredKeys = [
      "label",
      "name",
      "title",
      "roleLabel",
      "roleName",
      "role",
      "goal",
      "sceneDescription",
      "sceneType",
      "sceneIntent",
    ];
    for (const key of preferredKeys) {
      if (key in obj) {
        const text = toText(obj[key]);
        if (text) return text;
      }
    }
    const joined = Object.values(obj).map(toText).filter(Boolean).join("、");
    if (joined) return joined;
    try {
      const json = JSON.stringify(obj);
      return json.length > 120 ? `${json.slice(0, 117)}...` : json;
    } catch {
      return "";
    }
  }
  return String(value).trim();
}

function toList(value: unknown): string[] {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) return value.map(toText).filter(Boolean);
  const text = toText(value);
  return text ? [text] : [];
}

function visibleTextToList(value: unknown): string[] {
  return toList(value);
}

function pickSection(plan: unknown, key: string): Record<string, unknown> {
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) return {};
  const section = (plan as Record<string, unknown>)[key];
  if (!section || typeof section !== "object" || Array.isArray(section)) return {};
  return section as Record<string, unknown>;
}

function pickNestedSection(plan: unknown, ...keys: string[]): Record<string, unknown> {
  let current: unknown = plan;
  for (const key of keys) {
    current = pickSection(current, key);
  }
  return (current ?? {}) as Record<string, unknown>;
}

function formatObjectStates(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) return toText(value);
  return Object.entries(value as Record<string, unknown>)
    .map(([key, item]) => {
      const text = toText(item);
      return text ? `${key}: ${text}` : "";
    })
    .filter(Boolean)
    .join("；");
}

type DirectorPlan = Record<string, unknown>;

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
  directorVersion?: string;
  directorSchema?: string;
  legacyCompatible?: boolean;
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

function getFallbackUsageLabel(index: number): string {
  if (index === 0) return "主图";
  if (index === 1) return "场景图";
  if (index === 2) return "细节图";
  return "图片";
}

function extractDirectorPlanFromUnknown(source: unknown): DirectorPlan | null {
  if (!source || typeof source !== "object") return null;
  const obj = source as Record<string, unknown>;

  if (Array.isArray(obj.imagePlan) || obj.productIdentity || obj.styleDirection) {
    return obj as DirectorPlan;
  }

  const nestedKeys = ["directorPlan", "analysisPlan", "ProductAnalysisPlan"];
  for (const key of nestedKeys) {
    const nested = obj[key];
    if (!nested || typeof nested !== "object" || Array.isArray(nested)) continue;

    const nestedObj = nested as Record<string, unknown>;
    if (Array.isArray(nestedObj.imagePlan) || nestedObj.productIdentity || nestedObj.styleDirection) {
      return nestedObj as DirectorPlan;
    }

    const deeper = nestedObj.directorPlan;
    if (deeper && typeof deeper === "object" && !Array.isArray(deeper)) {
      return deeper as DirectorPlan;
    }
  }

  return null;
}

function resolveActiveDirectorPlan(
  directorPlan: DirectorPlan | null,
  productAnalysis: ProductAnalysis | null
): DirectorPlan | null {
  return (
    extractDirectorPlanFromUnknown(directorPlan) ||
    extractDirectorPlanFromUnknown(productAnalysis) ||
    null
  );
}

function pickImagePlanItem(plan: DirectorPlan | null, index: number): Record<string, unknown> | null {
  if (!plan) return null;
  const imagePlan = plan.imagePlan;
  if (!Array.isArray(imagePlan)) return null;
  const item = imagePlan[index];
  if (!item || typeof item !== "object" || Array.isArray(item)) return null;
  return item as Record<string, unknown>;
}

type ResultCardDisplay = {
  indexLabel: string;
  title: string;
  badge: string;
  description: string;
};

function getResultCardDisplay(
  index: number,
  activeDirectorPlan: DirectorPlan | null
): ResultCardDisplay {
  const indexLabel = `#${String(index + 1).padStart(2, "0")}`;
  const fallbackUsage = getFallbackUsageLabel(index);
  const fallbackPlan = getImageUsagePlan(index + 1)[index];

  const imagePlanItem = pickImagePlanItem(activeDirectorPlan, index);
  if (!imagePlanItem) {
    return {
      indexLabel,
      title: fallbackPlan?.usage || fallbackUsage,
      badge: fallbackPlan?.usage || fallbackUsage,
      description: fallbackPlan?.description || IMAGE_USAGE_DESCRIPTIONS[fallbackUsage] || "",
    };
  }

  const title =
    toText(imagePlanItem.roleLabel) ||
    toText(imagePlanItem.title) ||
    toText(imagePlanItem.roleName) ||
    toText(imagePlanItem.role) ||
    fallbackPlan?.usage ||
    fallbackUsage;

  const roleText = toText(imagePlanItem.role);
  const roleLabelText = toText(imagePlanItem.roleLabel);
  const badge = roleText || (roleLabelText !== title ? roleLabelText : "") || title;

  const productFocus = pickSection(imagePlanItem, "productFocus");
  const description =
    toText(imagePlanItem.goal) ||
    toText(imagePlanItem.sceneIntent) ||
    toText(productFocus) ||
    toList(productFocus.focusPoints).join("、") ||
    toText(imagePlanItem.focusPoints) ||
    fallbackPlan?.description ||
    IMAGE_USAGE_DESCRIPTIONS[fallbackUsage] ||
    "";

  return {
    indexLabel,
    title,
    badge,
    description,
  };
}

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
  const [directorPlan, setDirectorPlan] = useState<DirectorPlan | null>(null);
  const [analysisMeta, setAnalysisMeta] = useState<AnalysisMeta | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
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
    setProductAnalysis(null);
    setDirectorPlan(null);
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

  function handleBackToAnalysisPlan() {
    if (productAnalysis || directorPlan) {
      setStage("analysis");
    }
  }

  function handleCancelGenerate() {
    generationRequestIdRef.current += 1;
    generateAbortRef.current?.abort();
    generateAbortRef.current = null;
    setIsGenerating(false);
    if (productAnalysis || directorPlan) {
      setStage("analysis");
    } else {
      setStage("idle");
    }
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
    setGeneratedImages([]);
    setProductImages([]);
    clearAnalysisState();
    setIsAnalyzing(false);
    setIsGenerating(false);

    window.scrollTo({ top: 0, behavior: "smooth" });
    mainSectionRef.current?.scrollTo({ top: 0, behavior: "smooth" });
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
      const legacyAnalysis = data.analysis || data.legacyAnalysis || null;
      const nextDirectorPlan = data.directorPlan || data.analysisPlan || null;

      if (!res.ok || !data.success || !legacyAnalysis) {
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

      setProductAnalysis(legacyAnalysis);
      setDirectorPlan(nextDirectorPlan);
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

    if (!productAnalysis && !directorPlan) {
      alert("请先完成产品分析");
      return;
    }

    setIsGenerating(true);
    setStage("generating");

    const requestId = generationRequestIdRef.current + 1;
    generationRequestIdRef.current = requestId;
    const abortController = new AbortController();
    generateAbortRef.current = abortController;

    const count = parseCount(quantity, imageType);
    const aspectRatio = parseAspectRatio(selectedRatio);
    const qualityValue = mapQuality(quality);
    const confirmedAnalysisPlan = directorPlan || productAnalysis;
    const confirmedIdentity = pickSection(confirmedAnalysisPlan, "productIdentity");
    const confirmedFactSafety = pickSection(confirmedAnalysisPlan, "factSafety");
    const legacyAnalysis = productAnalysis as ProductAnalysis | null;

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
    formData.append("analysisPlanJson", JSON.stringify(confirmedAnalysisPlan || {}));
    formData.append("analysisMetaJson", JSON.stringify(analysisMeta || {}));
    formData.append(
      "analysisCategory",
      toText(confirmedIdentity.category) || toText(legacyAnalysis?.category) || ""
    );
    formData.append(
      "analysisProductForm",
      toText(confirmedIdentity.productForm) || toText(legacyAnalysis?.productForm) || ""
    );
    formData.append(
      "analysisFactSafetyNote",
      toText(confirmedFactSafety.factSafetyNote) || toText(legacyAnalysis?.factSafetyNote) || ""
    );

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
        signal: abortController.signal,
      });

      if (generationRequestIdRef.current !== requestId) return;

      const data = await res.json();
      const urls = extractImageUrls(data);

      if (generationRequestIdRef.current !== requestId) return;

      if (urls.length > 0) {
        setGeneratedImages(urls);
        setStage("results");
      } else {
        console.error(data.error ?? data);
        alert(typeof data.error === "string" ? data.error : "生成失败");
        setStage("analysis");
      }
    } catch (error) {
      if (abortController.signal.aborted || generationRequestIdRef.current !== requestId) return;
      console.error(error);
      alert("请求失败，请稍后重试");
      setStage("analysis");
    } finally {
      if (generationRequestIdRef.current === requestId) {
        setIsGenerating(false);
        generateAbortRef.current = null;
      }
    }
  }

  function handlePrimaryAction() {
    void handleAnalyzeProduct();
  }

  const primaryButtonLabel = isGenerating
    ? "正在生成..."
    : isAnalyzing
      ? "正在分析..."
      : productAnalysis || directorPlan
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
                  onClick={handleBackToAnalysisPlan}
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
                onClick={handlePrimaryAction}
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
          {stage === "analysis" && (productAnalysis || directorPlan) && (
            <AnalysisPreview
              analysis={productAnalysis}
              directorPlan={directorPlan}
              meta={analysisMeta}
              warning={analysisError}
            />
          )}
          {stage === "generating" && <Generating onCancel={handleCancelGenerate} />}
          {stage === "results" && (
            <Results
              images={generatedImages}
              generatedImages={generatedImages}
              modelName={MODEL_LABEL}
              aspectRatio={parseAspectRatio(selectedRatio)}
              directorPlan={directorPlan}
              productAnalysis={productAnalysis}
              onRegenerate={() => void generateImages()}
              onPreview={setPreview}
            />
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

function AnalysisSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-6">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </div>
  );
}

function TagList({ items }: { items: string[] }) {
  if (items.length === 0) return <>—</>;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((tag) => (
        <span key={tag} className="rounded-full border border-black/10 px-2.5 py-1 text-xs text-black/70">
          {tag}
        </span>
      ))}
    </div>
  );
}

function AnalysisMetaBadges({ meta }: { meta: AnalysisMeta | null }) {
  if (!meta) return null;

  const badges = [
    meta.directorVersion ? `导演版本 ${meta.directorVersion}` : null,
    meta.directorSchema ? `方案结构 ${meta.directorSchema}` : null,
    meta.analyzerVersion ? `分析版本 ${meta.analyzerVersion}` : null,
    meta.mode ? `模式 ${meta.mode}` : null,
    typeof meta.fileCount === "number" ? `参考图 ${meta.fileCount} 张` : null,
    meta.legacyCompatible ? "兼容旧版分析" : null,
  ].filter(Boolean) as string[];

  if (badges.length === 0) return null;

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {badges.map((item) => (
        <span key={item} className="rounded-full bg-[#f4f4f5] px-3 py-1.5 text-xs text-black/70">
          {item}
        </span>
      ))}
    </div>
  );
}

function LegacyAnalysisPreview({
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
  const visibleTextList = visibleTextToList(analysis.visibleText);
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
        <AnalysisMetaBadges meta={meta} />
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
          <TagList items={styleDNAList} />
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

function DirectorImagePlanCard({ item, index }: { item: Record<string, unknown>; index: number }) {
  const sceneIntent = pickSection(item, "sceneIntent");
  const composition = pickSection(item, "composition");
  const productFocus = pickSection(item, "productFocus");
  const planIndex = toText(item.index) || String(index + 1).padStart(2, "0");
  const roleLabel = toText(item.roleLabel);
  const role = toText(item.role);
  const goal = toText(item.goal);
  const renderMode = toText(item.renderMode);
  const layoutType = toText(item.layoutType);
  const stateControl = formatObjectStates(item.stateControl);
  const mustKeep = toText(productFocus.mustKeep);
  const mustAvoid = toText(productFocus.mustAvoid);
  const focusPoints = toList(productFocus.focusPoints);

  return (
    <div className="rounded-[20px] border border-black/8 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">#{planIndex.padStart(2, "0")}</span>
        {roleLabel && (
          <span className="rounded-full bg-black px-2.5 py-1 text-[11px] text-white">{roleLabel}</span>
        )}
        {role && role !== roleLabel && (
          <span className="rounded-full border border-black/10 px-2.5 py-1 text-[11px] text-black/70">
            {role}
          </span>
        )}
      </div>

      <div className="space-y-2 text-sm leading-6 text-black/75">
        {goal && (
          <p>
            <span className="text-black/45">目标：</span>
            {goal}
          </p>
        )}
        {(renderMode || layoutType) && (
          <p>
            <span className="text-black/45">渲染 / 布局：</span>
            {[renderMode, layoutType].filter(Boolean).join(" · ")}
          </p>
        )}
        {(toText(sceneIntent.sceneType) || toText(sceneIntent.sceneDescription)) && (
          <p>
            <span className="text-black/45">场景意图：</span>
            {[toText(sceneIntent.sceneType), toText(sceneIntent.sceneDescription)].filter(Boolean).join(" · ")}
          </p>
        )}
        {(toText(composition.cameraAngle) || toText(composition.framing) || toText(composition.productCoverage)) && (
          <p>
            <span className="text-black/45">构图：</span>
            {[toText(composition.cameraAngle), toText(composition.framing), toText(composition.productCoverage)]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
        {stateControl && (
          <p>
            <span className="text-black/45">状态控制：</span>
            {stateControl}
          </p>
        )}
        {mustKeep && (
          <p>
            <span className="text-black/45">必须保留：</span>
            {mustKeep}
          </p>
        )}
        {mustAvoid && (
          <p>
            <span className="text-black/45">必须避免：</span>
            {mustAvoid}
          </p>
        )}
        {focusPoints.length > 0 && (
          <p>
            <span className="text-black/45">聚焦要点：</span>
            {focusPoints.join("、")}
          </p>
        )}
      </div>
    </div>
  );
}

function DirectorPlanPreview({
  plan,
  meta,
  warning,
}: {
  plan: DirectorPlan;
  meta: AnalysisMeta | null;
  warning?: string | null;
}) {
  const productIdentity = pickSection(plan, "productIdentity");
  const styleDirection = pickSection(plan, "styleDirection");
  const productLock = pickSection(plan, "productLock");
  const scenarioDirection = pickSection(plan, "scenarioDirection");
  const commercialStrategy = pickSection(plan, "commercialStrategy");
  const factSafety = pickSection(plan, "factSafety");
  const imagePlanList = Array.isArray(plan.imagePlan)
    ? (plan.imagePlan as Record<string, unknown>[])
    : [];

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <p className="text-sm text-black/35">Oviraq AI · 视觉导演</p>
        <h2 className="mt-2 text-3xl font-semibold">AI 电商视觉导演方案</h2>
        <p className="mt-3 text-black/45">请确认导演方案后，点击左侧「确认生成图片」继续出图</p>
        <AnalysisMetaBadges meta={meta} />
        {warning && (
          <div className="mt-4 rounded-[16px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {warning}
          </div>
        )}
      </div>

      <AnalysisSection title="产品识别">
        <AnalysisField label="产品名称">{toText(productIdentity.productName) || "—"}</AnalysisField>
        <AnalysisField label="识别类目">{toText(productIdentity.category) || "—"}</AnalysisField>
        <AnalysisField label="子类目">{toText(productIdentity.subCategory) || "—"}</AnalysisField>
        <AnalysisField label="产品形态">{toText(productIdentity.productForm) || "—"}</AnalysisField>
        <AnalysisField label="使用场景">{toText(productIdentity.useCase) || "—"}</AnalysisField>
      </AnalysisSection>

      <AnalysisSection title="风格方向">
        <AnalysisField label="风格 DNA">
          <TagList items={toList(styleDirection.styleDNA)} />
        </AnalysisField>
        <AnalysisField label="视觉关键词">
          <TagList items={toList(styleDirection.visualKeywords)} />
        </AnalysisField>
        <AnalysisField label="调性关键词">
          <TagList items={toList(styleDirection.toneKeywords)} />
        </AnalysisField>
        <AnalysisField label="平台策略">{toText(styleDirection.platformStrategy) || "—"}</AnalysisField>
      </AnalysisSection>

      <AnalysisSection title="结构锁定">
        <AnalysisField label="可见结构">{toList(productLock.visibleStructure).join("、") || "—"}</AnalysisField>
        <AnalysisField label="可见材质">{toList(productLock.visibleMaterials).join("、") || "—"}</AnalysisField>
        <AnalysisField label="可见颜色">{toList(productLock.visibleColors).join("、") || "—"}</AnalysisField>
        <AnalysisField label="可见图案">{toList(productLock.visiblePatterns).join("、") || "—"}</AnalysisField>
        <AnalysisField label="组件关系">{toText(productLock.componentRelationship) || "—"}</AnalysisField>
        <AnalysisField label="功能机制">{toText(productLock.functionalMechanism) || "—"}</AnalysisField>
        <AnalysisField label="结构风险">{toList(productLock.structureRisks).join("、") || "—"}</AnalysisField>
        <AnalysisField label="禁止改动">{toList(productLock.forbiddenChanges).join("、") || "—"}</AnalysisField>
      </AnalysisSection>

      <AnalysisSection title="场景策略">
        <AnalysisField label="推荐场景">{toList(scenarioDirection.recommendedScenes).join("、") || "—"}</AnalysisField>
        <AnalysisField label="禁止场景">{toList(scenarioDirection.forbiddenScenes).join("、") || "—"}</AnalysisField>
        <AnalysisField label="推荐道具">{toList(scenarioDirection.propRecommendations).join("、") || "—"}</AnalysisField>
        <AnalysisField label="避免道具">{toList(scenarioDirection.propAvoidance).join("、") || "—"}</AnalysisField>
        <AnalysisField label="背景指导">{toText(scenarioDirection.backgroundGuidance) || "—"}</AnalysisField>
      </AnalysisSection>

      <AnalysisSection title="商业卖点">
        <AnalysisField label="核心卖点">{toList(commercialStrategy.coreSellingPoints).join("、") || "—"}</AnalysisField>
        <AnalysisField label="情绪卖点">{toList(commercialStrategy.emotionalSellingPoints).join("、") || "—"}</AnalysisField>
        <AnalysisField label="礼赠属性">{toList(commercialStrategy.giftingAttributes).join("、") || "—"}</AnalysisField>
        <AnalysisField label="转化焦点">{toText(commercialStrategy.conversionFocus) || "—"}</AnalysisField>
      </AnalysisSection>

      <AnalysisSection title="事实安全">
        <AnalysisField label="客观事实">{toList(factSafety.objectiveFacts).join("、") || "—"}</AnalysisField>
        <AnalysisField label="缺失事实">{toList(factSafety.missingFacts).join("、") || "—"}</AnalysisField>
      </AnalysisSection>

      {toText(factSafety.factSafetyNote) && (
        <div className="mt-4 rounded-[20px] border border-black/8 bg-[#fafafa] p-4">
          <h3 className="text-xs font-medium text-black/45">事实参数规则</h3>
          <p className="mt-2 text-sm leading-6 text-black/75">{toText(factSafety.factSafetyNote)}</p>
        </div>
      )}

      {imagePlanList.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-3 text-sm font-semibold">图组规划</h3>
          <div className="grid gap-4">
            {imagePlanList.map((item, index) => (
              <DirectorImagePlanCard key={`director-plan-${index}`} item={item} index={index} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AnalysisPreview({
  analysis,
  directorPlan,
  meta,
  warning,
}: {
  analysis: ProductAnalysis | null;
  directorPlan: DirectorPlan | null;
  meta: AnalysisMeta | null;
  warning?: string | null;
}) {
  if (directorPlan) {
    return <DirectorPlanPreview plan={directorPlan} meta={meta} warning={warning} />;
  }

  if (analysis) {
    return <LegacyAnalysisPreview analysis={analysis} meta={meta} warning={warning} />;
  }

  return null;
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
  display,
  aspectClass,
  isPrimary,
  onPreview,
}: {
  url: string;
  index: number;
  display: ResultCardDisplay;
  aspectClass: string;
  isPrimary?: boolean;
  onPreview: (index: number) => void;
}) {
  return (
    <article className="w-full overflow-hidden rounded-[20px] border border-black/8 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
      <div className="border-b border-black/6 px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold tracking-wide text-black">
            {display.indexLabel} {display.title}
          </span>
          {display.badge && display.badge !== display.title && (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium text-white ${
                isPrimary ? "bg-black ring-1 ring-black/15" : "bg-black/85"
              }`}
            >
              {display.badge}
            </span>
          )}
        </div>
        {display.description && (
          <p className="mt-1 line-clamp-2 text-xs leading-snug text-black/50">{display.description}</p>
        )}
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
              alt={`${display.title} ${display.indexLabel}`}
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
  directorPlan,
  productAnalysis,
  onRegenerate,
  onPreview,
}: {
  images?: string[];
  generatedImages?: string[];
  imageUrls?: string[];
  imageUrl?: string;
  modelName: string;
  aspectRatio: string;
  directorPlan?: DirectorPlan | null;
  productAnalysis?: ProductAnalysis | null;
  onRegenerate: () => void;
  onPreview: (i: number) => void;
}) {
  const displayImages = resolveResultImages({ images, generatedImages, imageUrls, imageUrl });
  const actualImageCount = displayImages.length || 1;
  const activeDirectorPlan = resolveActiveDirectorPlan(directorPlan ?? null, productAnalysis ?? null);
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
          {displayImages.map((url, index) => {
            const display = getResultCardDisplay(index, activeDirectorPlan);

            return (
              <ResultImageCard
                key={`${url}-${index}`}
                url={url}
                index={index}
                display={display}
                aspectClass={aspectClass}
                isPrimary={index === 0}
                onPreview={onPreview}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}