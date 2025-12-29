import type { AnalyzedDocument } from '../types/document';
import Button from './button';

interface DocumentCardProps {
    document: AnalyzedDocument;
}

export default function DocumentCard({document}: DocumentCardProps) {
    const {id, title, date_publication, textual_summary, category_name} = document;

    const truncatedSummary = textual_summary
        ? textual_summary.length > 200
            ? textual_summary.slice(0, 200) + '...'
            : textual_summary
        : 'No summary available';

        return (
            <div className="bg-white max-w-sm rounded overflow-hidden shadow-lg flex flex-col h-full">
                {/* Date de publication */}
                <div className="px-6 pt-4 flex justify-end">
                    <span className="text-sm font-bold text-gray-500">{date_publication}</span>
                </div>
                
                {/* Titre et résumé */}
                <div className="px-6 py-4 flex-grow flex flex-col">
                    <h3 className="font-bold text-xl mb-2 line-clamp-2">{title}</h3>
                    <p className="text-gray-700 text-base flex-grow mb-4">{truncatedSummary}</p>
                </div>
                
                {/* Catégorie */}
                <div className="px-6 pb-4 flex justify-end">
                    <span className="inline-block bg-teal-100 text-emerald-800 text-xs px-2 py-1 rounded-full">
                        {category_name || 'Uncategorized'}
                    </span>
                </div>
                
                {/* Bouton vers la page détail */}
                <div className="px-6 pb-4 flex justify-end">
                    <a href={`/documents/${id}`}>
                        <Button>View Details</Button>
                    </a>
                </div>
            </div>
        )
    }