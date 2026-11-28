import { Calendar, DollarSign, PieChart, Home, Target, Users, Settings as SettingsIcon, BarChart2, Building2, Layers } from 'lucide-react';


// 3.0 玻璃卡與輸入框（樣式在 index.css 的 .glass-card / .field）。名稱沿用 GLASS_*。
const GLASS_CARD = "glass-card";
const GLASS_INPUT = "field";

const COLOR_VARIANTS = {
  slate:   { bar: 'bg-[#85888A]' },
  stone:   { bar: 'bg-[#8E9488]' },
  sky:     { bar: 'bg-[#7C9DC0]' },
  blue:    { bar: 'bg-[#8F8EB3]' },
  rose:    { bar: 'bg-[#C08480]' },
  emerald: { bar: 'bg-[#6B9A8D]' },
  amber:   { bar: 'bg-[#C2A66E]' },
  indigo:  { bar: 'bg-[#A596BC]' },
  cyan:    { bar: 'bg-[#6FA3A4]' },
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
