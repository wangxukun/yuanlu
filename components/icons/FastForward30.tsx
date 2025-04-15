// components/icons/FastForward.tsx
import React from "react";

interface SVGProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

const FastForward: React.FC<SVGProps> = ({
  size = 54,
  fill = "#000",
  ...props
}) => (
  <svg
    data-name="Layer 1"
    id="Layer_1"
    viewBox="0 0 32 32"
    width={size}
    height={size}
    className={fill}
    {...props}
    xmlns="http://www.w3.org/2000/svg"
  >
    <title />
    <path d="M23,15a1,1,0,0,0-1,1,6,6,0,1,1-2.7-5H19a1,1,0,0,0,0,2h3a1,1,0,0,0,1-1V9a1,1,0,0,0-2,0v.77A8,8,0,1,0,24,16,1,1,0,0,0,23,15Z" />
    {/* 新增数字30 */}
    <text
      x="16" // 视图框中心点 (32x32视图框的中间是16)
      y="17" // 根据视觉平衡调整垂直位置
      textAnchor="middle"
      dominantBaseline="middle"
      fill={fill} // 使用与图标主色一致的颜色
      fontSize="7" // 根据54x54视图框调整大小
      // fontWeight="bold"
      fontFamily="Arial, sans-serif" // 明确指定字体
    >
      30
    </text>
  </svg>
);

export default FastForward;
