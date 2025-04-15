// components/icons/Backward15.tsx
import React from "react";

interface SVGProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

const Backward15: React.FC<SVGProps> = ({
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
    <path d="M16,8a8,8,0,0,0-5,1.77V9A1,1,0,0,0,9,9v3a1,1,0,0,0,1,1h3a1,1,0,0,0,0-2h-.3A6,6,0,1,1,10,16a1,1,0,0,0-2,0,8,8,0,1,0,8-8Z" />
    {/* 新增数字15 */}
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
      15
    </text>
  </svg>
);

export default Backward15;
