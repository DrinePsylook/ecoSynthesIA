/**
 * DataTable - Component for displaying extracted data grouped by category
 * Shows collapsible sections for each indicator category
 */

import { useState } from 'react';
import type { ExtractedData } from '../types/extractedData';
import { formatValue, formatCategoryName } from '../utils/formatters';

interface DataTableProps {
    extractedData: ExtractedData[];
}

// Confidence score color
function getConfidenceColor(score: number): string {
    if (score >= 0.8) return 'text-emerald-600 bg-emerald-50';
    if (score >= 0.6) return 'text-amber-600 bg-amber-50';
    return 'text-red-500 bg-red-50';
}

// Category colors
const CATEGORY_COLORS: Record<string, string> = {
    finance_cost: 'bg-blue-500',
    finance_loan: 'bg-indigo-500',
    environment: 'bg-green-500',
    social: 'bg-amber-500',
    energy: 'bg-yellow-500',
    climate: 'bg-cyan-500',
    default: 'bg-teal-500'
};

function getCategoryColor(category: string): string {
    return CATEGORY_COLORS[category] || CATEGORY_COLORS.default;
}

export default function DataTable({ extractedData }: DataTableProps) {
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
    
    // If no data, show empty state
    if (!extractedData || extractedData.length === 0) {
        return (
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md border border-green-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-green-100 bg-gradient-to-r from-green-50 to-emerald-50">
                    <span className="text-xs uppercase tracking-wider text-green-700 font-semibold">
                        Extracted Data
                    </span>
                </div>
                <div className="p-8 text-center text-gray-500 italic">
                    No extracted data available for this document.
                </div>
            </div>
        );
    }

    // Group data by indicator_category
    const groupedData = extractedData.reduce((acc, item) => {
        const category = item.indicator_category || 'other';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(item);
        return acc;
    }, {} as Record<string, ExtractedData[]>);

    // Sort categories by total value
    const sortedCategories = Object.entries(groupedData)
        .sort((a, b) => {
            const totalA = a[1].reduce((sum, item) => sum + (parseFloat(item.value) || 0), 0);
            const totalB = b[1].reduce((sum, item) => sum + (parseFloat(item.value) || 0), 0);
            return totalB - totalA;
        });

    const toggleCategory = (category: string) => {
        setExpandedCategories(prev => {
            const newSet = new Set(prev);
            if (newSet.has(category)) {
                newSet.delete(category);
            } else {
                newSet.add(category);
            }
            return newSet;
        });
    };

    return (
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md border border-green-100 overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-green-100 bg-gradient-to-r from-green-50 to-emerald-50 flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-green-700 font-semibold">
                    Extracted Data
                </span>
                <span className="text-xs text-gray-500">
                    {sortedCategories.length} categories • {extractedData.length} items
                </span>
            </div>
            
            {/* Accordion by category */}
            <div className="divide-y divide-green-100 max-h-[500px] overflow-y-auto">
                {sortedCategories.map(([category, items]) => {
                    const isExpanded = expandedCategories.has(category);
                    const totalValue = items.reduce((sum, item) => sum + (parseFloat(item.value) || 0), 0);
                    const mainUnit = items[0]?.unit || '';
                    
                    return (
                        <div key={category}>
                            {/* Category header (clickable) */}
                            <button
                                onClick={() => toggleCategory(category)}
                                className="w-full px-4 py-3 flex items-center justify-between hover:bg-emerald-50/50 transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${getCategoryColor(category)}`}></span>
                                    <span className="text-sm font-medium text-gray-700">
                                        {formatCategoryName(category)}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                        ({items.length})
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-mono font-semibold text-emerald-600">
                                        {formatValue(totalValue.toString())} {mainUnit}
                                    </span>
                                    <svg 
                                        className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                        fill="none" 
                                        viewBox="0 0 24 24" 
                                        stroke="currentColor"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </button>
                            
                            {/* Category items (collapsible) */}
                            {isExpanded && (
                                <div className="bg-gray-50/50 border-t border-green-50">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-emerald-100/30">
                                                <th className="px-4 py-2 text-left text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">
                                                    Indicator
                                                </th>
                                                <th className="px-3 py-2 text-right text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">
                                                    Value
                                                </th>
                                                <th className="px-3 py-2 text-center text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">
                                                    Conf.
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-emerald-50">
                                            {items
                                                .sort((a, b) => (parseFloat(a.value) || 0) - (parseFloat(b.value) || 0))
                                                .map((row) => (
                                                <tr 
                                                    key={row.id} 
                                                    className="hover:bg-white/50 transition-colors"
                                                >
                                                    <td className="px-4 py-2 text-xs text-gray-700">
                                                        <div className="break-words">
                                                            {row.key}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2 text-xs text-right font-mono font-medium text-emerald-700 whitespace-nowrap">
                                                        {formatValue(row.value)} {row.unit || ''}
                                                    </td>
                                                    <td className="px-3 py-2 text-center">
                                                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${getConfidenceColor(row.confidence_score)}`}>
                                                            {Math.round(row.confidence_score * 100)}%
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

