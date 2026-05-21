import React, { useState, useEffect, useRef } from 'react';
import Header from '../components/Header';
import InputField from '../components/InputField';
import { useAppContext } from '../context/AppContext';
import { userService, UserProfile } from '../lib/firestore';
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
            const updatedProfile = await userService.updateUserProfile(user.uid, {
                display_name: fullName,
                email: email,
                photo_url: photoUrl || null
            });
            
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
            <div className="p-4 space-y-8 animate-fadeIn">
                <div className="flex flex-col items-center space-y-4">
                    <div className="relative">
                        <img 
                            src={photoUrl || 'https://picsum.photos/seed/defaultuser/200/200'} 
                            alt="Your avatar" 
                            className="w-32 h-32 rounded-full border-4 border-amber-500 object-cover"
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
                        className="text-amber-500 font-semibold hover:text-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {t('changePhoto')}
                    </button>
                </div>

                <div className="space-y-6">
                    {error && (
                        <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
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

                <div className="pt-4">
                    <button 
                        onClick={handleSave}
                        disabled={loading}
                        className="w-full bg-amber-500 text-gray-900 font-bold py-3 px-6 rounded-lg hover:bg-amber-400 transition-colors duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Sauvegarde...' : (t('saveChanges') || 'Sauvegarder les modifications')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditProfileScreen;
