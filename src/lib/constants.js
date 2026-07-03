import { Calendar, DollarSign, PieChart, Home, Target, Users, Settings as SettingsIcon, BarChart2, Building2, Layers } from 'lucide-react';


// Clear glass: low-opacity white fill + strong blur so the surface reads as real
// translucent glass (background colour shows through). Crisp light border + inset
// top highlight give the pane its edge. Background blobs are kept pale so content
// stays readable through the more transparent surface.
// 陰影/內光抽到 index.css 的 .glass-card-fx / .glass-input-fx，深色模式一併適配
const GLASS_CARD = "glass-card-fx bg-white/35 backdrop-blur-3xl backdrop-saturate-[1.8] border border-white/60 rounded-3xl relative overflow-hidden group";
const GLASS_INPUT = "glass-input-fx w-full min-w-0 max-w-full box-border bg-white/40 backdrop-blur-2xl backdrop-saturate-[1.8] border border-white/60 focus:bg-white/70 focus:border-[#7FB3D5] transition-all duration-300 outline-none rounded-2xl text-base p-4 appearance-none";

const COLOR_VARIANTS = {
  slate: {
    bg: 'bg-[#EDF2F7]/60', border: 'border-[#D6E0EA]', text: 'text-[#4A5A6A]',
    iconBg: 'bg-[#EDF2F7]', iconText: 'text-[#7C8C9C]', bar: 'bg-[#7C8C9C]',
    glow: 'border-[#D6E0EA] shadow-sm'
  },
  stone: {
    bg: 'bg-[#EAF0F6]/60', border: 'border-[#D8E2EB]', text: 'text-[#54636F]',
    iconBg: 'bg-[#EAF0F6]', iconText: 'text-[#8493A2]', bar: 'bg-[#8493A2]',
    glow: 'border-[#D8E2EB] shadow-sm'
  },
  sky: {
    bg: 'bg-[#EDF2FA]/50', border: 'border-[#D6E2F2]', text: 'text-[#5A7099]',
    iconBg: 'bg-[#EDF2FA]/70', iconText: 'text-[#7A96BE]', bar: 'bg-[#7A96BE]',
    glow: 'border-[#D6E2F2]/60 shadow-[0_0_16px_rgba(214,226,242,0.3)]'
  },
  blue: {
    bg: 'bg-[#EDE9F2]/50', border: 'border-[#DCD4E6]', text: 'text-[#7A6690]',
    iconBg: 'bg-[#EDE9F2]/70', iconText: 'text-[#9A85B0]', bar: 'bg-[#9A85B0]',
    glow: 'border-[#DCD4E6]/60 shadow-[0_0_16px_rgba(220,212,230,0.3)]'
  },
  rose: {
    bg: 'bg-[#FDECEA]/50', border: 'border-[#FADBD8]', text: 'text-[#C0392B]',
    iconBg: 'bg-[#FDECEA]/70', iconText: 'text-[#E57373]', bar: 'bg-[#E57373]',
    glow: 'border-[#FADBD8]/60 shadow-[0_0_16px_rgba(250,219,216,0.3)]'
  },
  emerald: {
    bg: 'bg-[#F1FAEE]/50', border: 'border-[#D8F3DC]', text: 'text-[#2D6A4F]',
    iconBg: 'bg-[#F1FAEE]/70', iconText: 'text-[#52B788]', bar: 'bg-[#52B788]',
    glow: 'border-[#D8F3DC]/60 shadow-[0_0_16px_rgba(216,243,220,0.3)]'
  },
  amber: {
    bg: 'bg-[#FEF9E7]/50', border: 'border-[#FCF3CF]', text: 'text-[#9A7D0A]',
    iconBg: 'bg-[#FEF9E7]/70', iconText: 'text-[#D4AC0D]', bar: 'bg-[#D4AC0D]',
    glow: 'border-[#FCF3CF]/60 shadow-[0_0_16px_rgba(252,243,207,0.3)]'
  },
  indigo: {
    bg: 'bg-[#EAEEF6]/50', border: 'border-[#CDD5E8]', text: 'text-[#4E5D82]',
    iconBg: 'bg-[#EAEEF6]/70', iconText: 'text-[#7889B0]', bar: 'bg-[#7889B0]',
    glow: 'border-[#CDD5E8]/60 shadow-[0_0_16px_rgba(205,213,232,0.3)]'
  },
  cyan: {
    bg: 'bg-[#E8F4F5]/50', border: 'border-[#C5E3E5]', text: 'text-[#3E8285]',
    iconBg: 'bg-[#E8F4F5]/70', iconText: 'text-[#5DAAAD]', bar: 'bg-[#5DAAAD]',
    glow: 'border-[#C5E3E5]/60 shadow-[0_0_16px_rgba(197,227,229,0.3)]'
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
// theme.bar is e.g. "bg-[#7A96BE]"; pull the raw hex for inline styles (donut fills, accents).
const barToHex = (barClass) => barClass.replace('bg-[', '').replace(']', '');

export { GLASS_CARD, GLASS_INPUT, COLOR_VARIANTS, DEFAULT_SETTINGS, DEFAULT_PRINCIPAL_CONFIG, INCOME_CATEGORIES, MENU_SECTIONS, MENU_ITEMS_FLAT, HOLDINGS_GROUP_THEMES, barToHex };
