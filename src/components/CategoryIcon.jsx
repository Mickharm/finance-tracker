import { createElement } from 'react';
import { getCategoryIcon, getBucketTone, BUCKET_TONE_CLASSES } from '../lib/categoryIcons';

// 分類小圖示：Lucide 線條圖示＋該桶顏色的淡色圓底
const CategoryIcon = ({ category, group, type, size = 'md' }) => {
  const tone = BUCKET_TONE_CLASSES[getBucketTone(type, group)];
  const box = size === 'sm' ? 'w-7 h-7' : 'w-9 h-9';
  const ico = size === 'sm' ? 'w-3.5 h-3.5' : 'w-[18px] h-[18px]';
  return (
    <span className={`${box} ${tone} rounded-full flex items-center justify-center shrink-0`} aria-hidden="true">
      {/* 圖示元件來自固定的對照表（模組層級），不是在 render 中新建的元件 */}
      {createElement(getCategoryIcon(category, group), { className: ico, strokeWidth: 1.6 })}
    </span>
  );
};

export default CategoryIcon;
