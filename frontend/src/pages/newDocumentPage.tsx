import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DocumentArrowUpIcon } from '@heroicons/react/24/outline';
import Button from '../components/Button';
import { useAuth } from '../contexts/authContext';
import { getToken } from '../services/authService';

export default function NewDocumentPage() {
    const { t } = useTranslation();
    const { user, isLoading } = useAuth();
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form state
    const [title, setTitle] = useState('');
    const [author, setAuthor] = useState('');
    const [datePublication, setDatePublication] = useState('');
    const [isPublic, setIsPublic] = useState(false);
    const [analyzeWithAI, setAnalyzeWithAI] = useState(true);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // UI state
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Redirect if not authenticated
    useEffect(() => {
        if (!isLoading && !user) {
            navigate('/login');
        }
    }, [user, isLoading, navigate]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.type !== 'application/pdf') {
                setError(t('newDocument.onlyPdf'));
                return;
            }
            setSelectedFile(file);
            setError(null);
        }
    };

    const handleClickUpload = () => {
        fileInputRef.current?.click();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!title.trim()) {
            setError(t('newDocument.titleRequired'));
            return;
        }
        if (!selectedFile) {
            setError(t('newDocument.fileRequired'));
            return;
        }

        setIsSubmitting(true);
        setError(null);

        const formData = new FormData();
        formData.append('title', title);
        formData.append('author', author);
        formData.append('date_publication', datePublication);
        formData.append('is_public', String(isPublic));
        formData.append('analyze_with_ai', String(analyzeWithAI));
        formData.append('document', selectedFile);

        try {
            const response = await fetch(
                `${import.meta.env.VITE_BACKEND_URL}/api/documents`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${getToken()}`,
                    },
                    body: formData,
                }
            );

            const result = await response.json();

            if (response.ok && result.success) {
                setSuccess(t('newDocument.uploadSuccess'));
                setTimeout(() => navigate('/my-documents'), 2000);
            } else {
                setError(result.message || t('newDocument.uploadFailed'));
            }
        } catch (err) {
            setError(t('common.error'));
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-gray-500">{t('common.loading')}</div>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto">
                
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-emerald-800 mb-2">
                        {t('newDocument.title')}
                    </h1>
                    <p className="text-gray-600">
                        {t('newDocument.description')}
                    </p>
                </div>

                {/* Success Message */}
                {success && (
                    <div className="mb-6 p-4 rounded-md bg-emerald-50 border border-emerald-200">
                        <p className="text-emerald-700">{success}</p>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-4 rounded-md bg-red-50 border border-red-200">
                        <p className="text-red-700">{error}</p>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
                    
                    {/* Title Field */}
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                            {t('newDocument.titleField')} <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={t('newDocument.titlePlaceholder')}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 
                                       focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            required
                        />
                    </div>

                    {/* Author Field */}
                    <div>
                        <label htmlFor="author" className="block text-sm font-medium text-gray-700 mb-1">
                            {t('newDocument.author')}
                        </label>
                        <input
                            type="text"
                            id="author"
                            value={author}
                            onChange={(e) => setAuthor(e.target.value)}
                            placeholder={t('newDocument.authorPlaceholder')}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 
                                       focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                    </div>

                    {/* Date Publication Field */}
                    <div>
                        <label htmlFor="datePublication" className="block text-sm font-medium text-gray-700 mb-1">
                            {t('newDocument.publicationDate')}
                        </label>
                        <input
                            type="date"
                            id="datePublication"
                            value={datePublication}
                            onChange={(e) => setDatePublication(e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 
                                       focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                    </div>

                    {/* File Upload */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('newDocument.pdfDocument')} <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="application/pdf"
                            className="hidden"
                        />
                        <div 
                            onClick={handleClickUpload}
                            className="border-2 border-dashed border-gray-300 rounded-lg p-6 
                                       text-center cursor-pointer hover:border-emerald-400 
                                       hover:bg-emerald-50 transition-colors"
                        >
                            <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                            {selectedFile ? (
                                <p className="mt-2 text-sm text-emerald-600 font-medium">
                                    {selectedFile.name}
                                </p>
                            ) : (
                                <>
                                    <p className="mt-2 text-sm text-gray-600">
                                        {t('newDocument.clickToSelect')}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        {t('newDocument.pdfOnly')}
                                    </p>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Checkboxes */}
                    <div className="space-y-4">
                        {/* Public Checkbox */}
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="isPublic"
                                checked={isPublic}
                                onChange={(e) => setIsPublic(e.target.checked)}
                                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 
                                           border-gray-300 rounded"
                            />
                            <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-700">
                                {t('newDocument.makePublic')}
                            </label>
                        </div>

                        {/* Analyze with AI Checkbox */}
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="analyzeWithAI"
                                checked={analyzeWithAI}
                                onChange={(e) => setAnalyzeWithAI(e.target.checked)}
                                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 
                                           border-gray-300 rounded"
                            />
                            <label htmlFor="analyzeWithAI" className="ml-2 block text-sm text-gray-700">
                                {t('newDocument.analyzeWithAI')}
                            </label>
                        </div>
                    </div>

                    {/* Submit Buttons */}
                    <div className="flex gap-4 pt-4">
                        <Button
                            type="submit"
                            variant="primary"
                            disabled={isSubmitting}
                            className="flex-1"
                        >
                            {isSubmitting ? t('newDocument.uploading') : t('newDocument.upload')}
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => navigate('/my-documents')}
                            disabled={isSubmitting}
                        >
                            {t('common.cancel')}
                        </Button>
                    </div>
                </form>

            </div>
        </main>
    );
}
