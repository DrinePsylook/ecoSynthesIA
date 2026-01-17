import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import Markdown from 'react-markdown';

import Button from '../components/Button';
import { formatDate } from '../utils/formatters';
import { useAuth } from '../contexts/authContext';
import { getToken } from '../services/authService';

interface UserDocument {
    id: number;
    title: string;
    author: string;
    date_publication: string;
    is_public: boolean;
    category_id: number | null;
    category_name: string | null;
    textual_summary: string | null;
    confidence_score: number | null;
    extracted_data_count: number;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export default function MyDocumentsPage() {
    const { t } = useTranslation();
    const { user, isLoading } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const [documents, setDocuments] = useState<UserDocument[]>([]);
    const [pagination, setPagination] = useState<Pagination>({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Get current params from URL
    const currentPage = parseInt(searchParams.get('page') || '1', 10);
    const currentLimit = parseInt(searchParams.get('limit') || '10', 10);

    // Update URL params
    const updateParams = (params: Partial<{ page: number; limit: number }>) => {
        const newParams = new URLSearchParams(searchParams);
        Object.entries(params).forEach(([key, value]) => {
            if (value != undefined) {
                newParams.set(key, String(value));
            }
        });
        if (params.limit !== undefined) {
            newParams.set('page', '1');
        }
        setSearchParams(newParams);
    };

    // Redirect if not authenticated
    useEffect(() => {
        if (!user && !isLoading) {
            navigate('/login');
        }
    }, [user, isLoading, navigate]);

    // Fetch user's documents
    useEffect(() => {
        if (!user) return;

        setLoading(true);
        const token = getToken();

        const params = new URLSearchParams({
            page: String(currentPage),
            limit: String(currentLimit),
        });

        fetch(`${import.meta.env.VITE_BACKEND_URL}/api/documents/my-documents?${params}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        })
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then(data => {
                setDocuments(data.data || []);
                setPagination(data.pagination);
                setLoading(false);
            })
            .catch(err => {
                console.error('Error fetching documents:', err);
                setError(t('documents.failedToLoadYours'));
                setLoading(false);
            });
    }, [user, currentPage, currentLimit, t]);

    // Truncate summary for display
    const truncateSummary = (summary: string | null, maxLength: number = 200) => {
        if (!summary) return null;
        return summary.length > maxLength
            ? summary.slice(0, maxLength) + '...'
            : summary;
    };

    // Handle document analysis
    const [analyzing, setAnalyzing] = useState<number | null>(null);
    
    const handleAnalyzeDocument = async (docId: number) => {
        setAnalyzing(docId);
        const token = getToken();
        
        try {
            const response = await fetch(
                `${import.meta.env.VITE_BACKEND_URL}/api/documents/process-pending`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ document_id: docId }),
                }
            );

            if (response.ok) {
                // Refresh the documents list to show updated status
                const params = new URLSearchParams({
                    page: String(currentPage),
                    limit: String(currentLimit),
                });
                
                const refreshResponse = await fetch(
                    `${import.meta.env.VITE_BACKEND_URL}/api/documents/my-documents?${params}`,
                    {
                        headers: { 'Authorization': `Bearer ${token}` },
                    }
                );
                
                if (refreshResponse.ok) {
                    const data = await refreshResponse.json();
                    setDocuments(data.data || []);
                    setPagination(data.pagination);
                }
                
                alert(t('documents.analysisStarted'));
            } else {
                const result = await response.json();
                alert(result.message || t('documents.deleteFailed'));
            }
        } catch (err) {
            console.error('Error analyzing document:', err);
            alert(t('common.error'));
        } finally {
            setAnalyzing(null);
        }
    };

    // Handle document deletion
    const handleDeleteDocument = async (docId: number, docTitle: string) => {
        if (!confirm(`${t('documents.deleteConfirm')} "${docTitle}"?`)) {
            return;
        }

        const token = getToken();
        try {
            const response = await fetch(
                `${import.meta.env.VITE_BACKEND_URL}/api/documents/${docId}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                }
            );

            if (response.ok) {
                // Remove document from local state
                setDocuments(prev => prev.filter(doc => doc.id !== docId));
                // Update pagination total
                setPagination(prev => ({
                    ...prev,
                    total: prev.total - 1,
                    totalPages: Math.ceil((prev.total - 1) / prev.limit)
                }));
            } else {
                const result = await response.json();
                alert(result.message || t('documents.deleteFailed'));
            }
        } catch (err) {
            console.error('Error deleting document:', err);
            alert(t('common.error'));
        }
    };

    // Generate page number for pagination
    const getPageNumbers = () => {
        const { page, totalPages } = pagination;
        const pages: (number | string)[] = [];

        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            pages.push(1);
            if (page > 3) {
                pages.push('...');
            }

            const start = Math.max(2, page - 1);
            const end = Math.min(totalPages - 1, page + 1);

            for (let i = start; i <= end; i++) {
                pages.push(i);
            }

            if (page < totalPages - 2) {
                pages.push('...');
            }

            pages.push(totalPages);
        }

        return pages;
    };

    if (isLoading) {
        return (
            <main className="mx-auto max-w-7xl px-4 py-8">
                <div className="text-center text-gray-500">{t('common.loading')}</div>
            </main>
        );
    }

    if (error) {
        return (
            <main className="mx-auto max-w-7xl px-4 py-8">
                <div className="text-center text-red-600">{error}</div>
            </main>
        );
    }

    return (
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-emerald-800 mb-2">
                    {t('documents.myDocuments')}
                </h1>
                <p className="text-gray-600">
                    {t('documents.myDocumentsDescription')}
                </p>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-4 mb-6">
                <div className="flex items-center gap-2 text-gray-600">
                    <span className="font-medium">
                        {pagination.total} {pagination.total !== 1 ? t('documents.documents_plural') : t('documents.document')}
                    </span>
                </div>
                
                <div className="flex items-center gap-2">
                    <label htmlFor="limit" className="text-sm text-gray-600">{t('common.show')}:</label>
                    <select
                        id="limit"
                        value={currentLimit}
                        onChange={(e) => updateParams({ limit: parseInt(e.target.value, 10) })}
                        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                        <option value="10">10</option>
                        <option value="25">25</option>
                        <option value="50">50</option>
                    </select>
                </div>
            </div>

            {/* Documents List */}
            <div className="space-y-4">
                {loading ? (
                    <div className="text-center py-8 text-gray-500">{t('documents.loadingYourDocuments')}</div>
                ) : documents.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        {t('documents.noUserDocuments')}
                    </div>
                ) : (
                    documents.map((doc) => (
                        <div 
                            key={doc.id}
                            className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border-l-4 border-emerald-500"
                        >
                            <div className="p-6">
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-lg font-semibold text-gray-900">
                                                {doc.title}
                                            </h3>
                                            {/* Public/Private Badge */}
                                            <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${
                                                doc.is_public 
                                                    ? 'bg-green-100 text-green-800' 
                                                    : 'bg-gray-100 text-gray-600'
                                            }`}>
                                                {doc.is_public ? t('common.public') : t('common.private')}
                                            </span>
                                            {doc.category_name && (
                                                <span className="inline-block bg-teal-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full">
                                                    {doc.category_name}
                                                </span>
                                            )}
                                        </div>
                                        
                                        <div className="text-gray-600 text-sm mb-3 prose prose-sm prose-emerald max-w-none line-clamp-3">
                                            {doc.textual_summary ? (
                                                <Markdown>{truncateSummary(doc.textual_summary)}</Markdown>
                                            ) : (
                                                <p className="italic text-gray-400">{t('documents.noSummary')}</p>
                                            )}
                                        </div>
                                        
                                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                                            <span>📅 {formatDate(doc.date_publication)}</span>
                                            {doc.author && <span>✍️ {doc.author}</span>}
                                            <span>📊 {doc.extracted_data_count} {t('documents.dataPoints')}</span>
                                            {doc.confidence_score && (
                                                <span className="text-emerald-600">
                                                    ✓ {Math.round(doc.confidence_score * 100)}% {t('documents.confidence')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="flex-shrink-0 flex flex-col sm:flex-row gap-2">
                                        {/* Show "View" if analyzed, "Analyze" if not */}
                                        {doc.textual_summary ? (
                                            <Link to={`/documents/${doc.id}`}>
                                                <Button size="sm">{t('common.view')}</Button>
                                            </Link>
                                        ) : (
                                            <Button 
                                                size="sm"
                                                variant="secondary"
                                                onClick={() => handleAnalyzeDocument(doc.id)}
                                                disabled={analyzing === doc.id}
                                            >
                                                {analyzing === doc.id ? `⏳ ${t('documents.analyzing')}` : `🤖 ${t('documents.analyze')}`}
                                            </Button>
                                        )}
                                        <Link to={`/documents/${doc.id}/edit`}>
                                            <Button variant="ghost" size="sm">{t('common.edit')}</Button>
                                        </Link>
                                        <Button 
                                            variant="danger" 
                                            size="sm"
                                            onClick={() => handleDeleteDocument(doc.id, doc.title)}
                                        >
                                            {t('common.delete')}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <nav className="mt-8 mb-8 flex items-center justify-center gap-2">
                    <button
                        onClick={() => updateParams({ page: currentPage - 1 })}
                        disabled={currentPage <= 1}
                        className="flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ChevronLeftIcon className="h-4 w-4" />
                        {t('common.previous')}
                    </button>
                    
                    <div className="hidden sm:flex items-center gap-1">
                        {getPageNumbers().map((pageNum, index) => (
                            pageNum === '...' ? (
                                <span key={`ellipsis-${index}`} className="px-3 py-2 text-gray-500">...</span>
                            ) : (
                                <button
                                    key={pageNum}
                                    onClick={() => updateParams({ page: pageNum as number })}
                                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                                        currentPage === pageNum
                                            ? 'bg-emerald-600 text-white'
                                            : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                                    }`}
                                >
                                    {pageNum}
                                </button>
                            )
                        ))}
                    </div>
                    
                    <span className="sm:hidden text-sm text-gray-600">
                        {t('common.page')} {currentPage} {t('common.of')} {pagination.totalPages}
                    </span>
                    
                    <button
                        onClick={() => updateParams({ page: currentPage + 1 })}
                        disabled={currentPage >= pagination.totalPages}
                        className="flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {t('common.next')}
                        <ChevronRightIcon className="h-4 w-4" />
                    </button>
                </nav>
            )}
        </main>
    );
}
