import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText } from 'react-native-svg';

interface ChartData {
  date: string;
  views: number;
  calls: number;
  leads: number;
}

interface SimpleLineChartProps {
  data: ChartData[];
  colors: any;
}

export const SimpleLineChart: React.FC<SimpleLineChartProps> = ({ data, colors }) => {
  const screenWidth = Dimensions.get('window').width - 48; // padding
  const chartHeight = 220;
  const padding = { top: 20, right: 10, bottom: 30, left: 35 };

  const chartWidth = screenWidth - padding.left - padding.right;
  const chartInnerHeight = chartHeight - padding.top - padding.bottom;

  if (!data || data.length === 0) {
    return (
      <View style={{ height: chartHeight, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.text.secondary }}>No data available</Text>
      </View>
    );
  }

  // Find max values for scaling
  const maxViews = Math.max(...data.map(d => d.views), 1);
  const maxCalls = Math.max(...data.map(d => d.calls), 1);
  const maxValue = Math.max(maxViews, maxCalls);

  // Calculate points for views line
  const viewsPoints = data.map((d, index) => {
    const x = padding.left + (index / (data.length - 1)) * chartWidth;
    const y = padding.top + chartInnerHeight - (d.views / maxValue) * chartInnerHeight;
    return { x, y };
  });

  // Calculate points for calls line
  const callsPoints = data.map((d, index) => {
    const x = padding.left + (index / (data.length - 1)) * chartWidth;
    const y = padding.top + chartInnerHeight - (d.calls / maxValue) * chartInnerHeight;
    return { x, y };
  });

  // Create path strings
  const createPath = (points: { x: number; y: number }[]) => {
    if (points.length === 0) return '';
    return points
      .map((point, index) => {
        if (index === 0) return `M ${point.x} ${point.y}`;
        return `L ${point.x} ${point.y}`;
      })
      .join(' ');
  };

  const viewsPath = createPath(viewsPoints);
  const callsPath = createPath(callsPoints);

  // Y-axis labels
  const yAxisLabels = [0, Math.floor(maxValue / 2), maxValue];

  // X-axis labels (show every other or every 3rd for 30 days)
  const xAxisInterval = data.length > 15 ? 5 : data.length > 7 ? 2 : 1;

  return (
    <View style={{ backgroundColor: colors.surface }}>
      <Svg width={screenWidth} height={chartHeight}>
        {/* Grid lines */}
        {yAxisLabels.map((value, index) => {
          const y = padding.top + chartInnerHeight - (value / maxValue) * chartInnerHeight;
          return (
            <Line
              key={`grid-${index}`}
              x1={padding.left}
              y1={y}
              x2={screenWidth - padding.right}
              y2={y}
              stroke={colors.border}
              strokeWidth="1"
              strokeDasharray="4,4"
            />
          );
        })}

        {/* Y-axis labels */}
        {yAxisLabels.map((value, index) => {
          const y = padding.top + chartInnerHeight - (value / maxValue) * chartInnerHeight;
          return (
            <SvgText
              key={`y-label-${index}`}
              x={padding.left - 8}
              y={y + 4}
              fill={colors.text.tertiary}
              fontSize="10"
              textAnchor="end"
            >
              {value}
            </SvgText>
          );
        })}

        {/* X-axis labels */}
        {data
          .filter((_, index) => index % xAxisInterval === 0)
          .map((d, index) => {
            const actualIndex = index * xAxisInterval;
            const x = padding.left + (actualIndex / (data.length - 1)) * chartWidth;
            const date = new Date(d.date);
            const label = `${date.getMonth() + 1}/${date.getDate()}`;
            return (
              <SvgText
                key={`x-label-${index}`}
                x={x}
                y={chartHeight - padding.bottom + 20}
                fill={colors.text.tertiary}
                fontSize="10"
                textAnchor="middle"
              >
                {label}
              </SvgText>
            );
          })}

        {/* Views line (blue) */}
        <Path
          d={viewsPath}
          stroke="#2563eb"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Views dots */}
        {viewsPoints.map((point, index) => (
          <Circle
            key={`view-dot-${index}`}
            cx={point.x}
            cy={point.y}
            r="4"
            fill="#2563eb"
            stroke="#ffffff"
            strokeWidth="2"
          />
        ))}

        {/* Calls line (green) */}
        <Path
          d={callsPath}
          stroke="#10b981"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Calls dots */}
        {callsPoints.map((point, index) => (
          <Circle
            key={`call-dot-${index}`}
            cx={point.x}
            cy={point.y}
            r="4"
            fill="#10b981"
            stroke="#ffffff"
            strokeWidth="2"
          />
        ))}
      </Svg>
    </View>
  );
};
