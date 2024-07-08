interface CircleProgressProps {
  size: number;
  progress: number;
  strokeWidth: number;
  remaining: number;
}

const CircleProgress: React.FC<CircleProgressProps> = ({ size, progress, remaining }) => {
  const radius = (size - 4) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - progress * circumference;
  const startOffset = -Math.PI / 2 * radius;

  return (
    <svg width={size} height={size} className="mt-1 mr-0.5 text-xs">
      <circle
        stroke={remaining <= 20 ? (remaining <= 0 ? 'red' : 'orange') : '#674FF8'}
        fill="transparent"
        strokeWidth={4}
        strokeDasharray={70}
        strokeDashoffset={70}
        r={radius}
        cx={size / 2}
        cy={size / 2}
      />
      {remaining <= 20 && (
        <text
          x={remaining < 0 ? "46%" : "50%"}
          y="50%"
          textAnchor="middle"
          fill={remaining > 0 ? "white" : "red"}
          dy=".3em"
          fontSize="smaller"
        >
          {remaining > -100 && remaining}
        </text>
      )}
    </svg>
  );
};

export default CircleProgress;