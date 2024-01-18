interface ProgressRingProps {
  radius: number;
  stroke: number;
  normalizedRadius: number;
  circumference: number;
  strokeDashoffset: number;
}

export default function ProgressRing({ radius, stroke, normalizedRadius, circumference, strokeDashoffset }: ProgressRingProps) {
  return (
    <svg
      height={radius * 2}
      width={radius * 2}
    >
      <circle
        stroke="#674FF8"
        fill="rgba(20, 23, 26, 0.94)"
        strokeWidth={stroke}
        strokeDasharray={circumference + ' ' + circumference}
        style={{ strokeDashoffset }}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
      />
    </svg>
  );
}