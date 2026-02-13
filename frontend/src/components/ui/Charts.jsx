import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * Simple line chart component (no external dependencies)
 */
export function MiniChart({
  data = [],
  width = 120,
  height = 40,
  color = '#FFD700',
  showGradient = true,
  className = '',
}) {
  const points = useMemo(() => {
    if (data.length < 2) return '';
    
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;
    
    const xStep = width / (data.length - 1);
    
    return data.map((value, i) => {
      const x = i * xStep;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    }).join(' ');
  }, [data, width, height]);
  
  const gradientId = useMemo(() => `gradient-${Math.random().toString(36).slice(2)}`, []);
  
  if (data.length < 2) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ width, height }}>
        <Minus size={16} className="text-gray-500" />
      </div>
    );
  }
  
  // Calculate trend
  const trend = data[data.length - 1] - data[0];
  
  return (
    <svg width={width} height={height} className={className}>
      {showGradient && (
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
      )}
      
      {/* Fill area */}
      {showGradient && (
        <polygon
          points={`0,${height} ${points} ${width},${height}`}
          fill={`url(#${gradientId})`}
        />
      )}
      
      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Bar chart component
 */
export function BarChart({
  data = [], // [{ label, value, color? }]
  height = 120,
  showLabels = true,
  className = '',
}) {
  const maxValue = Math.max(...data.map(d => d.value), 1);
  
  return (
    <div className={`flex items-end justify-between gap-2 ${className}`}>
      {data.map((item, index) => {
        const barHeight = (item.value / maxValue) * height;
        
        return (
          <div key={index} className="flex-1 flex flex-col items-center gap-1">
            {/* Value label */}
            <span className="text-xs text-orbit-gray">{item.value}</span>
            
            {/* Bar */}
            <div 
              className="w-full rounded-t-md transition-all duration-500"
              style={{ 
                height: barHeight,
                backgroundColor: item.color || '#FFD700',
                opacity: 0.8,
              }}
            />
            
            {/* Label */}
            {showLabels && (
              <span className="text-[10px] text-orbit-gray truncate max-w-full">
                {item.label}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Progress ring chart
 */
export function ProgressRing({
  progress = 0, // 0-100
  size = 80,
  strokeWidth = 8,
  color = '#FFD700',
  bgColor = 'rgba(255,255,255,0.1)',
  children,
  className = '',
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;
  
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={bgColor}
          strokeWidth={strokeWidth}
        />
        
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      
      {/* Center content */}
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * Stat card with mini chart
 */
export function StatCard({
  title,
  value,
  subtitle,
  trend, // positive, negative, or neutral
  trendValue,
  chartData = [],
  icon,
  color = '#FFD700',
  className = '',
}) {
  const trendConfig = {
    positive: { icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    negative: { icon: TrendingDown, color: 'text-red-400', bg: 'bg-red-500/10' },
    neutral: { icon: Minus, color: 'text-gray-400', bg: 'bg-gray-500/10' },
  };
  
  const TrendIcon = trend ? trendConfig[trend]?.icon : null;
  
  return (
    <div className={`card-glass p-5 ${className}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs text-orbit-gray uppercase tracking-wider mb-1">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {subtitle && <p className="text-xs text-orbit-gray mt-0.5">{subtitle}</p>}
        </div>
        
        {icon && (
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${color}20` }}
          >
            {icon}
          </div>
        )}
      </div>
      
      {/* Trend indicator */}
      {trend && trendValue && (
        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${trendConfig[trend].color} ${trendConfig[trend].bg}`}>
          <TrendIcon size={12} />
          <span>{trendValue}</span>
        </div>
      )}
      
      {/* Mini chart */}
      {chartData.length > 0 && (
        <div className="mt-3 -mx-1">
          <MiniChart data={chartData} color={color} width={200} height={50} />
        </div>
      )}
    </div>
  );
}

/**
 * Spending breakdown donut chart
 */
export function DonutChart({
  data = [], // [{ label, value, color }]
  size = 120,
  thickness = 20,
  className = '',
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const radius = (size - thickness) / 2;
  const circumference = radius * 2 * Math.PI;
  
  let currentOffset = 0;
  
  return (
    <div className={`relative inline-flex ${className}`}>
      <svg width={size} height={size} className="-rotate-90">
        {data.map((item, index) => {
          const percentage = item.value / total;
          const dashLength = percentage * circumference;
          const dashOffset = currentOffset;
          currentOffset += dashLength;
          
          return (
            <circle
              key={index}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={item.color}
              strokeWidth={thickness}
              strokeDasharray={`${dashLength} ${circumference - dashLength}`}
              strokeDashoffset={-dashOffset}
              className="transition-all duration-500"
            />
          );
        })}
      </svg>
      
      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-white">{total.toFixed(0)}</span>
        <span className="text-xs text-orbit-gray">XLM Total</span>
      </div>
    </div>
  );
}

/**
 * Activity heatmap (like GitHub contributions)
 */
export function ActivityHeatmap({
  data = [], // Array of activity counts for last N days
  weeks = 12,
  className = '',
}) {
  const days = weeks * 7;
  const activityData = data.slice(-days);
  const maxActivity = Math.max(...activityData, 1);
  
  const getColor = (value) => {
    if (value === 0) return 'bg-white/5';
    const intensity = value / maxActivity;
    if (intensity > 0.75) return 'bg-orbit-gold';
    if (intensity > 0.5) return 'bg-orbit-gold/70';
    if (intensity > 0.25) return 'bg-orbit-gold/40';
    return 'bg-orbit-gold/20';
  };
  
  // Organize into weeks
  const weekData = [];
  for (let w = 0; w < weeks; w++) {
    const weekDays = [];
    for (let d = 0; d < 7; d++) {
      const index = w * 7 + d;
      weekDays.push(activityData[index] || 0);
    }
    weekData.push(weekDays);
  }
  
  return (
    <div className={`flex gap-1 ${className}`}>
      {weekData.map((week, weekIndex) => (
        <div key={weekIndex} className="flex flex-col gap-1">
          {week.map((day, dayIndex) => (
            <div 
              key={dayIndex}
              className={`w-3 h-3 rounded-sm ${getColor(day)} transition-colors`}
              title={`${day} transactions`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export default StatCard;
