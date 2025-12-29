import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';

import SummaryCard from '../components/summaryCard';
import DatavizPanel from '../components/datavizPanel';
import DataTable from '../components/dataTable';
import type { AnalyzedDocument } from '../types/document';
import type { Summary } from '../types/summary';
import type { ExtractedData } from '../types/extractedData';

export default function DocumentPage() {
    const {id} = useParams<{id: string}>();

    const [document, setDocument] = useState<AnalyzedDocument | null>(null);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [extractedData, setExtractedData] = useState<ExtractedData[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        if (!id) return;

        const fetchDocument = fetch(`${import.meta.env.VITE_BACKEND_URL}/api/documents/${id}`)
            .then(res => res.json())
            .then(({ data: { document: doc } }) => setDocument(doc));

        const fetchSummary = fetch(`${import.meta.env.VITE_BACKEND_URL}/api/summaries/document/${id}`)
            .then(res => res.ok ? res.json() : null)
            .then(response => response?.data && setSummary(response.data));

        const fetchExtractedData = fetch(`${import.meta.env.VITE_BACKEND_URL}/api/extracted-data/document/${id}`)
            .then(res => res.ok ? res.json() : null)
            .then(response => response?.data && setExtractedData(response.data));

        Promise.all([fetchDocument, fetchSummary, fetchExtractedData])
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100">
                <div className="animate-pulse text-emerald-700 text-xl font-medium">
                    Loading document...
                </div>
            </div>
        );
    }

    return (
        <MantineProvider>
            <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
                {/* Header */}
                <header className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-6 px-8 shadow-lg">
                    <div className="max-w-7xl mx-auto flex items-center justify-between">
                        <h1 className="text-3xl font-bold tracking-tight">
                            {document?.title || 'Untitled Document'}
                        </h1>
                        {document?.category_name && (
                            <span className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium">
                                {document.category_name}
                            </span>
                        )}
                    </div>
                </header>

                {/* Main content */}
                <main className="max-w-7xl mx-auto px-8 py-8 space-y-8">
                    
                    {/* Row 1 - Summary (full width) */}
                    <section>
                        <h2 className="text-xl font-semibold text-emerald-800 mb-4 flex items-center gap-2">
                            <span className="w-1 h-6 bg-emerald-500 rounded-full"></span>
                            Complete summary
                        </h2>
                        {summary ? (
                            <SummaryCard summary={summary} />
                        ) : (
                            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-emerald-200 text-gray-500 italic">
                                No summary available for this document.
                            </div>
                        )}
                    </section>

                    {/* Row 2 - Dataviz & Table (2 columns) */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Dataviz section */}
                        <section>
                            <h2 className="text-xl font-semibold text-emerald-800 mb-4 flex items-center gap-2">
                                <span className="w-1 h-6 bg-cyan-500 rounded-full"></span>
                                Dataviz
                            </h2>
                            <DatavizPanel extractedData={extractedData} />
                        </section>

                        {/* Data table section */}
                        <section>
                            <h2 className="text-xl font-semibold text-emerald-800 mb-4 flex items-center gap-2">
                                <span className="w-1 h-6 bg-green-500 rounded-full"></span>
                                Extracted data
                            </h2>
                            <DataTable extractedData={extractedData} />
                        </section>
                    </div>

                    {/* Row 3 - Action button */}
                    <div className="flex justify-center pt-4">
                        <a
                            href={document?.url_source || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 
                                     text-white font-medium px-8 py-3 rounded-full shadow-lg hover:shadow-xl 
                                     transition-all duration-300 transform hover:-translate-y-0.5"
                        >
                            View original document
                        </a>
                    </div>
                </main>
            </div>
        </MantineProvider>
    );
}
