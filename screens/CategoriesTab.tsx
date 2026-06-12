import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { serieCategoryService, SerieCategory, getCategoryName } from '../lib/db';
import { useAppContext } from '../context/AppContext';

const CategoriesTab: React.FC = () => {
    const { language } = useAppContext();
    const [categories, setCategories] = useState<SerieCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingCategory, setEditingCategory] = useState<SerieCategory | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        nameFr: '',
        description: '',
        color: '#3B82F6',
        order: 0
    });

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        setLoading(true);
        try {
            const cats = await serieCategoryService.getAllCategories();
            setCategories(cats);
        } catch (error: any) {
            console.error('Erreur lors du chargement des catégories:', error);
            toast.error(error.message || 'Erreur lors du chargement des catégories');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!formData.name.trim()) {
            toast.error('Le nom de la catégorie est requis');
            return;
        }

        try {
            await serieCategoryService.createCategory(formData);
            toast.success('Catégorie créée avec succès');
            setShowCreateModal(false);
            setFormData({ name: '', nameFr: '', description: '', color: '#3B82F6', order: 0 });
            loadCategories();
        } catch (error: any) {
            console.error('Erreur lors de la création:', error);
            toast.error(error.message || 'Erreur lors de la création');
        }
    };

    const handleUpdate = async () => {
        if (!editingCategory || !formData.name.trim()) {
            toast.error('Le nom de la catégorie est requis');
            return;
        }

        try {
            await serieCategoryService.updateCategory(editingCategory.id, formData);
            toast.success('Catégorie mise à jour avec succès');
            setEditingCategory(null);
            setFormData({ name: '', nameFr: '', description: '', color: '#3B82F6', order: 0 });
            loadCategories();
        } catch (error: any) {
            console.error('Erreur lors de la mise à jour:', error);
            toast.error(error.message || 'Erreur lors de la mise à jour');
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ?')) {
            return;
        }

        try {
            await serieCategoryService.deleteCategory(id);
            toast.success('Catégorie supprimée avec succès');
            loadCategories();
        } catch (error: any) {
            console.error('Erreur lors de la suppression:', error);
            toast.error(error.message || 'Erreur lors de la suppression');
        }
    };

    const handleEdit = (category: SerieCategory) => {
        setEditingCategory(category);
        setFormData({
            name: category.name,
            nameFr: category.nameFr || '',
            description: category.description || '',
            color: category.color || '#3B82F6',
            order: category.order || 0
        });
    };

    if (loading) {
        return <div className="text-center py-8">Chargement...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Gestion des catégories</h2>
                <button
                    onClick={() => {
                        setShowCreateModal(true);
                        setFormData({ name: '', nameFr: '', description: '', color: '#3B82F6', order: 0 });
                    }}
                    className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                >
                    + Créer une catégorie
                </button>
            </div>

            {categories.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <p>Aucune catégorie créée. Créez-en une pour commencer.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categories.map(category => (
                        <div
                            key={category.id}
                            className="bg-white dark:bg-black rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-4 h-4 rounded-full"
                                        style={{ backgroundColor: category.color || '#3B82F6' }}
                                    />
                                    <h3 className="font-semibold text-gray-900 dark:text-white">{getCategoryName(category, language)}</h3>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleEdit(category)}
                                        className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300"
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        onClick={() => handleDelete(category.id)}
                                        className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                            {category.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{category.description}</p>
                            )}
                            <p className="text-xs text-gray-500 dark:text-gray-500">Ordre: {category.order || 0}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal de création/édition */}
            {(showCreateModal || editingCategory) && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-black rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                            {editingCategory ? 'Modifier la catégorie' : 'Créer une catégorie'}
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Nom *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="Ex: UMPJ"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Nom (FR)
                                </label>
                                <input
                                    type="text"
                                    value={formData.nameFr}
                                    onChange={(e) => setFormData({ ...formData, nameFr: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="Nom en français"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Description
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="Description de la catégorie"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Couleur
                                    </label>
                                    <input
                                        type="color"
                                        value={formData.color}
                                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                        className="w-full h-10 rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Ordre
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.order}
                                        onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                                        className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={editingCategory ? handleUpdate : handleCreate}
                                    className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
                                >
                                    {editingCategory ? 'Enregistrer' : 'Créer'}
                                </button>
                                <button
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        setEditingCategory(null);
                                        setFormData({ name: '', nameFr: '', description: '', color: '#3B82F6', order: 0 });
                                    }}
                                    className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                                >
                                    Annuler
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CategoriesTab;

