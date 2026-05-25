import fs from "fs";

const page = `"use client";

import { useEffect, useState } from "react";

const ANALYSIS_STEPS = [
  "正在识别产品类型",
  "正在分析目标人群",
  "正在匹配商业摄影风格",
  "正在计算平台视觉策略",
  "正在生成视觉方案",
];

const VISUAL_SCHEMES = [
  {
    name: "极简高级主图",
    mockup: "minimal" as const,
    reason:
      "适合突出产品高级感，适用于淘宝与亚马逊主图场景，能够提升产品专业度与点击率。",
    keywords: ["极简", "留白", "柔光", "高级感"],
    platforms: ["淘宝", "亚马逊", "Temu"],
  },
  {
    name: "氛围感生活场景",
    mockup: "lifestyle" as const,
    reason:
      "通过居家场景建立信任感，适合需要传递温度与使用感的品类，在小红书与淘宝详情中更易引发共鸣。",
    keywords: ["自然光", "木质", "居家", "温润"],
    platforms: ["淘宝", "小红书"],
  },
  {
    name: "高转化卖点视觉",
    mockup: "detail" as const,
    reason:
      "聚焦使用体验与细节质感，适合内容平台种草链路，能够强化卖点记忆并提升转化意图。",
    keywords: ["特写", "景深", "种草", "体验感"],
    platforms: ["小红书", "抖音", "TikTok"],
  },
];

const SKELETON_HEIGHTS = [280, 340, 300, 360];

const IMAGE_LAYOUT = [
  "aspect-[4/5]",
  "aspect-square",
  "aspect-[3/4]",
  "aspect-[5/4]",
];

const createImageUrls = () =>
  Array.from(
    { length: 4 },
    (_, index) => \`https://picsum.photos/seed/oviraq-\${index + 1}/500/500\`,
  );

type RightPanelView =
  | "idle"
  | "analyzing"
  | "schemes"
  | "generating"
  | "results";

function PanelHeader({
  tag,
  title,
  subtitle,
}: {
  tag: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div>
      <p className="text-sm tracking-wide text-black/35">{tag}</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-3 max-w-xl text-base leading-relaxed text-black/45">
        {subtitle}
      </p>
    </div>
  );
}

function SchemeTagGroup({
  label,
  tags,
  variant = "default",
}: {
  label: string;
  tags: string[];
  variant?: "default" | "muted";
}) {
  return (
    <motion></motion>
      <p className="mb-2.5 text-xs text-black/40">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag}
            className={
              variant === "muted"
                ? "rounded-full bg-[#f3f3f4] px-2.5 py-1 text-xs text-black/45"
                : "rounded-full border border-black/10 px-2.5 py-1 text-xs text-black/70"
            }
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

function SchemeMockupPreview({
  variant,
}: {
  variant: "minimal" | "lifestyle" | "detail";
}) {
  const frameClass =
    "relative h-[280px] w-full overflow-hidden rounded-t-[24px]";

  if (variant === "minimal") {
    return (
      <div
        className={\`\${frameClass} bg-gradient-to-b from-[#f6f6f7] to-[#e9e9eb]\`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(255,255,255,0.9),transparent_60%)]" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <div className="h-20 w-28 rounded-2xl bg-gradient-to-br from-[#3a3a3a] to-[#1a1a1a] shadow-[0_24px_48px_rgba(0,0,0,0.18)]" />
            <motion></motion>
          </div>
        </div>
      </div>
    );
  }

  if (variant === "lifestyle") {
    return (
      <div
        className={\`\${frameClass} bg-gradient-to-br from-[#eceae7] via-[#e4e1dc] to-[#d6d2cc]\`}
      >
        <div className="absolute -right-8 -top-10 h-40 w-40 rounded-full bg-white/40 blur-2xl" />
        <div className="absolute left-8 top-10 h-24 w-24 rounded-full bg-black/[0.04] blur-xl" />
        <div className="absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-[#c8c2ba]/80 to-[#d8d3cc]/20" />
        <div className="absolute bottom-12 left-10 h-16 w-24 rounded-xl bg-gradient-to-br from-[#4a4a4a] to-[#2c2c2c] shadow-[0_16px_32px_rgba(0,0,0,0.15)]" />
        <div className="absolute bottom-[38%] right-12 h-10 w-16 rounded-lg bg-white/30 blur-[1px]" />
      </div>
    );
  }

  return (
    <div
      className={\`\${frameClass} bg-gradient-to-br from-[#dedede] via-[#d0d0d0] to-[#bcbcbc]\`}
    >
      <div className="absolute -left-10 top-1/2 h-48 w-48 -translate-y-1/2 rounded-full bg-black/[0.06] blur-3xl" />
      <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-black/[0.08] to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_40%,transparent_30%,rgba(0,0,0,0.06)_100%)]" />
      <div className="absolute -right-8 -top-6 h-44 w-44 rounded-3xl bg-gradient-to-br from-[#505050] to-[#222222] shadow-[0_20px_44px_rgba(0,0,0,0.2)]" />
      <div className="absolute bottom-6 left-8 h-2.5 w-20 rounded-full bg-black/10" />
    </div>
  );
}

export default function Home() {
  const [rightView, setRightView] = useState<RightPanelView>("idle");
  const [visibleStep, setVisibleStep] = useState(-1);
  const [imageUrls, setImageUrls] = useState(createImageUrls);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(
    null,
  );

  useEffect(() => {
    if (rightView !== "analyzing") {
      if (rightView === "idle") {
        setVisibleStep(-1);
      }
      return;
    }

    setVisibleStep(0);

    const stepInterval = window.setInterval(() => {
      setVisibleStep((prev) => {
        if (prev >= ANALYSIS_STEPS.length - 1) {
          window.clearInterval(stepInterval);
          return prev;
        }
        return prev + 1;
      });
    }, 800);

    const schemeTimeout = window.setTimeout(() => {
      setRightView("schemes");
    }, 5000);

    return () => {
      window.clearInterval(stepInterval);
      window.clearTimeout(schemeTimeout);
    };
  }, [rightView]);

  useEffect(() => {
    if (rightView !== "generating") {
      return;
    }

    const resultsTimeout = window.setTimeout(() => {
      setRightView("results");
    }, 3000);

    return () => window.clearTimeout(resultsTimeout);
  }, [rightView]);

  const handleAnalyze = () => {
    setRightView("analyzing");
  };

  const handleGenerateScheme = () => {
    setImageUrls(createImageUrls());
    setRegeneratingIndex(null);
    setRightView("generating");
  };

  const handleBackToSchemes = () => {
    setRightView("schemes");
  };

  const handleDownload = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleRegenerateImage = (index: number) => {
    setRegeneratingIndex(index);

    window.setTimeout(() => {
      setImageUrls((prev) => {
        const next = [...prev];
        next[index] =
          \`https://picsum.photos/seed/oviraq-\${index + 1}-\${Date.now()}/500/500\`;
        return next;
      });
      setRegeneratingIndex(null);
    }, 900);
  };

  const isAnalyzing = rightView === "analyzing";

  return (
    <main className="h-screen overflow-hidden bg-[#f7f7f8] p-5">
      <div className="flex h-full min-h-0 gap-6">
        <section className="h-full w-[360px] shrink-0 overflow-x-hidden overflow-y-auto rounded-[32px] bg-white p-5 shadow-sm">
          <div className="mb-8 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full border-[9px] border-black" />
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                Oviraq AI
              </h1>
              <p className="text-sm text-black/45">
                AI Ecommerce Visual Director
              </p>
            </div>
          </div>

          <div className="mb-6 rounded-[28px] border border-black/10 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-semibold">产品图</h2>
              <span className="text-black/35">0/6</span>
            </div>
            <div className="flex h-[220px] flex-col items-center justify-center rounded-[24px] border border-dashed border-black/10">
              <div className="mb-4 text-6xl font-light">+</motion>
              <p className="text-lg text-black/70">上传清晰的产品图片</p>
              <p className="mt-2 text-sm text-black/40">
                建议只上传必要角度或 SKU 图
              </p>
            </div>
          </div>

          <motion></motion>
            <button
              type="button"
              className="flex-1 rounded-full bg-black py-4 text-lg font-medium text-white"
            >
              主图
            </button>
            <button
              type="button"
              className="flex-1 rounded-full py-4 text-lg text-black/60"
            >
              详情图
            </button>
          </div>

          <div className="mb-6">
            <p className="mb-3 text-black/60">目标平台</p>
            <select className="h-14 w-full rounded-2xl border border-black/10 bg-white px-5 text-lg outline-none">
              <option>智能匹配</option>
              <option>淘宝</option>
              <option>小红书</option>
              <option>抖音</option>
              <option>拼多多</option>
              <option>亚马逊</option>
              <option>TikTok</option>
              <option>Temu</option>
            </select>
          </div>

          <div className="mb-6">
            <p className="mb-3 text-black/60">产品:*** 产品信息</p>
            <textarea
              className="h-36 w-full resize-none rounded-[24px] border border-black/10 bg-white p-5 text-lg outline-none"
              placeholder="请输入产品名称、卖点、目标人群、功能介绍、使用场景、其他要求..."
            />
          </div>

          <div className="mb-6 grid min-w-0 grid-cols-2 gap-x-3 gap-y-5">
            <div>
              <p className="mb-3 text-black/60">目标语言</p>
              <select
                defaultValue="无文字"
                className="h-14 w-full rounded-2xl border border-black/10 bg-white px-5 text-lg outline-none"
              >
                <option>无文字</option>
                <option>中文</option>
                <option>英文</option>
                <option>日文</option>
                <option>韩文</option>
                <option>其他国家语言</option>
              </select>
            </div>

            <div>
              <p className="mb-3 text-black/60">模型选择</p>
              <select
                defaultValue="智能推荐"
                className="h-14 w-full rounded-2xl border border-black/10 bg-white px-5 text-lg outline-none"
              >
                <option>智能推荐</option>
                <option>GPT Image</option>
                <option>Flux Kontext</option>
                <option>Nano Banana</option>
              </select>
            </div>

            <div className="col-span-2">
              <p className="mb-3 text-black/60">尺寸比例</p>
              <select
                defaultValue="1:1 正方形"
                className="h-14 w-full rounded-2xl border border-black/10 bg-white px-5 text-lg outline-none"
              >
                <option>1:1 正方形</option>
                <option>2:3 竖版</option>
                <option>3:2 横版</option>
                <option>3:4 竖版</option>
                <option>4:3 横版</option>
                <option>4:5 竖版</option>
                <option>5:4 横版</option>
                <option>9:16 竖版</option>
                <option>16:9 横版</option>
              </select>
            </div>

            <div>
              <p className="mb-3 text-black/60">清晰度</p>
              <select
                defaultValue="标准"
                className="h-14 w-full rounded-2xl border border-black/10 bg-white px-5 text-lg outline-none"
              >
                <option>标准</option>
                <option>高清</option>
                <option>超清</option>
              </select>
            </motion>

            <div>
              <p className="mb-3 text-black/60">生成数量</p>
              <select
                defaultValue="1 张"
                className="h-14 w-full rounded-2xl border border-black/10 bg-white px-5 text-lg outline-none"
              >
                <option>1 张</option>
                <option>2 张</option>
                <option>3 张</option>
                <option>4 张</option>
                <option>5 张</option>
                <option>6 张</option>
                <option>7 张</option>
                <option>8 张</option>
                <option>9 张</option>
                <option>10 张</option>
                <option>11 张</option>
                <option>12 张</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="h-16 w-full rounded-full bg-black text-xl font-medium text-white transition hover:opacity-90 disabled:cursor-default disabled:opacity-50"
          >
            {isAnalyzing ? "分析中..." : "分析产品"}
          </button>
        </section>

        <section className="flex h-full min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto rounded-[32px] bg-white p-8 shadow-sm lg:p-10">
          {rightView === "idle" && (
            <div className="flex h-full w-full flex-col items-center justify-center text-center">
              <div className="mb-8 flex h-28 w-28 items-center justify-center rounded-full bg-[#f3f3f4] text-5xl">
                ✦
              </div>
              <h2 className="mb-4 text-4xl font-semibold">AI 商业视觉生成</h2>
              <p className="max-w-xl text-xl leading-10 text-black/45">
                上传商品图并填写需求后
                <br />
                AI 将自动生成商业摄影方案与视觉内容
              </p>
            </div>
          )}

          {rightView === "analyzing" && (
            <div className="flex w-full min-w-0 flex-col justify-center px-4 sm:px-8">
              <PanelHeader
                tag="Oviraq AI · 产品分析"
                title="AI 正在分析商品"
                subtitle="正在理解产品特征并匹配商业视觉策略"
              />
              <div className="mt-12 space-y-5">
                {ANALYSIS_STEPS.map((step, index) => {
                  const isComplete = index < visibleStep;
                  const isPending = index > visibleStep;

                  if (isPending) {
                    return (
                      <p
                        key={step}
                        className="pl-9 text-lg text-black/25"
                      >
                        {step}
                      </p>
                    );
                  }

                  return (
                    <motion></motion>
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                        {isComplete ? (
                          <span className="text-sm font-medium text-black">
                            ✓
                          </span>
                        ) : (
                          <span className="h-2 w-2 rounded-full bg-black" />
                        )}
                      </span>
                      <p className="text-lg text-black">{step}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {rightView === "schemes" && (
            <div className="w-full min-w-0">
              <div>
                <p className="text-sm tracking-wide text-black/35">
                  Oviraq AI · 视觉方案
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                  AI 推荐视觉方案
                </h2>
                <p className="mt-3 max-w-2xl text-base leading-relaxed text-black/45">
                  根据商品特征、平台策略与商业摄影逻辑生成
                </p>
              </div>

              <div className="mt-10 grid grid-cols-2 gap-4">
                {VISUAL_SCHEMES.map((scheme) => (
                  <div
                    key={scheme.name}
                    className="flex flex-col overflow-hidden rounded-[24px] border border-black/[0.06] bg-white transition hover:border-black/15 hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)]"
                  >
                    <SchemeMockupPreview variant={scheme.mockup} />
                    <div className="flex flex-1 flex-col p-5">
                      <h3 className="text-lg font-semibold tracking-tight">
                        {scheme.name}
                      </h3>
                      <p className="mt-3 text-sm leading-relaxed text-black/55">
                        {scheme.reason}
                      </p>
                      <div className="mt-5 space-y-4">
                        <SchemeTagGroup
                          label="视觉关键词"
                          tags={scheme.keywords}
                        />
                        <SchemeTagGroup
                          label="推荐适用平台"
                          tags={scheme.platforms}
                          variant="muted"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleGenerateScheme}
                        className="mt-6 h-11 w-full rounded-full bg-black text-sm font-medium text-white transition hover:opacity-90"
                      >
                        生成该方案
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {rightView === "generating" && (
            <div className="w-full min-w-0">
              <PanelHeader
                tag="Oviraq AI · 图片生成"
                title="正在生成商业视觉"
                subtitle="AI 正在根据商品特征生成商业摄影内容"
              />
              <div className="mt-12 grid grid-cols-2 gap-4">
                {SKELETON_HEIGHTS.map((height, index) => (
                  <div
                    key={\`skeleton-\${index}\`}
                    className="ai-skeleton rounded-[24px]"
                    style={{ height }}
                  />
                ))}
              </div>
            </div>
          )}

          {rightView === "results" && (
            <div className="w-full min-w-0">
              <PanelHeader
                tag="Oviraq AI · 生成结果"
                title="商业视觉生成结果"
                subtitle="AI 已生成符合平台策略的商业视觉内容"
              />

              <div className="mt-10 columns-2 gap-4 [column-gap:1rem]">
                {imageUrls.map((url, index) => (
                  <div key={\`\${url}-\${index}\`} className="mb-4 break-inside-avoid">
                    <div className="overflow-hidden rounded-[24px] border border-black/8 bg-[#fafafa]">
                      {regeneratingIndex === index ? (
                        <motion></motion>
                          className={\`ai-skeleton w-full \${IMAGE_LAYOUT[index]}\`}
                        />
                      ) : (
                        <img
                          src={url}
                          alt={\`商业视觉 \${index + 1}\`}
                          className={\`w-full object-cover \${IMAGE_LAYOUT[index]}\`}
                        />
                      )}
                    </div>
                    <div className="mt-4 flex gap-3">
                      <button
                        type="button"
                        onClick={() => handleDownload(url)}
                        disabled={regeneratingIndex === index}
                        className="h-10 flex-1 rounded-full border border-black/10 text-sm font-medium text-black/70 transition hover:border-black/25 hover:text-black disabled:cursor-default disabled:opacity-40"
                      >
                        下载
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRegenerateImage(index)}
                        disabled={regeneratingIndex !== null}
                        className="h-10 flex-1 rounded-full bg-black text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-default disabled:opacity-40"
                      >
                        重新生成此图
                      </button>
                    </motion>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleBackToSchemes}
                className="mt-10 h-14 w-full rounded-full border border-black/10 text-base font-medium text-black/70 transition hover:border-black/25 hover:text-black"
              >
                返回视觉方案
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
`;

const D = "di" + "v";
const fixed = page
  .replace(/<\/?motion>/g, (m) =>
    m.startsWith("</") ? `</${D}>` : `<${D}>`,
  )
  .replace(
    `<${D} className="mb-4 text-6xl font-light">+</${D}>`,
    `<${D} className="mb-4 text-6xl font-light">+</${D}>`,
  );

// Fix broken patterns from motion replacement
let out = fixed
  .replace(
    `<${D}>\n      <p className="mb-2.5`,
    `<${D}>\n      <p className="mb-2.5`,
  )
  .replace(
    `<${D}></${D}>\n            <div className="h-20 w-28`,
    `<${D} className="relative">\n            <motion></motion>`,
  );

// Re-read - the motion replace might have broken things. Let me build from scratch differently.

fs.writeFileSync("app/page.tsx", fixed);
console.log("done");
