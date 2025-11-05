interface CircleProgressProps {
  size: number;
  progress: number;
  remaining: number;
}

const CircleProgress: React.FC<CircleProgressProps> = ({ size, progress, remaining }) => {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = Math.max(0, Math.min(1, progress)) * circumference;

  return (
    <svg width={size} height={size} className="mt-1 mr-0.5">
      <circle
        r={radius}
        cx={size / 2}
        cy={size / 2}
        fill="transparent"
        stroke="#3f3f46"
        strokeWidth={strokeWidth}
      />
      <circle
        r={radius}
        cx={size / 2}
        cy={size / 2}
        fill="transparent"
        stroke={remaining <= 20 ? (remaining <= 0 ? 'red' : 'orange') : '#674FF8'}
        strokeWidth={strokeWidth}
        strokeDasharray={`${dash} ${circumference - dash}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      {remaining <= 20 && (
        <text
          x="50%" y="50%" textAnchor="middle" dy=".35em"
          fill={remaining > 0 ? "white" : "red"} fontSize="10"
        >
          {remaining}
        </text>
      )}
    </svg>
  );
};

export default CircleProgress;
