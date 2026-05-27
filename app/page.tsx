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
const quantityOptions = ["1 张", "2 张", "3 张", "4 张", "5 张", "6 张", "7 张", "8 张", "9 张", "10 张", "11 张", "12 张"];

function parseAspectRatio(ratioLabel: string): string {
  const match = ratioLabel.match(/^[\d:]+/);
  return match ? match[0] : "1:1";
}

function mapQuality(value: string): string {
  if (value === "高清") return "high";
  if (value === "超清") return "ultra";
  return "standard";
}

function parseCount(quantityLabel: string): number {
  const match = quantityLabel.match(/\d+/);
  const count = match ? Number.parseInt(match[0], 10) : 1;
  return Math.min(12, Math.max(1, count));
}

function normalizeSelectOptions(options: string[] | SelectOption[]): SelectOption[] {
  return options.map((option) =>
    typeof option === "string" ? { label: option, value: option } : option
  );
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
  const [stage, setStage] = useState<"idle" | "analyzing" | "schemes" | "generating" | "results">("idle");
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  async function analyze() {
    if (productImages.length === 0) {
      alert("请至少上传 1 张商品图");
      return;
    }

    setAnalyzingStep(1);
    setStage("analyzing");

    const count = parseCount(quantity);
    const aspectRatio = parseAspectRatio(selectedRatio);
    const qualityValue = mapQuality(quality);

    const formData = new FormData();
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

    console.log("[Oviraq Frontend Submit]");
    console.log("imageType:", imageType);
    console.log("platform:", platform);
    console.log("targetLanguage:", language);
    console.log("model:", IMAGE_MODEL);
    console.log("aspectRatio:", aspectRatio);
    console.log("quality:", qualityValue);
    console.log("count:", count);

    try {
      const res = await fetch("http://45.32.250.250:3001/auto-generate-product", {
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
        setStage("idle");
      }
    } catch (error) {
      console.error(error);
      alert("请求失败，请稍后重试");
      setStage("idle");
    }
  }

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
              onClick={() => setImageType("main")}
              className={`rounded-full py-2 text-sm ${imageType === "main" ? "bg-black font-medium text-white" : "text-black/55"}`}
            >
              主图
            </button>
            <button
              onClick={() => setImageType("detail")}
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
            onClick={analyze}
            disabled={stage === "analyzing"}
            className="mt-5 h-12 w-full rounded-full bg-black text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:bg-black/40 disabled:hover:opacity-100"
          >
            {stage === "analyzing" ? "生成中..." : "分析产品"}
          </button>
        </aside>

        <section className="min-w-0 flex-1 overflow-y-auto rounded-[30px] bg-white p-8 shadow-sm">
          {stage === "idle" && <EmptyState imageType={imageType} />}
          {stage === "analyzing" && <Analyzing step={analyzingStep} />}
          {stage === "schemes" && <Schemes onGenerate={() => setStage("generating")} />}
          {stage === "generating" && <Generating />}
          {stage === "results" && (
            <Results
              images={generatedImages}
              generatedImages={generatedImages}
              modelName={MODEL_LABEL}
              onBack={() => setStage("idle")}
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
        <p className="mt-4 leading-8 text-black/45">上传商品图并填写需求后<br />AI 将自动生成商业摄影方案与视觉内容</p>
      </div>
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

function Results({
  images,
  generatedImages,
  imageUrls,
  modelName,
  onBack,
  onPreview,
}: {
  images: string[];
  generatedImages?: string[];
  imageUrls?: string[];
  modelName: string;
  onBack: () => void;
  onPreview: (i: number) => void;
}) {
  const actualImageCount = images?.length || generatedImages?.length || imageUrls?.length || 1;

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-black/35">Oviraq AI · 生成结果</p>
          <h2 className="mt-2 text-3xl font-semibold">商业视觉生成结果</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              `已生成 ${actualImageCount} 张`,
              `模型 ${modelName}`,
              "平台 淘宝",
              "尺寸 1:1",
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
        <button className="rounded-full bg-black px-5 py-3 text-sm text-white">再次生成</button>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-5">
        {images.map((url, index) => (
          <div
            key={`${url}-${index}`}
            className="group relative overflow-hidden rounded-[28px] bg-[#f4f4f5] transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
          >
            <button
              type="button"
              onClick={() => onPreview(index)}
              className="block w-full cursor-zoom-in text-left"
            >
              <img
                src={url}
                alt={`商业视觉 ${index + 1}`}
                className="h-auto w-full transition duration-500 group-hover:scale-[1.02]"
              />
            </button>

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/0 via-black/0 to-black/10" />

            <button
              type="button"
              onClick={(event) => event.stopPropagation()}
              className="absolute right-4 top-4 z-10 rounded-full bg-black px-4 py-2 text-xs text-white opacity-60 transition hover:opacity-80 group-hover:opacity-100"
            >
              重新生成
            </button>

            <div className="pointer-events-none absolute inset-x-0 bottom-0 opacity-0 transition duration-300 group-hover:pointer-events-auto group-hover:opacity-100">
              <div className="bg-gradient-to-t from-black/70 to-transparent px-4 pb-4 pt-12">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium tracking-wide text-white/90">
                    #{String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={(event) => event.stopPropagation()}
                      className="h-9 rounded-full bg-black/45 px-3.5 text-xs font-medium text-white transition duration-300 hover:bg-white hover:text-black"
                    >
                      下载
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onPreview(index);
                      }}
                      className="h-9 rounded-full bg-black/45 px-3.5 text-xs font-medium text-white transition duration-300 hover:bg-white hover:text-black"
                    >
                      放大
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button onClick={onBack} className="mt-8 h-12 w-full rounded-full border border-black/10 text-sm">
        返回视觉方案
      </button>
    </div>
  );
}