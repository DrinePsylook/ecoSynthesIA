import type { TrendData } from '../types/trend';

interface TrendMapCardProps {
    trends: TrendData[];
}

export default function TrendMapCard({trends}: TrendMapCardProps) {
    if (!trends || trends.length === 0) {
        return (
            <section className="flex justify-center items-center">
                <div className="relative h-40 w-40 rounded-full bg-gray-100 flex items-center justify-center">
                    <p className="text-gray-500 text-center px-4 text-sm">
                        No trends available
                    </p>
                </div>
            </section>
        );
    }
    
    return (
        <section className="w-full">
            {/* Titre de la section */}
            <h2 className="text-center text-2xl font-bold text-gray-800 mb-8">
                🔥 Hot Topics
            </h2>
            
            {/* Grille de cercles */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                {trends.slice(0, 3).map((trend, index) => (
                    <div 
                        key={index}
                        className="flex flex-col items-center"
                    >
                        {/* Cercle pour chaque trend */}
                        <div 
                            className="relative h-85 w-85 border-2 border-emerald-600 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex flex-col items-center justify-center p-6 shadow-xl hover:shadow-2xl transition-all hover:scale-105 cursor-pointer"
                        >
                            {/* Overlay décoratif */}
                            <div className="absolute inset-0 rounded-full bg-green-600 opacity-20"></div>
                            
                            {/* Contenu */}
                            <div className="relative z-10 text-center">
                            <p className="font-bold text-white text-lg mb-2">
                                {trend.key}
                            </p>
                                <p className="text-white text-sm opacity-90">
                                    📊 {trend.frequency}
                                </p>
                                {trend.avg_value !== null && (
                                    <p className="text-white text-xs mt-1 opacity-80">
                                        {trend.avg_value} {trend.unit}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}