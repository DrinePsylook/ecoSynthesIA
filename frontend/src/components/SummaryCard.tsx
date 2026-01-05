import Markdown from 'react-markdown';
import type { Summary } from '../types/summary';
import { formatDate } from '../utils/formatters';

interface SummaryCardProps {
    summary: Summary;
}

export default function SummaryCard({summary}: SummaryCardProps) {
    const {textual_summary, date_analysis, confidence_score} = summary;
    
    // Calculate confidence percentage and color
    const confidencePercent = Math.round(confidence_score * 100);
    const confidenceColor = confidencePercent >= 80 
        ? 'text-emerald-600' 
        : confidencePercent >= 60 
            ? 'text-amber-600' 
            : 'text-red-500';

    return (
        <div className="bg-white/80 backdrop-blur-sm rounded-xl border-l-4 border-emerald-500 shadow-md hover:shadow-lg transition-shadow duration-300">
            {/* Header with date */}
            <div className="px-6 pt-4 flex items-center justify-between border-b border-emerald-100">
                <span className="text-xs uppercase tracking-wider text-emerald-600 font-semibold">
                    Summary
                </span>
                <span className="text-sm text-gray-500">
                    {formatDate(date_analysis)}
                </span>
            </div>
            
            {/* Content - Markdown rendered */}
            <div className="px-6 py-5 prose prose-sm prose-emerald max-w-none
                            prose-headings:text-emerald-800 prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2
                            prose-p:text-gray-700 prose-p:leading-relaxed prose-p:my-2
                            prose-ul:my-2 prose-ul:pl-4 prose-li:text-gray-700 prose-li:my-1
                            prose-strong:text-emerald-700 prose-strong:font-semibold">
                <Markdown>{textual_summary}</Markdown>
            </div>
            
            {/* Footer with confidence score */}
            <div className="px-6 pb-4 flex items-center justify-end gap-2 border-t border-emerald-100 pt-3">
                <span className="text-xs text-gray-500">Confidence:</span>
                <span className={`text-sm font-bold ${confidenceColor}`}>
                    {confidencePercent}%
                </span>
                <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-500"
                        style={{ width: `${confidencePercent}%` }}
                    />
                </div>
            </div>
        </div>
    );
}