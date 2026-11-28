import { createElement } from 'react';
import { getCategoryIcon, getBucketTone, BUCKET_TONE_CLASSES } from '../lib/categoryIcons';

// 分類圖示：Lucide 線條圖示放在該桶顏色的玻璃球裡
const SIZES = {
  sm: ['w-8 h-8', 'w-4 h-4'],
  md: ['w-10 h-10', 'w-[19px] h-[19px]'],
  xs: ['w-6 h-6', 'w-3 h-3'],
};
const CategoryIcon = ({ category, group, type, size = 'md' }) => {
  const tone = BUCKET_TONE_CLASSES[getBucketTone(type, group)];
  const [box, ico] = SIZES[size] || SIZES.md;
  return (
    <span className={`orb-icon ${tone} ${box}`} aria-hidden="true">
      {/* 圖示元件來自固定的對照表（模組層級），不是在 render 中新建的元件 */}
      {createElement(getCategoryIcon(category, group), { className: ico, strokeWidth: 2 })}
    </span>
  );
};

export default CategoryIcon;
