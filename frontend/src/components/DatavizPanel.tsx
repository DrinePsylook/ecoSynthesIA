/**
 * DatavizPanel - Component for data visualization charts using Mantine Charts
 * Displays extracted data as interactive bar/pie charts
 */

import { BarChart, PieChart } from '@mantine/charts';
import type { ExtractedData } from '../types/extractedData';
import { formatValue, truncateText } from '../utils/formatters';

interface DatavizPanelProps {
    extractedData: ExtractedData[];
}

// Color palette for charts (emerald/teal theme)
const CHART_COLORS = [
    'teal.6', 'cyan.5', 'emerald.5', 'green.6', 
    'teal.4', 'cyan.6', 'emerald.6', 'green.5'
];

export default function DatavizPanel({ extractedData }: DatavizPanelProps) {
    // If no data, show empty state
    if (!extractedData || extractedData.length === 0) {
        return (
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md border border-cyan-100">
                <div className="px-5 py-4 border-b border-cyan-100 bg-gradient-to-r from-cyan-50 to-teal-50 rounded-t-xl">
                    <span className="text-xs uppercase tracking-wider text-cyan-700 font-semibold">
                        Data Visualizations
                    </span>
                </div>
                <div className="p-8 text-center text-gray-500 italic">
                    No extracted data available for visualization.
                </div>
            </div>
        );
    }

    // Prepare data for bar chart (top 6 items by value)
    const barData = extractedData
        .filter(d => d.chart_type === 'bar' && !isNaN(parseFloat(d.value)))
        .sort((a, b) => parseFloat(b.value) - parseFloat(a.value))
        .slice(0, 6)
        .map((d, index) => ({
            name: truncateText(d.key),
            value: parseFloat(d.value),
            fullName: d.key,
            unit: d.unit || 'USD',
            color: CHART_COLORS[index % CHART_COLORS.length]
        }));

    // Prepare data for pie chart (group by indicator_category)
    const categoryTotals = extractedData.reduce((acc, d) => {
        const category = d.indicator_category || 'Other';
        const value = parseFloat(d.value) || 0;
        acc[category] = (acc[category] || 0) + value;
        return acc;
    }, {} as Record<string, number>);

    const pieData = Object.entries(categoryTotals)
        .map(([name, value], index) => ({
            name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            value,
            color: CHART_COLORS[index % CHART_COLORS.length]
        }))
        .sort((a, b) => b.value - a.value);

    // Calculate total for summary
    const totalValue = extractedData.reduce((sum, d) => sum + (parseFloat(d.value) || 0), 0);
    const mainUnit = extractedData[0]?.unit || 'USD';

    return (
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md border border-cyan-100">
            {/* Header */}
            <div className="px-5 py-4 border-b border-cyan-100 bg-gradient-to-r from-cyan-50 to-teal-50 rounded-t-xl flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-cyan-700 font-semibold">
                    Data Visualizations
                </span>
                <span className="text-sm font-bold text-emerald-600">
                    Total: {formatValue(totalValue)} {mainUnit}
                </span>
            </div>
            
            {/* Bar Chart Section */}
            {barData.length > 0 && (
                <div className="p-4 border-b border-cyan-50">
                    <h4 className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wider">
                        Top Financial Items
                    </h4>
                    <BarChart
                        h={200}
                        data={barData}
                        dataKey="name"
                        series={[{ name: 'value', color: 'teal.6' }]}
                        tickLine="none"
                        gridAxis="none"
                        barProps={{ radius: 4 }}
                        valueFormatter={(value) => formatValue(value)}
                    />
                </div>
            )}

            {/* Pie Chart Section */}
            {pieData.length > 1 && (
                <div className="p-4">
                    <h4 className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wider">
                        Distribution by Category
                    </h4>
                    <div className="flex items-center justify-center">
                        <PieChart
                            h={180}
                            w={180}
                            data={pieData}
                            withLabels
                            labelsType="percent"
                            withTooltip
                            tooltipDataSource="segment"
                        />
                    </div>
                    {/* Legend */}
                    <div className="mt-3 flex flex-wrap gap-2 justify-center">
                        {pieData.map((item, index) => (
                            <span 
                                key={index}
                                className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded"
                            >
                                <span 
                                    className="w-2 h-2 rounded-full" 
                                    style={{ backgroundColor: `var(--mantine-color-${item.color.replace('.', '-')})` }}
                                />
                                {item.name}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Data count indicator */}
            <div className="px-4 pb-4 border-t border-cyan-50 pt-3">
                <span className="inline-flex items-center gap-1 text-xs text-cyan-600 bg-cyan-50 px-3 py-1 rounded-full">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                        <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
                    </svg>
                    {extractedData.length} data points extracted
                </span>
            </div>
        </div>
    );
}

