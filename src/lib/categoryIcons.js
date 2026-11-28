import {
  Utensils, Fuel, Dumbbell, Shirt, Smartphone, Stethoscope, House, Zap, Wrench, ShoppingBasket,
  Laptop, Tv, Package, ReceiptText, Receipt, ShieldCheck, Shield, GraduationCap, Car, Gift, Plane,
  Ticket, Bath, ToyBrick, Cat, Building2, Wallet, Globe, Star, HandCoins, CircleDashed,
} from 'lucide-react';

// 分類 → Lucide 圖示。先比對分類名稱，找不到再用群組名稱，最後用預設圖示。
// 分類名稱的「/」與「／」都接受（資料裡兩種寫法都有）。
const CATEGORY_ICONS = {
  '日常飲食': Utensils,
  '交通/油資': Fuel,
  '運動/娛樂': Dumbbell,
  '治裝/美容': Shirt,
  '手機話費': Smartphone,
  '醫療相關': Stethoscope,
  '房貸': House,
  '水/電費': Zap,
  '房屋雜支': Wrench,
  '糧食補給': ShoppingBasket,
  '生產力工具': Laptop,
  '影視相關': Tv,
  '雜支': Package,
  '所得稅務': ReceiptText,
  '汽機車稅務': Receipt,
  '汽車保險': ShieldCheck,
  '個人保險': Shield,
  '學貸': GraduationCap,
  '成大學費': GraduationCap,
  '汽車保養': Car,
  '汽機車維修': Wrench,
  '生日禮物': Gift,
  '過年紅包': HandCoins,
  '機票/飯店': Plane,
  '各類票券': Ticket,
  '洗澡/清潔': Bath,
  '玩具/生活用品': ToyBrick,
  '食物/貓砂': Cat,
  '管理/網路費': Building2,
};

const GROUP_ICONS = {
  '生活固定支出': Wallet,
  '房子固定支出': House,
  '網路會員': Globe,
  '保險/稅務': Shield,
  '節慶固定支出': Gift,
  '國內、外旅遊': Plane,
  '阿奇的支出': Cat,
  '社區費用': Building2,
  '特殊支出': Star,
};

// 「固定」性質的月度群組（每月金額幾乎不變），其餘月度群組視為「彈性」
const FIXED_MONTHLY_GROUPS = new Set(['房子固定支出', '網路會員']);

const norm = (s) => String(s ?? '').replace(/／/g, '/').trim();

const getCategoryIcon = (category, group) => {
  const c = norm(category);
  const g = norm(group);
  // 阿奇的醫療仍用聽診器，其餘阿奇支出統一用貓
  if (g === '阿奇的支出' && c !== '醫療相關') return Cat;
  return CATEGORY_ICONS[c] || GROUP_ICONS[g] || CircleDashed;
};

// 三桶色調：年度＝琥珀（amber）、固定＝靛紫（indigo）、彈性＝薄荷綠（emerald）
const getBucketTone = (type, group) => {
  if (type === 'annual') return 'annual';
  if (FIXED_MONTHLY_GROUPS.has(norm(group))) return 'fixed';
  return 'flex';
};

// 圖示球的樣式（index.css 的 .orb-*）
const BUCKET_TONE_CLASSES = {
  flex: 'orb-emerald',
  fixed: 'orb-indigo',
  annual: 'orb-amber',
};

export { getCategoryIcon, getBucketTone, BUCKET_TONE_CLASSES };
