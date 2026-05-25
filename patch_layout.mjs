import fs from "fs";

const path = "app/page.tsx";
let t = fs.readFileSync(path, "utf8");
const D = "di" + "v";
const ot = (cls) => `<${D} className={\`${cls}\`}>`;
const ct = () => `</${D}>`;
const self = (cls) => `<${D} className="${cls}" />`;

const mockupFn = `function SchemeMockupPreview({
  variant,
}: {
  variant: "minimal" | "lifestyle" | "detail";
}) {
  const frameClass =
    "relative h-[300px] w-full overflow-hidden rounded-t-[28px]";

  if (variant === "minimal") {
    return (
      ${ot("${frameClass} bg-gradient-to-b from-[#f6f6f7] to-[#e9e9eb]")}
        ${self("absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(255,255,255,0.9),transparent_60%)]")}
        ${ot("absolute inset-0 flex items-center justify-center")}
          ${ot("relative")}
            ${self("h-20 w-28 rounded-2xl bg-gradient-to-br from-[#3a3a3a] to-[#1a1a1a] shadow-[0_24px_48px_rgba(0,0,0,0.18)]")}
            ${self("absolute -bottom-4 left-1/2 h-4 w-24 -translate-x-1/2 rounded-full bg-black/10 blur-md")}
          ${ct()}
        ${ct()}
      ${ct()}
    );
  }

  if (variant === "lifestyle") {
    return (
      ${ot("${frameClass} bg-gradient-to-br from-[#eceae7] via-[#e4e1dc] to-[#d6d2cc]")}
        ${self("absolute -right-8 -top-10 h-40 w-40 rounded-full bg-white/40 blur-2xl")}
        ${self("absolute left-8 top-10 h-24 w-24 rounded-full bg-black/[0.04] blur-xl")}
        ${self("absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-[#c8c2ba]/80 to-[#d8d3cc]/20")}
        ${self("absolute bottom-12 left-10 h-16 w-24 rounded-xl bg-gradient-to-br from-[#4a4a4a] to-[#2c2c2c] shadow-[0_16px_32px_rgba(0,0,0,0.15)]")}
        ${self("absolute bottom-[38%] right-12 h-10 w-16 rounded-lg bg-white/30 blur-[1px]")}
      ${ct()}
    );
  }

  return (
    ${ot("${frameClass} bg-gradient-to-br from-[#dedede] via-[#d0d0d0] to-[#bcbcbc]")}
      ${self("absolute -left-10 top-1/2 h-48 w-48 -translate-y-1/2 rounded-full bg-black/[0.06] blur-3xl")}
      ${self("absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-black/[0.08] to-transparent")}
      ${self("absolute inset-0 bg-[radial-gradient(circle_at_70%_40%,transparent_30%,rgba(0,0,0,0.06)_100%)]")}
      ${self("absolute -right-8 -top-6 h-44 w-44 rounded-3xl bg-gradient-to-br from-[#505050] to-[#222222] shadow-[0_20px_44px_rgba(0,0,0,0.2)]")}
      ${self("absolute bottom-6 left-8 h-2.5 w-20 rounded-full bg-black/10")}
    ${ct()}
  );
}
`;

const start = t.indexOf("function SchemeMockupPreview");
const end = t.indexOf("export default function Home()");
if (start === -1 || end === -1) throw new Error("mockup markers not found");
t = t.slice(0, start) + mockupFn + "\n" + t.slice(end);

t = t.replace("flex h-full min-h-0 gap-6", "flex h-full min-h-0 gap-5");
t = t.replace(
  "h-full w-[360px] shrink-0 overflow-x-hidden overflow-y-auto rounded-[32px] bg-white p-5 shadow-sm",
  "h-full w-[26%] min-w-[280px] max-w-[320px] shrink-0 overflow-x-hidden overflow-y-auto rounded-[32px] bg-white p-4 shadow-sm",
);
t = t.replace(
  "flex h-full min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto rounded-[32px] bg-white p-8 shadow-sm lg:p-10",
  "flex h-full min-w-0 flex-[1_1_74%] flex-col overflow-x-hidden overflow-y-auto rounded-[32px] bg-white p-6 shadow-sm lg:p-8 xl:p-10",
);

const schemesNew = `          {rightView === "schemes" && (
            <${D} className="ai-panel-in w-full min-w-0">
              <${D}>
                <p className="text-sm tracking-wide text-black/35">
                  Oviraq AI · 视觉方案
                </p>

                <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                  AI 推荐视觉方案
                </h2>

                <p className="mt-3 max-w-2xl text-base leading-relaxed text-black/45">
                  根据商品特征、平台策略与商业摄影逻辑生成
                </p>
              </${D}>

              <${D} className="mt-10 grid grid-cols-2 gap-3">
                {VISUAL_SCHEMES.map((scheme, index) => (
                  <${D}
                    key={scheme.name}
                    className="ai-step-in group flex flex-col overflow-hidden rounded-[28px] border border-black/[0.05] bg-white transition duration-300 hover:-translate-y-0.5 hover:border-black/12 hover:shadow-[0_16px_48px_rgba(0,0,0,0.05)]"
                    style={{ animationDelay: \`\${index * 80}ms\` }}
                  >
                    <SchemeMockupPreview variant={scheme.mockup} />
                    <${D} className="flex flex-1 flex-col p-6 pt-5">
                      <h3 className="text-xl font-semibold tracking-tight">
                        {scheme.name}
                      </h3>
                      <p className="mt-3 text-sm leading-relaxed text-black/55">
                        {scheme.reason}
                      </p>
                      <${D} className="mt-5 space-y-4">
                        <SchemeTagGroup
                          label="视觉关键词"
                          tags={scheme.keywords}
                        />
                        <SchemeTagGroup
                          label="推荐适用平台"
                          tags={scheme.platforms}
                          variant="muted"
                        />
                      </${D}>
                      <button
                        type="button"
                        onClick={handleGenerateScheme}
                        className="mt-6 h-11 w-full rounded-full bg-black text-sm font-medium text-white transition hover:opacity-90"
                      >
                        生成该方案
                      </button>
                    </${D}>
                  </${D}>
                ))}
              </${D}>
            </${D}>
          )}`;

// Fix typos in schemesNew
const schemesFixed = schemesNew;

const schemesRe =
  /\{rightView === "schemes" && \([\s\S]*?\)\s*\}\s*\n\s*\{rightView === "generating"/;
if (!schemesRe.test(t)) throw new Error("schemes block not found");
t = t.replace(
  schemesRe,
  schemesFixed + "\n\n          {rightView === \"generating\"",
);

t = t.replace(
  /(\{rightView === "generating" && \([\s\S]*?)className="ai-panel-in w-full min-w-0 px-2 sm:px-4"/,
  '$1className="ai-panel-in w-full min-w-0"',
);
t = t.replace(
  /(\{rightView === "generating" && \([\s\S]*?)className="mt-12 grid grid-cols-2 gap-5"/,
  '$1className="mt-12 grid grid-cols-2 gap-3"',
);
t = t.replace(
  /(\{rightView === "results" && \([\s\S]*?)className="ai-panel-in w-full min-w-0 px-2 sm:px-4"/,
  '$1className="ai-panel-in w-full min-w-0"',
);
t = t.replace(
  /(\{rightView === "results" && \([\s\S]*?)className="mt-10 columns-2 gap-5"/,
  '$1className="mt-10 columns-2 gap-3 [column-gap:0.75rem]"',
);
t = t.replace(
  'className="ai-step-in mb-5 break-inside-avoid"',
  'className="ai-step-in mb-3 break-inside-avoid"',
);

t = t.replace(/<\/?motion>/g, (m) => (m.startsWith("</") ? `</${D}>` : `<${D}>`));

fs.writeFileSync(path, t);
console.log("patched ok");
