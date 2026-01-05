import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import { useAuth } from '../contexts/authContext';
import { getToken } from '../services/authService';
import { formatDate } from '../utils/formatters';

interface DocumentData {
    id: number;
    title: string;
    author: string | null;
    date_publication: string | null;
    is_public: boolean;
    storage_path: string;
    category_name: string | null;
    user_id: number;
    textual_summary: string | null;
}

export default function EditDocumentPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user, isLoading: authLoading } = useAuth();

    // Document data
    const [document, setDocument] = useState<DocumentData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Edit mode states
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [isEditingAuthor, setIsEditingAuthor] = useState(false);
    const [isEditingDate, setIsEditingDate] = useState(false);
    const [isEditingVisibility, setIsEditingVisibility] = useState(false);

    // Form values
    const [titleValue, setTitleValue] = useState('');
    const [authorValue, setAuthorValue] = useState('');
    const [dateValue, setDateValue] = useState('');
    const [isPublicValue, setIsPublicValue] = useState(false);

    // Save states
    const [isSaving, setIsSaving] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [successField, setSuccessField] = useState<string | null>(null);

    // Fetch document data
    useEffect(() => {
        if (!id) return;

        const token = getToken();
        const headers: HeadersInit = token
            ? { 'Authorization': `Bearer ${token}` }
            : {};

        fetch(`${import.meta.env.VITE_BACKEND_URL}/api/documents/${id}`, { headers })
            .then(res => {
                if (!res.ok) throw new Error('Document not found');
                return res.json();
            })
            .then(({ data: { document: doc } }) => {
                setDocument(doc);
                setLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    }, [id]);

    // Redirect if not authenticated or not owner
    useEffect(() => {
        if (!authLoading && !user) {
            navigate('/login');
        }
        if (document && user && document.user_id !== user.id) {
            navigate('/my-documents');
        }
    }, [user, authLoading, document, navigate]);

    // ==================== Title Handlers ====================
    const handleEditTitle = () => {
        setTitleValue(document?.title || '');
        setIsEditingTitle(true);
        setError(null);
    };

    const handleCancelTitle = () => {
        setIsEditingTitle(false);
        setError(null);
    };

    const handleSaveTitle = async () => {
        if (!titleValue.trim()) {
            setError('Title is required');
            return;
        }

        await saveField({ title: titleValue.trim() }, 'title');
        setIsEditingTitle(false);
    };

    // ==================== Author Handlers ====================
    const handleEditAuthor = () => {
        setAuthorValue(document?.author || '');
        setIsEditingAuthor(true);
        setError(null);
    };

    const handleCancelAuthor = () => {
        setIsEditingAuthor(false);
        setError(null);
    };

    const handleSaveAuthor = async () => {
        await saveField({ author: authorValue.trim() || null }, 'author');
        setIsEditingAuthor(false);
    };

    // ==================== Date Handlers ====================
    const handleEditDate = () => {
        setDateValue(document?.date_publication || '');
        setIsEditingDate(true);
        setError(null);
    };

    const handleCancelDate = () => {
        setIsEditingDate(false);
        setError(null);
    };

    const handleSaveDate = async () => {
        await saveField({ date_publication: dateValue || null }, 'date');
        setIsEditingDate(false);
    };

    // ==================== Visibility Handlers ====================
    const handleEditVisibility = () => {
        setIsPublicValue(document?.is_public || false);
        setIsEditingVisibility(true);
        setError(null);
    };

    const handleCancelVisibility = () => {
        setIsEditingVisibility(false);
        setError(null);
    };

    const handleSaveVisibility = async () => {
        await saveField({ is_public: isPublicValue }, 'visibility');
        setIsEditingVisibility(false);
    };

    // ==================== Generic Save Function ====================
    const saveField = async (updates: Record<string, unknown>, fieldName: string) => {
        setIsSaving(true);
        setError(null);

        const token = getToken();

        try {
            const response = await fetch(
                `${import.meta.env.VITE_BACKEND_URL}/api/documents/${id}`,
                {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(updates),
                }
            );

            const result = await response.json();

            if (response.ok && result.success) {
                // Update local document state
                setDocument(prev => prev ? { ...prev, ...updates } : prev);
                setSuccess('Updated successfully');
                setSuccessField(fieldName);
                setTimeout(() => {
                    setSuccess(null);
                    setSuccessField(null);
                }, 3000);
            } else {
                setError(result.message || 'Failed to update');
            }
        } catch (err) {
            setError('An error occurred while saving');
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    // ==================== Loading States ====================
    if (loading || authLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <p className="text-gray-500">Loading document...</p>
            </div>
        );
    }

    if (error && !document) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-600 mb-4">{error}</p>
                    <Button variant="primary" onClick={() => navigate('/my-documents')}>
                        Back to My Documents
                    </Button>
                </div>
            </div>
        );
    }

    if (!document) {
        return null;
    }

    const isAnalyzed = !!document.textual_summary;

    return (
        <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto">

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-emerald-800 mb-2">
                        Edit Document
                    </h1>
                    <p className="text-gray-600">
                        Modify your document information.
                    </p>
                </div>

                {/* Document Info Card */}
                <div className="bg-white shadow rounded-lg p-6">

                    {/* Title Row */}
                    <div className="py-4 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <span className="text-sm font-medium text-gray-500 w-24">
                                    Title
                                </span>
                                {isEditingTitle ? (
                                    <input
                                        type="text"
                                        value={titleValue}
                                        onChange={(e) => setTitleValue(e.target.value)}
                                        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm 
                                                   focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        autoFocus
                                    />
                                ) : (
                                    <span className="text-gray-900 font-medium">
                                        {document.title}
                                    </span>
                                )}
                            </div>

                            {isEditingTitle ? (
                                <div className="flex gap-2">
                                    <Button variant="primary" size="sm" onClick={handleSaveTitle} disabled={isSaving}>
                                        {isSaving ? 'Saving...' : 'Save'}
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={handleCancelTitle} disabled={isSaving}>
                                        Cancel
                                    </Button>
                                </div>
                            ) : (
                                <Button variant="ghost" size="sm" onClick={handleEditTitle}>
                                    Edit
                                </Button>
                            )}
                        </div>
                        {isEditingTitle && error && (
                            <div className="ml-28 mt-2 p-2 rounded-md bg-red-50 border border-red-200">
                                <p className="text-sm text-red-600">{error}</p>
                            </div>
                        )}
                        {successField === 'title' && success && (
                            <div className="ml-28 mt-2 p-2 rounded-md bg-emerald-50 border border-emerald-200">
                                <p className="text-sm text-emerald-600">{success}</p>
                            </div>
                        )}
                    </div>

                    {/* Author Row */}
                    <div className="py-4 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <span className="text-sm font-medium text-gray-500 w-24">
                                    Author
                                </span>
                                {isEditingAuthor ? (
                                    <input
                                        type="text"
                                        value={authorValue}
                                        onChange={(e) => setAuthorValue(e.target.value)}
                                        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm 
                                                   focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        placeholder="Enter author name"
                                        autoFocus
                                    />
                                ) : (
                                    <span className="text-gray-900">
                                        {document.author || <span className="text-gray-400 italic">Not specified</span>}
                                    </span>
                                )}
                            </div>

                            {isEditingAuthor ? (
                                <div className="flex gap-2">
                                    <Button variant="primary" size="sm" onClick={handleSaveAuthor} disabled={isSaving}>
                                        {isSaving ? 'Saving...' : 'Save'}
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={handleCancelAuthor} disabled={isSaving}>
                                        Cancel
                                    </Button>
                                </div>
                            ) : (
                                <Button variant="ghost" size="sm" onClick={handleEditAuthor}>
                                    Edit
                                </Button>
                            )}
                        </div>
                        {successField === 'author' && success && (
                            <div className="ml-28 mt-2 p-2 rounded-md bg-emerald-50 border border-emerald-200">
                                <p className="text-sm text-emerald-600">{success}</p>
                            </div>
                        )}
                    </div>

                    {/* Date Row */}
                    <div className="py-4 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <span className="text-sm font-medium text-gray-500 w-24">
                                    Publication
                                </span>
                                {isEditingDate ? (
                                    <input
                                        type="date"
                                        value={dateValue}
                                        onChange={(e) => setDateValue(e.target.value)}
                                        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm 
                                                   focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        autoFocus
                                    />
                                ) : (
                                    <span className="text-gray-900">
                                        {document.date_publication 
                                            ? formatDate(document.date_publication) 
                                            : <span className="text-gray-400 italic">Not specified</span>}
                                    </span>
                                )}
                            </div>

                            {isEditingDate ? (
                                <div className="flex gap-2">
                                    <Button variant="primary" size="sm" onClick={handleSaveDate} disabled={isSaving}>
                                        {isSaving ? 'Saving...' : 'Save'}
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={handleCancelDate} disabled={isSaving}>
                                        Cancel
                                    </Button>
                                </div>
                            ) : (
                                <Button variant="ghost" size="sm" onClick={handleEditDate}>
                                    Edit
                                </Button>
                            )}
                        </div>
                        {successField === 'date' && success && (
                            <div className="ml-28 mt-2 p-2 rounded-md bg-emerald-50 border border-emerald-200">
                                <p className="text-sm text-emerald-600">{success}</p>
                            </div>
                        )}
                    </div>

                    {/* Visibility Row */}
                    <div className="py-4 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <span className="text-sm font-medium text-gray-500 w-24">
                                    Visibility
                                </span>
                                {isEditingVisibility ? (
                                    <div className="flex items-center gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="visibility"
                                                checked={!isPublicValue}
                                                onChange={() => setIsPublicValue(false)}
                                                className="text-emerald-600"
                                            />
                                            <span className="text-sm">Private</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="visibility"
                                                checked={isPublicValue}
                                                onChange={() => setIsPublicValue(true)}
                                                className="text-emerald-600"
                                            />
                                            <span className="text-sm">Public</span>
                                        </label>
                                    </div>
                                ) : (
                                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${
                                        document.is_public 
                                            ? 'bg-green-100 text-green-800' 
                                            : 'bg-gray-100 text-gray-600'
                                    }`}>
                                        {document.is_public ? 'Public' : 'Private'}
                                    </span>
                                )}
                            </div>

                            {isEditingVisibility ? (
                                <div className="flex gap-2">
                                    <Button variant="primary" size="sm" onClick={handleSaveVisibility} disabled={isSaving}>
                                        {isSaving ? 'Saving...' : 'Save'}
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={handleCancelVisibility} disabled={isSaving}>
                                        Cancel
                                    </Button>
                                </div>
                            ) : (
                                <Button variant="ghost" size="sm" onClick={handleEditVisibility}>
                                    Edit
                                </Button>
                            )}
                        </div>
                        {successField === 'visibility' && success && (
                            <div className="ml-28 mt-2 p-2 rounded-md bg-emerald-50 border border-emerald-200">
                                <p className="text-sm text-emerald-600">{success}</p>
                            </div>
                        )}
                    </div>

                    {/* Category Row (Read-only) */}
                    <div className="py-4 border-b border-gray-100">
                        <div className="flex items-center gap-4">
                            <span className="text-sm font-medium text-gray-500 w-24">
                                Category
                            </span>
                            {document.category_name ? (
                                <span className="inline-block bg-teal-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full">
                                    {document.category_name}
                                </span>
                            ) : (
                                <span className="text-gray-400 italic text-sm">
                                    Not categorized (will be set by AI analysis)
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Analysis Status Row (Read-only) */}
                    <div className="py-4">
                        <div className="flex items-center gap-4">
                            <span className="text-sm font-medium text-gray-500 w-24">
                                Status
                            </span>
                            <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${
                                isAnalyzed
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-yellow-100 text-yellow-800'
                            }`}>
                                {isAnalyzed ? '✓ Analyzed' : '⏳ Pending analysis'}
                            </span>
                        </div>
                    </div>

                </div>

                {/* Action Buttons */}
                <div className="mt-6 flex gap-4">
                    <Button variant="ghost" onClick={() => navigate('/my-documents')}>
                        ← Back to My Documents
                    </Button>
                    {isAnalyzed && (
                        <Button variant="primary" onClick={() => navigate(`/documents/${id}`)}>
                            View Analysis
                        </Button>
                    )}
                </div>

            </div>
        </main>
    );
}

