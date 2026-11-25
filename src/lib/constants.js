import { Calendar, DollarSign, PieChart, Home, Target, Users, Settings as SettingsIcon, BarChart2, Building2, Layers } from 'lucide-react';


// 2.0 紙卡：實色卡面＋髮絲線＋柔和陰影（樣式在 index.css 的 .glass-card-fx / .glass-input-fx）。
// 名稱沿用 GLASS_* 以免大量改動呼叫端。
const GLASS_CARD = "glass-card-fx bg-white border rounded-3xl relative overflow-hidden group";
const GLASS_INPUT = "glass-input-fx w-full min-w-0 max-w-full box-border bg-white border transition-all duration-300 outline-none rounded-2xl text-base p-4 appearance-none";

const COLOR_VARIANTS = {
  slate: {
    bg: 'bg-[#EFEEEA]/60', border: 'border-[#E3E2DD]', text: 'text-[#4F5356]',
    iconBg: 'bg-[#EFEEEA]', iconText: 'text-[#85888A]', bar: 'bg-[#85888A]',
    glow: 'border-[#E3E2DD] shadow-sm'
  },
  stone: {
    bg: 'bg-[#F0F1EC]/60', border: 'border-[#DFE1D8]', text: 'text-[#5E6459]',
    iconBg: 'bg-[#F0F1EC]', iconText: 'text-[#8E9488]', bar: 'bg-[#8E9488]',
    glow: 'border-[#DFE1D8] shadow-sm'
  },
  sky: {
    bg: 'bg-[#F2F6FA]/50', border: 'border-[#CBDAE9]', text: 'text-[#557AA3]',
    iconBg: 'bg-[#F2F6FA]/70', iconText: 'text-[#7C9DC0]', bar: 'bg-[#7C9DC0]',
    glow: 'border-[#CBDAE9]/60 shadow-sm'
  },
  blue: {
    bg: 'bg-[#F4F4F8]/50', border: 'border-[#D4D3E4]', text: 'text-[#66659A]',
    iconBg: 'bg-[#F4F4F8]/70', iconText: 'text-[#8F8EB3]', bar: 'bg-[#8F8EB3]',
    glow: 'border-[#D4D3E4]/60 shadow-sm'
  },
  rose: {
    bg: 'bg-[#FBF3F2]/50', border: 'border-[#EDCDCA]', text: 'text-[#95564F]',
    iconBg: 'bg-[#FBF3F2]/70', iconText: 'text-[#C08480]', bar: 'bg-[#C08480]',
    glow: 'border-[#EDCDCA]/60 shadow-sm'
  },
  emerald: {
    bg: 'bg-[#F1F6F4]/50', border: 'border-[#C9DDD6]', text: 'text-[#4D7D70]',
    iconBg: 'bg-[#F1F6F4]/70', iconText: 'text-[#6B9A8D]', bar: 'bg-[#6B9A8D]',
    glow: 'border-[#C9DDD6]/60 shadow-sm'
  },
  amber: {
    bg: 'bg-[#FAF6EE]/50', border: 'border-[#F3EBDA]', text: 'text-[#8F7439]',
    iconBg: 'bg-[#FAF6EE]/70', iconText: 'text-[#C2A66E]', bar: 'bg-[#C2A66E]',
    glow: 'border-[#F3EBDA]/60 shadow-sm'
  },
  indigo: {
    bg: 'bg-[#F4F4F8]/50', border: 'border-[#D4D3E4]', text: 'text-[#66659A]',
    iconBg: 'bg-[#F4F4F8]/70', iconText: 'text-[#8F8EB3]', bar: 'bg-[#8F8EB3]',
    glow: 'border-[#D4D3E4]/60 shadow-sm'
  },
  cyan: {
    bg: 'bg-[#F0F6F6]/50', border: 'border-[#C4DEDE]', text: 'text-[#4E8486]',
    iconBg: 'bg-[#F0F6F6]/70', iconText: 'text-[#6FA3A4]', bar: 'bg-[#6FA3A4]',
    glow: 'border-[#C4DEDE]/60 shadow-sm'
  },
};

const DEFAULT_SETTINGS = { monthlyGroups: [], annualGroups: [], recurringItems: [], lastRecurringCheck: '' };
const DEFAULT_PRINCIPAL_CONFIG = { assets: { bank: [], invest: [] }, liabilities: { encumbrance: [] } };
const INCOME_CATEGORIES = ['薪水', '年終獎金', '激勵獎金', '其他獎金'];

const MENU_SECTIONS = [
  {
    title: '記帳功能',
    items: [
      { id: 'home', label: '帳務總覽', icon: Home },
      { id: 'calendar', label: '每日明細', icon: Calendar },
      { id: 'visualization', label: '支出分析', icon: BarChart2 },
      { id: 'income', label: '收入管理', icon: DollarSign },
      { id: 'settings', label: '預算設定', icon: SettingsIcon },
    ]
  },
  {
    title: '儲蓄功能',
    items: [
      { id: 'watchlist', label: '持股組合', icon: Layers },
      { id: 'stock_goals', label: '存股計畫', icon: Target },
      { id: 'partner', label: '佳欣儲蓄', icon: Users },
      { id: 'principal', label: '資產淨值', icon: PieChart },
      { id: 'mortgage', label: '房產投資', icon: Building2 },
    ]
  }
];
const MENU_ITEMS_FLAT = MENU_SECTIONS.flatMap(section => section.items);


// ─── Holdings View (持股檢視) ────────────────────────────────────────────────
// Distinct accent per holdings group so each section reads differently (not all one colour).
const HOLDINGS_GROUP_THEMES = ['sky', 'emerald', 'amber', 'rose', 'indigo', 'cyan', 'blue', 'slate'];
// theme.bar is e.g. "bg-[#7C9DC0]"; pull the raw hex for inline styles (donut fills, accents).
const barToHex = (barClass) => barClass.replace('bg-[', '').replace(']', '');

export { GLASS_CARD, GLASS_INPUT, COLOR_VARIANTS, DEFAULT_SETTINGS, DEFAULT_PRINCIPAL_CONFIG, INCOME_CATEGORIES, MENU_SECTIONS, MENU_ITEMS_FLAT, HOLDINGS_GROUP_THEMES, barToHex };
