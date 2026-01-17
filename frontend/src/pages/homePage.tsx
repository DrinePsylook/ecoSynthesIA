import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import CategoryCard from '../components/CategoryCard'
import TrendMapCard from '../components/TrendMapCard'
import DocumentCard from '../components/DocumentCard'
import type { Category } from '../types/category';
import type { TrendData } from '../types/trend';
import type { AnalyzedDocument } from '../types/document';

export default function HomePage() {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzedDocuments, setAnalyzedDocuments] = useState<AnalyzedDocument[]>([]);
  const [displayLimit, setDisplayLimit] = useState(6);

  useEffect(() => {
    const updateLimit = () => {
      if (window.innerWidth < 768) {
        setDisplayLimit(3); // Mobile: 3 documents
      } else {
        setDisplayLimit(6); // Desktop/Tablet: 6 documents
      }
    };
    
    updateLimit();
    window.addEventListener('resize', updateLimit);
    return () => window.removeEventListener('resize', updateLimit);
  }, []);

  useEffect(() => {
    // Fetch both categories and trends in parallel
    Promise.all([
      fetch(`${import.meta.env.VITE_BACKEND_URL}/api/categories/top`),
      fetch(`${import.meta.env.VITE_BACKEND_URL}/api/trends/hot-topics`),
      fetch(`${import.meta.env.VITE_BACKEND_URL}/api/documents/analyzed?limit=${displayLimit}`)
    ])
      .then(([catRes, trendRes, docRes]) => Promise.all([catRes.json(), trendRes.json(), docRes.json()]))
      .then(([catData, trendData, docData]) => {
        setCategories(catData.data || []);
        setTrends(trendData.data || trendData);
        setAnalyzedDocuments(docData.data || []); 
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching data:', error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div>{t('common.loading')}</div>;
  }

  return (
    <>
      <main className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8 space-y-8 py-8">
      {/* Categories Section */}
        <section className="flex justify-center items-center py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">            
            {categories.map(category => (
              <Link to={`/categories/${category.id}`} key={category.id}>
                <CategoryCard key={category.id} category={category} />
              </Link>
            ))}
          </div>
        </section>
  
        {/* TrendMap Section */}
        <section className="flex justify-center items-center py-8">
          <TrendMapCard trends={trends}/>
        </section>

        {/* Documents Section */}
        <section className="py-8">
          <div className="bg-teal-50 rounded-lg shadow-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-emerald-800">
                {t('home.recentlyAnalyzed')}
              </h2>
              <a 
                href="/documents" 
                className="text-emerald-500 hover:text-emerald-600 font-medium"
              >
                {t('home.viewAll')}
              </a>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {analyzedDocuments.map(document => (
                <DocumentCard key={document.id} document={document} />
              ))}
            </div>
            
            {analyzedDocuments.length === 0 && (
              <p className="text-gray-500 text-center py-8">
                {t('home.noDocuments')}
              </p>
            )}
          </div>
        </section>
      </main>
    </>
  )
}
