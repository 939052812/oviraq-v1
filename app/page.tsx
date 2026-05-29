"use client";

import { useEffect, useRef, useState } from "react";

type GeneratedImageItem = { imageUrl?: string } | string;
type SelectOption = { label: string; value: string };

const IMAGE_PROVIDER = "xai";
const IMAGE_MODEL = "grok-imagine-image-quality";
const MODEL_LABEL = "Grok pro";
const modelOptions = [MODEL_LABEL];

type PlanItem = { title: string; description: string };

type ProductAnalysis = {
  categoryLabel: string;
  productForm: string;
  styleDirection: string;
  structureHints: string;
  sceneDirection: string;
  forbiddenScenes: string;
  factSafetyNote: string;
  planItems: PlanItem[];
};

type ProductFormResult = {
  productForm: string;
  sceneDirection: string;
  forbiddenScenes: string;
};

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
const modelOptions = ["Grok pro"];
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

const MAIN_QUANTITY_OPTIONS = ["1 张", "2 张", "3 张", "4 张", "5 张", "6 张"];
const DETAIL_QUANTITY_OPTIONS = Array.from({ length: 15 }, (_, i) => `${i + 1} 张`);

const DEFAULT_FORM_RESULT: ProductFormResult = {
  productForm: "根据商品图智能识别",
  sceneDirection: "根据一级类目、商品图、目标平台和产品信息自动匹配商业摄影场景。",
  forbiddenScenes: "避免复制参考图背景，避免凭空添加不可见部件，避免虚构客观参数。",
};

const MAIN_PLAN_TAIL: PlanItem[] = [
  { title: "材质细节图", description: "展示材质、纹理、工艺、图案和关键细节。" },
  { title: "生活方式图", description: "匹配目标用户的真实生活方式和种草氛围。" },
  { title: "多角度/组合图", description: "展示多角度、部件关系或组合陈列，仅基于可见/已提供信息。" },
];

const DETAIL_PLAN_TEMPLATES: PlanItem[] = [
  { title: "详情页首屏图", description: "建立商品质感和详情页第一视觉。" },
  { title: "核心卖点图", description: "突出最重要的卖点和视觉记忆点。" },
  { title: "结构/部件说明图", description: "说明商品可见结构、部件关系和使用状态。" },
  { title: "功能机制展示图", description: "展示核心功能、使用步骤或工作机制。" },
  { title: "使用场景图", description: "展示真实使用环境和场景价值。" },
  { title: "工艺材质细节图", description: "展示材质、纹理、工艺、做工细节。" },
  {
    title: "尺寸/容量/规格图",
    description: "仅在客户填写，或上传产品图/包装/标签/说明文字中清晰可见时展示；不能凭空生成参数。",
  },
  { title: "痛点解决图", description: "基于用户提供的痛点或卖点做视觉表达，不编造夸张对比。" },
  { title: "适用人群/适用场景图", description: "展示目标用户、使用环境或赠礼场景。" },
  { title: "细节对比图", description: "展示可见细节差异、工艺优势或结构优势，不编造竞品数据。" },
  { title: "包装/礼赠/收纳图", description: "仅在包装、礼盒、收纳配件可见或用户明确提供时展示。" },
  { title: "注意事项/使用提示图", description: "仅基于客户提供或包装说明文字中清晰可见的信息，不编造警示内容。" },
  { title: "多规格/多颜色/组合图", description: "仅在用户上传或填写了多规格、多颜色、套装信息时展示。" },
  { title: "品牌氛围图", description: "加强整体品牌调性和详情页高级感，不虚构品牌信息。" },
  { title: "收尾转化图", description: "强化购买理由、生活方式价值或场景总结，不编造参数和承诺。" },
];

const FACT_SAFETY_NOTE =
  "尺寸、容量、重量、材质、认证、适用范围、注意事项等客观参数，只能来自客户填写，或上传产品图/包装/标签/说明文字中清晰可见的信息；如果没有明确来源，系统不会凭空生成。";

function parseQuantity(value: string): number {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : 1;
}

function clampQuantity(count: number, imageType: string): number {
  if (imageType === "main") return Math.min(6, Math.max(1, count));
  return Math.min(15, Math.max(1, count));
}

function containsAny(text: string, keywords: string[]): boolean {
  return keywords.some((kw) => text.includes(kw));
}

function detectCategoryLabel(productInfo: string): string {
  if (
    containsAny(productInfo, [
      "茶具",
      "茶杯",
      "水杯",
      "杯子",
      "杯具",
      "茶壶",
      "茶漏",
      "茶滤",
      "滤杯",
      "杯盖",
      "陶瓷",
      "瓷器",
      "泡茶",
      "品茗",
      "茶席",
      "国风",
      "新中式",
      "东方",
      "禅意",
    ])
  ) {
    return "茶具/杯具";
  }
  if (
    containsAny(productInfo, [
      "服装",
      "女装",
      "男装",
      "裙",
      "连衣裙",
      "裤",
      "上衣",
      "外套",
      "鞋",
      "包",
      "穿搭",
      "面料",
      "版型",
      "领口",
      "袖口",
      "腰线",
    ])
  ) {
    return "服饰鞋包";
  }
  if (
    containsAny(productInfo, [
      "美妆",
      "护肤",
      "面霜",
      "精华",
      "口红",
      "香水",
      "洗发",
      "沐浴",
      "粉底",
      "面膜",
      "乳液",
      "防晒",
    ])
  ) {
    return "美妆个护";
  }
  if (
    containsAny(productInfo, [
      "食品",
      "零食",
      "饮料",
      "饮品",
      "茶叶",
      "咖啡",
      "牛奶",
      "酸奶",
      "果汁",
      "饼干",
      "调味",
      "酱",
      "奶茶",
      "矿泉水",
      "气泡水",
      "益生菌",
      "乳酸菌",
    ])
  ) {
    return "食品饮品";
  }
  if (
    containsAny(productInfo, [
      "手机",
      "耳机",
      "充电",
      "键盘",
      "鼠标",
      "电脑",
      "数据线",
      "支架",
      "数码",
      "电子",
      "屏幕",
      "接口",
      "蓝牙",
    ])
  ) {
    return "数码电子";
  }
  if (
    containsAny(productInfo, [
      "家居",
      "厨房",
      "收纳",
      "餐具",
      "碗",
      "锅",
      "盘",
      "架",
      "清洗",
      "沥水",
      "置物",
      "杯架",
      "刀具",
      "砧板",
    ])
  ) {
    return "餐厨/家居用品";
  }
  if (
    containsAny(productInfo, [
      "小家电",
      "电器",
      "电饭煲",
      "空气炸锅",
      "咖啡机",
      "吹风机",
      "吸尘器",
      "加湿器",
      "风扇",
      "电热水壶",
      "破壁机",
    ])
  ) {
    return "小家电";
  }
  if (
    containsAny(productInfo, [
      "母婴",
      "宝宝",
      "婴儿",
      "儿童",
      "玩具",
      "奶瓶",
      "纸尿裤",
      "童装",
      "儿童餐具",
    ])
  ) {
    return "母婴儿童";
  }
  if (
    containsAny(productInfo, [
      "运动",
      "健身",
      "户外",
      "露营",
      "瑜伽",
      "跑步",
      "骑行",
      "旅行",
      "登山",
      "防晒衣",
      "运动杯",
    ])
  ) {
    return "户外运动";
  }
  if (
    containsAny(productInfo, [
      "宠物",
      "猫",
      "狗",
      "猫粮",
      "狗粮",
      "猫砂",
      "宠物窝",
      "牵引绳",
      "宠物玩具",
    ])
  ) {
    return "宠物用品";
  }
  return "智能识别中 / 通用商品";
}

function detectFoodProductForm(text: string): ProductFormResult {
  if (
    containsAny(text, [
      "瓶装",
      "瓶",
      "饮料",
      "饮品",
      "果汁",
      "茶饮",
      "乳酸菌",
      "益生菌",
      "汽水",
      "气泡水",
      "矿泉水",
      "纯净水",
      "奶茶",
      "酸奶",
      "牛奶",
    ])
  ) {
    return {
      productForm: "瓶装饮料",
      sceneDirection:
        "瓶身主视觉、冷藏冰感、水珠、倒入杯中、手持饮用、餐桌/办公室/通勤/户外饮用场景、包装标签细节。",
      forbiddenScenes: "开袋、冲泡、撒粉、拆解结构、袋装零食分享场景。",
    };
  }
  if (containsAny(text, ["罐装", "易拉罐", "罐", "汽水罐", "咖啡罐"])) {
    return {
      productForm: "罐装饮料",
      sceneDirection: "罐身主视觉、冰感水珠、开罐瞬间、手持饮用、冰箱/户外/聚会场景、包装标签细节。",
      forbiddenScenes: "开袋、冲泡、倒粉、袋装零食场景。",
    };
  }
  if (containsAny(text, ["袋装", "零食", "薯片", "饼干", "坚果", "糖果", "膨化", "开袋"])) {
    return {
      productForm: "袋装零食",
      sceneDirection: "包装主视觉、开袋展示、倒出内容物、分享场景、食用状态、风味氛围、包装细节。",
      forbiddenScenes: "冲泡、冷藏瓶身水珠、开瓶、倒入杯中。",
    };
  }
  if (containsAny(text, ["冲泡", "速溶", "粉", "咖啡粉", "奶粉", "茶包", "燕麦", "冲调", "代餐粉"])) {
    return {
      productForm: "冲泡饮品",
      sceneDirection: "包装主视觉、倒水冲泡、搅拌、杯中成品、早餐/办公饮用场景、风味氛围。",
      forbiddenScenes: "开袋即食、冷藏瓶身水珠、开瓶饮用。",
    };
  }
  if (containsAny(text, ["酱", "调味", "调料", "蘸料", "辣酱", "沙拉酱", "火锅底料"])) {
    return {
      productForm: "调味酱料",
      sceneDirection: "瓶罐主视觉、烹饪搭配、蘸取使用、餐桌场景、食材搭配、标签细节。",
      forbiddenScenes: "冷藏饮料水珠、冲泡饮品场景、零食开袋分享。",
    };
  }
  if (containsAny(text, ["茶叶", "咖啡豆", "咖啡", "茶包", "挂耳", "冷萃"])) {
    return {
      productForm: "茶叶/咖啡",
      sceneDirection: "包装主视觉、冲泡/萃取过程、杯中成品、茶桌/咖啡桌、香气氛围、包装细节。",
      forbiddenScenes: "瓶装饮料冷藏水珠、袋装零食开袋即食。",
    };
  }
  return {
    productForm: "食品饮品 / 通用包装食品",
    sceneDirection: "包装展示、食用/饮用状态、餐桌场景、风味氛围、细节展示。",
    forbiddenScenes: "不要默认出现开袋或冲泡，除非文本命中袋装或冲泡相关关键词。",
  };
}

function detectTeaProductForm(text: string): ProductFormResult {
  if (containsAny(text, ["滤杯", "茶漏", "茶滤", "过滤", "可拆卸", "分体"])) {
    return {
      productForm: "带滤杯/茶漏结构",
      sceneDirection: "安全结构展示、半打开、俯视、分层、可拆卸部件关系、真实过滤结构。",
      forbiddenScenes: "凭空增加不存在的孔洞、把孔洞生成到错误部位、复杂倒水动作导致结构变形。",
    };
  }
  if (containsAny(text, ["茶具", "茶壶", "盖碗", "茶盘", "茶器", "品茗", "茶席"])) {
    return {
      productForm: "茶具/茶器",
      sceneDirection: "东方茶席、新中式木质茶桌、茶室窗影、陶瓷/竹/木/麻布/石材质感、温润自然光。",
      forbiddenScenes: "西式早餐面包、绿色沙发客厅、随机花瓶摆拍、复制参考图桌面/托盘/背景。",
    };
  }
  if (containsAny(text, ["水杯", "杯子", "杯具", "马克杯", "保温杯", "随行杯"])) {
    return {
      productForm: "杯具/水杯",
      sceneDirection: "杯身主视觉、饮用场景、餐桌/办公桌/通勤/居家场景、杯口/材质/手持细节。",
      forbiddenScenes: "凭空添加茶漏、滤杯、吸管、盖子或配件；除非用户填写或图片可见。",
    };
  }
  return DEFAULT_FORM_RESULT;
}

function detectBeautyProductForm(text: string): ProductFormResult {
  if (containsAny(text, ["香水", "香氛", "淡香", "浓香"])) {
    return {
      productForm: "香水",
      sceneDirection: "瓶身光影、喷雾氛围、礼赠场景、高级材质背景、包装细节。",
      forbiddenScenes: "虚构香调、虚构容量，除非用户填写或标签可见。",
    };
  }
  if (containsAny(text, ["口红", "唇釉", "粉底", "眼影", "腮红", "彩妆"])) {
    return {
      productForm: "口红彩妆",
      sceneDirection: "膏体/色号展示、试色、妆容氛围、手持、镜前场景、包装细节。",
      forbiddenScenes: "虚构色号、虚构功效、过度医疗化表达。",
    };
  }
  if (containsAny(text, ["面霜", "精华", "乳液", "爽肤水", "护肤", "瓶", "罐"])) {
    return {
      productForm: "护肤瓶罐",
      sceneDirection: "瓶身主视觉、梳妆台、浴室、质地展示、手持、礼盒陈列、包装细节。",
      forbiddenScenes: "虚构医学功效、虚构认证、虚构成分数据。",
    };
  }
  return DEFAULT_FORM_RESULT;
}

function detectApparelProductForm(text: string): ProductFormResult {
  if (containsAny(text, ["连衣裙", "裙", "半身裙"])) {
    return {
      productForm: "连衣裙/裙装",
      sceneDirection: "模特穿搭、街拍、棚拍、面料细节、裙摆动态、版型展示。",
      forbiddenScenes: "改变领口、袖型、长度、版型、图案和颜色。",
    };
  }
  if (containsAny(text, ["上衣", "衬衫", "T恤", "外套", "毛衣", "卫衣"])) {
    return {
      productForm: "上衣/外套",
      sceneDirection: "模特穿搭、街拍、棚拍、领口/袖口/面料细节、生活方式场景。",
      forbiddenScenes: "改变版型、领口、纽扣、图案和材质。",
    };
  }
  if (containsAny(text, ["鞋", "靴", "运动鞋", "高跟鞋", "凉鞋"])) {
    return {
      productForm: "鞋靴",
      sceneDirection: "脚穿展示、鞋面细节、鞋底、防滑纹路、街拍/通勤/运动场景。",
      forbiddenScenes: "鞋型变形、左右脚错误、鞋底纹路乱变。",
    };
  }
  if (containsAny(text, ["包", "手提包", "斜挎包", "双肩包", "托特包"])) {
    return {
      productForm: "包袋",
      sceneDirection: "手持/肩背/通勤/街拍、容量展示、五金细节、材质纹理。",
      forbiddenScenes: "凭空添加不存在的肩带、五金、拉链或挂件。",
    };
  }
  return DEFAULT_FORM_RESULT;
}

function detectDigitalProductForm(text: string): ProductFormResult {
  if (containsAny(text, ["手机壳", "支架", "膜", "保护壳"])) {
    return {
      productForm: "手机配件",
      sceneDirection: "手机搭配、桌面办公、手持、安装状态、材质细节。",
      forbiddenScenes: "错误机型、错误孔位、按钮/摄像头位置错误。",
    };
  }
  if (containsAny(text, ["耳机", "蓝牙", "音箱", "音响"])) {
    return {
      productForm: "耳机/音频",
      sceneDirection: "佩戴/桌面/通勤/运动场景、充电盒、接口、材质细节。",
      forbiddenScenes: "凭空增加按钮、接口、屏幕。",
    };
  }
  if (containsAny(text, ["充电器", "数据线", "快充", "插头", "接口"])) {
    return {
      productForm: "充电器/数据线",
      sceneDirection: "接口特写、使用连接、桌面充电、线材材质、便携场景。",
      forbiddenScenes: "接口类型错误、线材数量错误、虚构功率。",
    };
  }
  return DEFAULT_FORM_RESULT;
}

function detectHomeProductForm(text: string): ProductFormResult {
  if (containsAny(text, ["厨房", "刀具", "砧板", "锅", "铲", "勺", "清洗"])) {
    return {
      productForm: "厨房工具",
      sceneDirection: "厨房台面、烹饪动作、清洗、收纳、材质细节。",
      forbiddenScenes: "结构变形、危险错误使用、凭空添加配件。",
    };
  }
  if (containsAny(text, ["收纳", "置物", "架", "盒", "篮", "挂架"])) {
    return {
      productForm: "收纳置物",
      sceneDirection: "使用前后、空间整理、承重展示、安装状态、细节结构。",
      forbiddenScenes: "虚构承重数字、错误安装方式、尺寸乱编。",
    };
  }
  if (containsAny(text, ["餐具", "碗", "盘", "杯", "碟", "勺"])) {
    return {
      productForm: "餐具器皿",
      sceneDirection: "餐桌摆放、食物搭配、材质细节、生活方式场景。",
      forbiddenScenes: "不相关配件、错误材质、过度复杂背景。",
    };
  }
  return DEFAULT_FORM_RESULT;
}

function detectApplianceProductForm(text: string): ProductFormResult {
  if (containsAny(text, ["电饭煲", "空气炸锅", "咖啡机", "破壁机", "电热水壶"])) {
    return {
      productForm: "厨房小家电",
      sceneDirection: "厨房台面、操作面板、使用步骤、成品展示、细节接口。",
      forbiddenScenes: "虚构参数、错误按钮、危险使用。",
    };
  }
  if (containsAny(text, ["吹风机", "吸尘器", "加湿器", "风扇"])) {
    return {
      productForm: "生活电器",
      sceneDirection: "真实使用、功能状态、家居空间、细节结构、生活方式。",
      forbiddenScenes: "错误结构、虚构功率、错误使用动作。",
    };
  }
  return DEFAULT_FORM_RESULT;
}

function detectProductForm(text: string, categoryLabel: string): ProductFormResult {
  switch (categoryLabel) {
    case "食品饮品":
      return detectFoodProductForm(text);
    case "茶具/杯具":
      return detectTeaProductForm(text);
    case "美妆个护":
      return detectBeautyProductForm(text);
    case "服饰鞋包":
      return detectApparelProductForm(text);
    case "数码电子":
      return detectDigitalProductForm(text);
    case "餐厨/家居用品":
      return detectHomeProductForm(text);
    case "小家电":
      return detectApplianceProductForm(text);
    default:
      return DEFAULT_FORM_RESULT;
  }
}

function detectStyleDirection(productInfo: string): string {
  if (containsAny(productInfo, ["国风", "新中式", "东方", "茶席", "禅意", "宋韵"])) {
    return "新中式 / 东方茶席";
  }
  if (containsAny(productInfo, ["日式", "侘寂", "原木", "和风"])) {
    return "日式 / 原木侘寂";
  }
  if (containsAny(productInfo, ["现代", "极简", "简约", "高级感"])) {
    return "现代极简 / 高级商业摄影";
  }
  if (containsAny(productInfo, ["小红书", "奶油风", "可爱", "少女", "种草"])) {
    return "小红书奶油风 / 生活方式种草";
  }
  if (containsAny(productInfo, ["轻奢", "高端", "礼盒", "送礼"])) {
    return "轻奢礼赠 / 高端光影";
  }
  if (containsAny(productInfo, ["户外", "露营", "运动", "旅行"])) {
    return "户外真实使用感";
  }
  if (containsAny(productInfo, ["清爽", "健康"])) {
    return "清爽健康 / 日常饮用";
  }
  return "根据商品图智能匹配";
}

function detectStructureHints(productInfo: string, productForm: string): string {
  if (productForm === "带滤杯/茶漏结构") {
    return "检测到滤杯/茶漏结构需求，后续功能图应优先展示真实过滤结构，但不凭空增加不存在的部件。";
  }
  if (containsAny(productInfo, ["滤杯", "茶漏", "茶滤", "过滤"])) {
    return "检测到滤杯/茶漏结构需求，后续功能图应优先展示真实过滤结构，但不凭空增加不存在的部件。";
  }
  if (containsAny(productInfo, ["杯盖", "盖子", "盖"])) {
    return "检测到盖体结构，后续图组应保持盖体和主体关系准确。";
  }
  if (containsAny(productInfo, ["可拆卸", "拆卸", "分体", "组合"])) {
    return "检测到可拆卸/组合结构，后续功能图适合展示拆解、分层或半打开结构。";
  }
  return "根据上传商品图识别可见结构，不凭空添加配件。";
}

function enhanceSceneWithStyle(
  sceneDirection: string,
  styleDirection: string,
  productForm: string,
  productInfo: string,
): string {
  const styleNotes: string[] = [];

  if (productForm === "瓶装饮料" && containsAny(productInfo, ["清爽", "健康"])) {
    styleNotes.push("冷藏冰感、清透背景、水珠、日常饮用");
  }
  if (productForm === "茶具/茶器" && styleDirection.includes("新中式")) {
    styleNotes.push("东方茶席、木质茶桌、茶室窗影");
  }
  if (productForm === "连衣裙/裙装" && styleDirection.includes("小红书")) {
    styleNotes.push("街拍、生活方式、种草场景");
  }
  if (productForm === "护肤瓶罐" && styleDirection.includes("轻奢")) {
    styleNotes.push("高级光影、礼盒、梳妆台");
  }

  if (styleNotes.length === 0) {
    return sceneDirection;
  }
  return `${sceneDirection}（风格补充：${styleNotes.join("、")}）`;
}

function getMainPlanTemplates(productForm: string): PlanItem[] {
  switch (productForm) {
    case "瓶装饮料":
      return [
        { title: "主视觉图", description: "突出瓶身、标签、质感和点击率，背景不默认纯白。" },
        { title: "饮用场景图", description: "展示日常饮用、餐桌、办公室、通勤、户外或清爽生活方式场景。" },
        { title: "包装/标签细节图", description: "展示瓶身包装、标签、口味信息和可见文字细节，不编造参数。" },
        ...MAIN_PLAN_TAIL,
      ];
    case "袋装零食":
      return [
        { title: "包装主视觉图", description: "突出包装袋、品牌标识和食欲感，背景不默认纯白。" },
        { title: "开袋/内容物展示图", description: "展示开袋状态、内容物质感和真实分量，不编造配料。" },
        { title: "食用/分享场景图", description: "展示分享、食用状态和生活方式种草氛围。" },
        ...MAIN_PLAN_TAIL,
      ];
    case "冲泡饮品":
      return [
        { title: "包装主视觉图", description: "突出包装、品牌和冲调品类识别度。" },
        { title: "冲泡过程图", description: "展示倒水冲泡、搅拌等真实冲调过程。" },
        { title: "杯中成品/饮用场景图", description: "展示杯中成品、饮用场景和风味氛围。" },
        ...MAIN_PLAN_TAIL,
      ];
    case "护肤瓶罐":
      return [
        { title: "瓶身主视觉图", description: "突出瓶罐造型、质感和品牌识别度。" },
        { title: "质地/成分氛围图", description: "展示质地、膏体或使用氛围，不编造成分数据。" },
        { title: "梳妆台/浴室使用场景图", description: "展示梳妆台、浴室等真实使用场景。" },
        ...MAIN_PLAN_TAIL,
      ];
    case "连衣裙/裙装":
      return [
        { title: "模特主视觉图", description: "突出整体穿搭、版型和视觉记忆点。" },
        { title: "街拍/穿搭场景图", description: "展示街拍、生活方式或种草穿搭场景。" },
        { title: "面料/领口/版型细节图", description: "展示面料、领口、袖型和版型细节，不改变原有设计。" },
        ...MAIN_PLAN_TAIL,
      ];
    default:
      return [
        { title: "主视觉图", description: "突出商品主体、质感、点击率，背景不默认纯白。" },
        { title: "风格场景图", description: "根据类目和风格 DNA 生成真实使用场景，不复制参考图背景。" },
        { title: "功能/结构图", description: "展示真实功能机制或可见结构，不凭空添加部件。" },
        ...MAIN_PLAN_TAIL,
      ];
  }
}

function getDetailPlanTemplates(productForm: string): PlanItem[] {
  if (productForm === "瓶装饮料") {
    return [
      { title: "详情页首屏图", description: "建立商品质感和详情页第一视觉。" },
      { title: "核心卖点图", description: "突出最重要的卖点和视觉记忆点。" },
      { title: "瓶身/标签细节图", description: "展示瓶身、标签和可见文字细节，不编造参数。" },
      { title: "饮用场景图", description: "展示日常饮用、餐桌、办公室、通勤或户外场景。" },
      { title: "口味/风味氛围图", description: "通过色彩、光影和搭配营造风味氛围，不编造口味承诺。" },
      { title: "包装材质细节图", description: "展示瓶身材质、标签工艺和包装细节。" },
      {
        title: "容量/规格图",
        description: "仅在客户填写或图片清晰可见时使用；不能凭空生成参数。",
      },
      { title: "适用场景图", description: "展示目标饮用环境和场景价值。" },
      { title: "适用人群图", description: "展示目标人群和饮用场景，不编造人群数据。" },
      { title: "冷藏/冰感氛围图", description: "展示冷藏、冰感和清爽饮用氛围。" },
      { title: "包装展示图", description: "展示完整包装和陈列状态。" },
      {
        title: "注意事项/储存提示图",
        description: "仅基于清晰可见文字或客户填写，不编造警示内容。",
      },
      { title: "多口味/多规格图", description: "仅在用户提供多口味或多规格信息时展示。" },
      { title: "品牌氛围图", description: "加强整体品牌调性和详情页高级感，不虚构品牌信息。" },
      { title: "收尾转化图", description: "强化购买理由和场景总结，不编造参数和承诺。" },
    ];
  }
  return DETAIL_PLAN_TEMPLATES;
}

function buildLocalProductAnalysis({
  productInfo,
  imageType,
  count,
}: {
  productInfo: string;
  imageType: string;
  platform: string;
  targetLanguage: string;
  count: number;
  uploadedImageCount: number;
}): ProductAnalysis {
  const text = productInfo.trim();
  const categoryLabel = detectCategoryLabel(text);
  const { productForm, sceneDirection: formScene, forbiddenScenes } = detectProductForm(text, categoryLabel);
  const styleDirection = detectStyleDirection(text);
  const structureHints = detectStructureHints(text, productForm);
  const sceneDirection = enhanceSceneWithStyle(formScene, styleDirection, productForm, text);
  const templates = imageType === "main" ? getMainPlanTemplates(productForm) : getDetailPlanTemplates(productForm);
  const maxCount = imageType === "main" ? 6 : 15;
  const planItems = templates.slice(0, Math.min(count, maxCount));

  return {
    categoryLabel,
    productForm,
    styleDirection,
    structureHints,
    sceneDirection,
    forbiddenScenes,
    factSafetyNote: FACT_SAFETY_NOTE,
    planItems,
  };
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
  const [stage, setStage] = useState<"idle" | "generating" | "results">("idle");
  const [preview, setPreview] = useState<number | null>(null);
  const [imageType, setImageType] = useState("main");
  const [openSelectId, setOpenSelectId] = useState<string | null>(null);
  const [platform, setPlatform] = useState("智能匹配");
  const [productInfo, setProductInfo] = useState("");
  const [language, setLanguage] = useState("无文字(纯视觉)");
  const [model, setModel] = useState("Grok pro");
  const [selectedRatio, setSelectedRatio] = useState("1:1 正方形");
  const [quality, setQuality] = useState("标准");
  const [quantity, setQuantity] = useState("1 张");
  const [analysisPreview, setAnalysisPreview] = useState<ProductAnalysis | null>(null);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [productImages, setProductImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const quantityOptions = imageType === "main" ? MAIN_QUANTITY_OPTIONS : DETAIL_QUANTITY_OPTIONS;

  useEffect(() => {
    const urls = productImages.map((file) => URL.createObjectURL(file));
    setPreviewUrls(urls);
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [productImages]);

  useEffect(() => {
    const count = parseQuantity(quantity);
    const clamped = clampQuantity(count, imageType);
    if (clamped !== count) {
      setQuantity(`${clamped} 张`);
    }
  }, [imageType, quantity]);

  useEffect(() => {
    setAnalysisPreview(null);
  }, [uploadedFiles, imageType, platform, productInfo, language, model, selectedRatio, quality, quantity]);

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

  function handleImageTypeChange(type: "main" | "detail") {
    setImageType(type);
    const count = parseQuantity(quantity);
    const clamped = clampQuantity(count, type);
    if (clamped !== count) {
      setQuantity(`${clamped} 张`);
    }
  }

  function runLocalAnalysis(): ProductAnalysis {
    const count = clampQuantity(parseQuantity(quantity), imageType);
    return buildLocalProductAnalysis({
      productInfo,
      imageType,
      platform,
      targetLanguage: language,
      count,
      uploadedImageCount: uploadedFiles.length,
    });
  }

  function handleAnalyzeProduct() {
    if (uploadedFiles.length === 0) {
      alert("请至少上传 1 张商品图");
      return;
    }
    setAnalysisPreview(runLocalAnalysis());
    setStage("idle");
  }

  function handleReAnalyze() {
    setAnalysisPreview(runLocalAnalysis());
  }

  async function handleGenerateImages() {
    if (uploadedFiles.length === 0) {
      alert("请至少上传 1 张商品图");
      return;
    }
    if (!analysisPreview) {
      return;
    }

    setStage("generating");

    const count = parseCount(quantity);
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
    function close(e: KeyboardEvent) {
      if (e.key === "Escape") setPreview(null);
    }
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  const isGenerating = stage === "generating";

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
              onClick={() => handleImageTypeChange("main")}
              className={`rounded-full py-2 text-sm ${imageType === "main" ? "bg-black font-medium text-white" : "text-black/55"}`}
            >
              主图
            </button>
            <button
              onClick={() => handleImageTypeChange("detail")}
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
              value={productInfo}
              onChange={(e) => setProductInfo(e.target.value)}
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
            onClick={analysisPreview ? handleGenerateImages : handleAnalyzeProduct}
            disabled={isGenerating}
            className="mt-5 h-12 w-full rounded-full bg-black text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:bg-black/40 disabled:hover:opacity-100"
          >
            {isGenerating ? "生成中..." : analysisPreview ? "确认生成图片" : "分析产品"}
          </button>
        </aside>

        <section className="min-w-0 flex-1 overflow-y-auto rounded-[30px] bg-white p-8 shadow-sm">
          {stage === "idle" && !analysisPreview && <EmptyState imageType={imageType} />}
          {stage === "idle" && analysisPreview && (
            <ProductAnalysisCard
              analysis={analysisPreview}
              isGenerating={isGenerating}
              onReAnalyze={handleReAnalyze}
              onConfirmGenerate={handleGenerateImages}
            />
          )}
          {stage === "generating" && <Generating />}
          {stage === "results" && (
            <Results
              images={generatedImages}
              platform={platform}
              ratio={selectedRatio}
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

function ProductAnalysisCard({
  analysis,
  isGenerating,
  onReAnalyze,
  onConfirmGenerate,
}: {
  analysis: ProductAnalysis;
  isGenerating: boolean;
  onReAnalyze: () => void;
  onConfirmGenerate: () => void;
}) {
  return (
    <div>
      <p className="text-sm text-black/35">Oviraq AI · 产品分析</p>
      <h2 className="mt-2 text-3xl font-semibold">AI 产品分析结果</h2>

      <div className="mt-8 rounded-[28px] border border-black/10 bg-[#fafafa] p-6">
        <div className="space-y-3 text-sm leading-7 text-black/70">
          <p>
            <span className="font-medium text-black">识别类目：</span>
            {analysis.categoryLabel}
          </p>
          <p>
            <span className="font-medium text-black">产品形态：</span>
            {analysis.productForm}
          </p>
          <p>
            <span className="font-medium text-black">风格方向：</span>
            {analysis.styleDirection}
          </p>
          <p>
            <span className="font-medium text-black">结构提示：</span>
            {analysis.structureHints}
          </p>
          <p>
            <span className="font-medium text-black">推荐场景：</span>
            {analysis.sceneDirection}
          </p>
          <p>
            <span className="font-medium text-black">禁止场景：</span>
            {analysis.forbiddenScenes}
          </p>
          <p>
            <span className="font-medium text-black">事实参数规则：</span>
            {analysis.factSafetyNote}
          </p>
        </div>

        <div className="mt-8 border-t border-black/8 pt-6">
          <h3 className="text-lg font-semibold">图组规划</h3>
          <div className="mt-4 space-y-4">
            {analysis.planItems.map((item, index) => (
              <div key={`${item.title}-${index}`} className="rounded-[18px] border border-black/8 bg-white p-4">
                <p className="text-sm font-semibold">
                  #{String(index + 1).padStart(2, "0")} {item.title}
                </p>
                <p className="mt-2 text-sm leading-6 text-black/55">{item.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <button
            type="button"
            onClick={onReAnalyze}
            disabled={isGenerating}
            className="h-12 flex-1 rounded-full border border-black/10 text-sm font-medium transition hover:bg-white disabled:opacity-40"
          >
            重新分析
          </button>
          <button
            type="button"
            onClick={onConfirmGenerate}
            disabled={isGenerating}
            className="h-12 flex-1 rounded-full bg-black text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:bg-black/40"
          >
            {isGenerating ? "生成中..." : "确认生成图片"}
          </button>
        </div>
      </div>
    </div>
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
          点击「分析产品」获取 AI 图组规划
        </p>
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
  platform,
  ratio,
  onBack,
  onPreview,
}: {
  images: string[];
  platform: string;
  ratio: string;
  onBack: () => void;
  onPreview: (i: number) => void;
}) {
  const ratioLabel = ratio.split(" ")[0];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-black/35">Oviraq AI · 生成结果</p>
          <h2 className="mt-2 text-3xl font-semibold">商业视觉生成结果</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              `已生成 ${images.length} 张`,
              "模型 Grok pro",
              `平台 ${platform}`,
              `尺寸 ${ratioLabel}`,
            ].map((item) => (
              <span
                key={item}
                className="rounded-full bg-[#f4f4f5] px-3 py-1.5 text-xs text-black/70"
              >
                {item}
              </span>
            ))}
          </div>
          <p className="mt-3 text-black/45">已生成 {images.length} 张符合平台策略的商业视觉内容</p>
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
