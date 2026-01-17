import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import CategoryCard from '../components/CategoryCard'
import type { Category } from '../types/category';

export default function AllCategoriesPage() {
    const { t } = useTranslation();
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${import.meta.env.VITE_BACKEND_URL}/api/categories`)
        .then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        })
        .then(data => {
            setCategories(data.data || []);
            setLoading(false);
        })
    }, []);

    if (loading) {
        return <div>{t('common.loading')}</div>;
    }

    return (
        <>
        <main className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8 space-y-8 py-8">
            <div>
                <h1 className="text-center text-2xl font-bold text-gray-800 mb-8">📋 {t('categories.title')}</h1>
            </div>
            <section className="flex justify-center items-center py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">            
            {categories.map(category => (
                <Link to={`/categories/${category.id}`} key={category.id}>
                    <CategoryCard key={category.id} category={category} />
                </Link>
            ))}
          </div>
        </section>

        </main>
        </>
    );
}
