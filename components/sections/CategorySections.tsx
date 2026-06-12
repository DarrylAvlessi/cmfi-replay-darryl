import React from 'react';
import { MediaContent, MediaType } from '../../types';
import { Serie, SerieCategory, getCategoryName } from '../../lib/db';
import MediaCard from '../MediaCard';
import { transformSerieToMediaContent } from '../../utils/mediaTransformers';
import { useAppContext } from '../../context/AppContext';

interface CategorySectionsProps {
    serieCategories: SerieCategory[];
    seriesByCategory: Record<string, Serie[]>;
    loading: boolean;
    onSelectMedia: (item: MediaContent) => void;
    onPlay: (item: MediaContent) => void;
}

const CategorySections: React.FC<CategorySectionsProps> = React.memo(({
    serieCategories,
    seriesByCategory,
    loading,
    onSelectMedia,
    onPlay
}) => {
    const { language } = useAppContext();

    if (loading) return null;

    if (serieCategories.length === 0) {
        return (
            <div className="px-4 md:px-6 lg:px-8 py-4 text-sm text-gray-500 dark:text-gray-400">
                💡 Aucune catégorie créée. Créez des catégories dans la page Admin pour organiser vos séries.
            </div>
        );
    }

    return (
        <>
            {serieCategories.map((category) => {
                const categorySeries = seriesByCategory[category.id] || [];
                
                // Afficher la catégorie même si elle est vide
                if (categorySeries.length === 0) {
                    return (
                        <div key={category.id} className="py-6 md:py-8 lg:py-10 mt-4 md:mt-6">
                            <div className="px-4 md:px-6 lg:px-8 mb-6">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-1 h-8 rounded-full"
                                        style={{ backgroundColor: category.color || '#3B82F6' }}
                                    />
                                    <h3 className="text-2xl md:text-3xl font-serif font-bold text-gray-900 dark:text-white">
                                        {getCategoryName(category, language)}
                                    </h3>
                                </div>
                            </div>
                            <div className="px-4 md:px-6 lg:px-8">
                                <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                                    Aucune série dans cette catégorie. Assignez des séries à cette catégorie dans la page Admin.
                                </p>
                            </div>
                        </div>
                    );
                }

                return (
                    <div key={category.id} className="py-6 md:py-8 lg:py-10 mt-4 md:mt-6">
                        <div className="px-4 md:px-6 lg:px-8 mb-6">
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-1 h-8 rounded-full"
                                    style={{ backgroundColor: category.color || '#3B82F6' }}
                                />
                                <h3 className="text-2xl md:text-3xl font-serif font-bold text-gray-900 dark:text-white">
                                    {getCategoryName(category, language)}
                                </h3>
                            </div>
                            {category.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 ml-4">
                                    {category.description}
                                </p>
                            )}
                        </div>
                        <div className="flex space-x-2 md:space-x-4 lg:space-x-6 overflow-x-auto px-4 md:px-6 lg:px-8 scrollbar-hide pb-4">
                            {categorySeries.map((serie) => (
                                <div key={serie.uid_serie} className="flex-shrink-0">
                                    <MediaCard
                                        item={transformSerieToMediaContent(serie, MediaType.Series)}
                                        variant="poster"
                                        onSelect={onSelectMedia}
                                        onPlay={onPlay}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </>
    );
});

export default CategorySections;
