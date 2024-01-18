import ProgressRing from './ProgressRing';

interface CircleProgressProps {
  radius: number;
  stroke: number;
  progress: number;
}

export default function CircleProgress({radius, stroke, progress}: CircleProgressProps) {
  const normalizedRadius = radius - stroke;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - progress / 100 * circumference;

  const angle = (progress / 100) * 2 * Math.PI;
  const x = radius + normalizedRadius * Math.cos(angle);
  const y = radius + normalizedRadius * Math.sin(angle);

  return (
    <svg
      height={radius * 2}
      width={radius * 2}
     >
      <ProgressRing
        radius={radius}
        stroke={stroke}
        normalizedRadius={normalizedRadius}
        circumference={circumference}
        strokeDashoffset={strokeDashoffset}
      />
      <text className="font-bold" x="50%" y="50%" textAnchor="middle" fill="white" dy=".3em">
        {progress}<tspan className="text-xs">%</tspan>
      </text>
      <circle
        cx={x}
        cy={y}
        r={stroke}
        fill='#674FF8'
      />
    </svg>
  );
}