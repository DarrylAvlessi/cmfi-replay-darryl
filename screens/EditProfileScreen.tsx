import React, { useState, useEffect, useRef } from 'react';
import Header from '../components/Header';
import InputField from '../components/InputField';
import { useAppContext } from '../context/AppContext';
import { userService, UserProfile } from '../lib/db';
import { storage } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface EditProfileScreenProps {
    onBack: () => void;
}

const EditProfileScreen: React.FC<EditProfileScreenProps> = ({ onBack }) => {
    const { t, user, userProfile, setUserProfile } = useAppContext();
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [photoUrl, setPhotoUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleToggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    // Initialiser les champs une seule fois au montage
    const initialized = useRef(false);
    useEffect(() => {
        if (userProfile && !initialized.current) {
            setFullName(userProfile.display_name || '');
            setEmail(userProfile.email || '');
            setPhotoUrl(userProfile.photo_url || '');
            initialized.current = true;
        }
    }, [userProfile]);

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Valider le type de fichier
        if (!file.type.startsWith('image/')) {
            setError('Veuillez sélectionner une image');
            return;
        }

        // Valider la taille (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setError("L'image ne doit pas dépasser 5MB");
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Upload vers Firebase Storage
            if (!user) {
                throw new Error('Not authenticated');
            }
            
            // Create a unique filename with timestamp and user ID for better security
            const timestamp = Date.now();
            const fileExtension = file.name.split('.').pop();
            const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const filePath = `avatars/${user.uid}/${timestamp}_${sanitizedFileName}`;
            
            console.log('Uploading to path:', filePath);
            
            const storageRef = ref(storage, filePath);
            
            // Add metadata for better security and content type
            const metadata = {
                contentType: file.type,
                customMetadata: {
                    uploadedBy: user.uid,
                    originalName: file.name
                }
            };
            
            await uploadBytes(storageRef, file, metadata);
            const downloadUrl = await getDownloadURL(storageRef);
            setPhotoUrl(downloadUrl);
            console.log('Upload successful:', downloadUrl);
        } catch (error) {
            console.error('Error uploading photo:', error);
            
            // Provide more specific error messages
            if (error instanceof Error) {
                if (error.message.includes('storage/unauthorized') || error.message.includes('permission')) {
                    setError('Permission refusée pour le téléchargement. Veuillez contacter l\'administrateur.');
                } else if (error.message.includes('storage/quota-exceeded')) {
                    setError('Espace de stockage plein. Veuillez réessayer plus tard.');
                } else if (error.message.includes('storage/file-size-exceeded')) {
                    setError('Fichier trop volumineux. La taille maximale est de 5MB.');
                } else {
                    setError(`Erreur lors du téléchargement: ${error.message}`);
                }
            } else {
                setError('Erreur lors du téléchargement de la photo');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!user || !fullName || !email) {
            setError('Veuillez remplir tous les champs');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const updates: Partial<UserProfile> = {
                display_name: fullName,
                email: email,
            };
            if (photoUrl) {
                updates.photo_url = photoUrl;
            }
            const updatedProfile = await userService.updateUserProfile(user.uid, updates);
            
            // Mettre à jour le profil dans le contexte
            setUserProfile(updatedProfile);
            
            onBack(); // Retourner après la sauvegarde
        } catch (error) {
            console.error('Error updating profile:', error);
            setError('Erreur lors de la mise à jour du profil');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <Header 
                title={t('editProfileScreenTitle')} 
                onBack={onBack}
                isSidebarOpen={isSidebarOpen}
                onToggleSidebar={handleToggleSidebar}
            />
            <div className="mx-auto max-w-2xl space-y-4 p-4 animate-fadeIn lg:space-y-6 lg:p-6">
                <div className="broadcast-panel flex flex-col items-center space-y-2 rounded-3xl p-6 lg:space-y-4 lg:p-8">
                    <div className="relative">
                        <img 
                            src={photoUrl || 'https://picsum.photos/seed/defaultuser/200/200'} 
                            alt="Your avatar" 
                            className="h-20 w-20 rounded-3xl border border-white/30 object-cover shadow-xl ring-4 ring-blue-500/10 lg:h-32 lg:w-32 dark:ring-sky-400/10"
                        />
                        {loading && (
                            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                                <div className="text-white text-sm">{t('loading') || 'Chargement...'}</div>
                            </div>
                        )}
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={loading}
                        className="rounded-xl border border-blue-500/15 bg-blue-500/5 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:text-sky-300"
                    >
                        {t('changePhoto')}
                    </button>
                </div>

                <div className="space-y-4 lg:space-y-6">
                    {error && (
                        <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300">
                            {error}
                        </div>
                    )}
                    
                    <InputField 
                        label={t('fullName')} 
                        id="fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        disabled={loading}
                    />
                    
                    <InputField 
                        label={t('email')} 
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                    />
                </div>

                <div className="pt-2 lg:pt-4">
                    <button 
                        onClick={handleSave}
                        disabled={loading}
                        className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-6 py-2.5 font-bold text-white shadow-lg shadow-blue-600/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 lg:py-3"
                    >
                        {loading ? 'Sauvegarde...' : (t('saveChanges') || 'Sauvegarder les modifications')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditProfileScreen;
