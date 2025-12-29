import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { normalizeFileName } from '../utils/file';
import Button from '../components/button';

// Interface for category details
interface CategoryDetails {
    id: number;
    name: string;
    description: string;
    documentsTotal: number;
}

// Interface for document in the list
interface CategoryDocument {
    id: number;
    title: string;
    author: string;
    date_publication: string;
    textual_summary: string | null;
    extracted_data_count: number;
}

// Interface for pagination info
interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export default function CategoryPage() {
    const { id } = useParams<{ id: string }>();
    const [searchParams, setSearchParams] = useSearchParams();
    
    // State for category and documents
    const [category, setCategory] = useState<CategoryDetails | null>(null);
    const [documents, setDocuments] = useState<CategoryDocument[]>([]);
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
    const currentSort = (searchParams.get('sort') as 'date' | 'title') || 'date';
    const currentOrder = (searchParams.get('order') as 'asc' | 'desc') || 'desc';

    // Update URL params
    const updateParams = (params: Partial<{ page: number; limit: number; sort: string; order: string }>) => {
        const newParams = new URLSearchParams(searchParams);
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined) {
                newParams.set(key, String(value));
            }
        });
        // Reset to page 1 when changing limit or sort
        if (params.limit !== undefined || params.sort !== undefined || params.order !== undefined) {
            newParams.set('page', '1');
        }
        setSearchParams(newParams);
    };

    // Fetch category details
    useEffect(() => {
        if (!id) return;
        
        fetch(`${import.meta.env.VITE_BACKEND_URL}/api/categories/${id}/details`)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then(data => {
                setCategory(data.data);
            })
            .catch(err => {
                console.error('Error fetching category:', err);
                setError('Failed to load category');
            });
    }, [id]);

    // Fetch documents when params change
    useEffect(() => {
        if (!id) return;
        setLoading(true);

        const params = new URLSearchParams({
            page: String(currentPage),
            limit: String(currentLimit),
            sort: currentSort,
            order: currentOrder
        });

        fetch(`${import.meta.env.VITE_BACKEND_URL}/api/categories/${id}/documents?${params}`)
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
                setError('Failed to load documents');
                setLoading(false);
            });
    }, [id, currentPage, currentLimit, currentSort, currentOrder]);

    // Truncate summary for display
    const truncateSummary = (summary: string | null, maxLength: number = 150) => {
        if (!summary) return 'No summary available';
        return summary.length > maxLength 
            ? summary.slice(0, maxLength) + '...' 
            : summary;
    };

    // Generate page numbers for pagination
    const getPageNumbers = () => {
        const { page, totalPages } = pagination;
        const pages: (number | string)[] = [];
        
        if (totalPages <= 7) {
            // Show all pages if 7 or fewer
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Always show first page
            pages.push(1);
            
            if (page > 3) {
                pages.push('...');
            }
            
            // Show pages around current page
            const start = Math.max(2, page - 1);
            const end = Math.min(totalPages - 1, page + 1);
            
            for (let i = start; i <= end; i++) {
                pages.push(i);
            }
            
            if (page < totalPages - 2) {
                pages.push('...');
            }
            
            // Always show last page
            pages.push(totalPages);
        }
        
        return pages;
    };

    if (error) {
        return (
            <main className="mx-auto max-w-7xl px-4 py-8">
                <div className="text-center text-red-600">{error}</div>
            </main>
        );
    }

    return (
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Category Header with Image */}
            {category && (
                <div className="relative">
                    {/* Hero Image */}
                    <div className="h-64 w-full overflow-hidden rounded-b-2xl">
                        <img
                            src={`/logosCategory/${normalizeFileName(category.name)}.jpg`}
                            alt={category.name}
                            className="w-full h-full object-cover"
                        />
                        {/* Overlay gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/80 to-transparent" />
                    </div>
                    
                    {/* Category Info Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
                            {category.name}
                        </h1>
                        {category.description && (
                            <p className="text-emerald-100 text-lg max-w-3xl">
                                {category.description}
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Controls: Sort and Limit */}
            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-4">
                <div className="flex items-center gap-2 text-gray-600">
                    <span className="font-medium">
                        {pagination.total} document{pagination.total !== 1 ? 's' : ''}
                    </span>
                </div>
                
                <div className="flex flex-wrap items-center gap-4">
                    {/* Sort Select */}
                    <div className="flex items-center gap-2">
                        <label htmlFor="sort" className="text-sm text-gray-600">Sort by:</label>
                        <select
                            id="sort"
                            value={`${currentSort}-${currentOrder}`}
                            onChange={(e) => {
                                const [sort, order] = e.target.value.split('-');
                                updateParams({ sort, order });
                            }}
                            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                            <option value="date-desc">Date (newest first)</option>
                            <option value="date-asc">Date (oldest first)</option>
                            <option value="title-asc">Title (A-Z)</option>
                            <option value="title-desc">Title (Z-A)</option>
                        </select>
                    </div>
                    
                    {/* Limit Select */}
                    <div className="flex items-center gap-2">
                        <label htmlFor="limit" className="text-sm text-gray-600">Show:</label>
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
            </div>

            {/* Documents List */}
            <div className="mt-6 space-y-4">
                {loading ? (
                    <div className="text-center py-8 text-gray-500">Loading documents...</div>
                ) : documents.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        No documents found in this category.
                    </div>
                ) : (
                    documents.map((doc) => (
                        <div 
                            key={doc.id}
                            className="bg-teal-50 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                        >
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                        {doc.title}
                                    </h3>
                                    <p className="text-gray-600 text-sm mb-3">
                                        {truncateSummary(doc.textual_summary)}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                                        <span>📅 {doc.date_publication}</span>
                                        {doc.author && <span>✍️ {doc.author}</span>}
                                        <span>📊 {doc.extracted_data_count} data points</span>
                                    </div>
                                </div>
                                <div className="flex-shrink-0">
                                    <Link to={`/documents/${doc.id}`}>
                                        <Button>View Details</Button>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <nav className="mt-8 mb-8 flex items-center justify-center gap-2">
                    {/* Previous Button */}
                    <button
                        onClick={() => updateParams({ page: currentPage - 1 })}
                        disabled={currentPage <= 1}
                        className="flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ChevronLeftIcon className="h-4 w-4" />
                        Previous
                    </button>
                    
                    {/* Page Numbers */}
                    <div className="hidden sm:flex items-center gap-1">
                        {getPageNumbers().map((pageNum, index) => (
                            pageNum === '...' ? (
                                <span key={`ellipsis-${index}`} className="px-3 py-2 text-gray-500">
                                    ...
                                </span>
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
                    
                    {/* Mobile: Current Page Indicator */}
                    <span className="sm:hidden text-sm text-gray-600">
                        Page {currentPage} of {pagination.totalPages}
                    </span>
                    
                    {/* Next Button */}
                    <button
                        onClick={() => updateParams({ page: currentPage + 1 })}
                        disabled={currentPage >= pagination.totalPages}
                        className="flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Next
                        <ChevronRightIcon className="h-4 w-4" />
                    </button>
                </nav>
            )}
        </main>
    );
}

