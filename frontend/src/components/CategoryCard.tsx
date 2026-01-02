import type { Category } from '../types/category';
import { normalizeFileName } from '../utils/file';

interface CategoryCardProps {
    category: Category;
}

export default function CategoryCard({category}: CategoryCardProps) {
    const {name, description, documentsTotal} = category;
    return (
        <div className="max-w-sm rounded overflow-hidden shadow-lg flex flex-col h-full">
            <img
                alt={`Category ${name}`}
                src={`/logosCategory/${normalizeFileName(name)}.jpg`}
                className="w-full h-48 object-cover"
            />
            <div className="px-6 py-4 flex-grow flex flex-col">
                <h3 className="font-bold text-xl mb-2">{name}</h3>
                <p className="text-gray-700 text-base flex-grow">
                    {description}
                </p>
            </div>
            <div className="px-6 pt-4 pb-2 mt-auto">
                <p className="text-sm text-gray-600">
                    Documents total: {documentsTotal}
                </p>
            </div>
        </div>
    )
}