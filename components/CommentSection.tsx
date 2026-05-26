// components/CommentSection.tsx

import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { toast } from 'react-toastify';
import { Comment, generateDefaultAvatar, commentService } from '../lib/firestore';
import { PaperAirplaneIcon } from './icons';

const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
};

const formatTimestamp = (timestamp: any): string => {
    if (!timestamp) return '';
    if (typeof timestamp === 'string') return timestamp;
    if (typeof timestamp.toDate === 'function') {
        return timestamp.toDate().toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    if (typeof timestamp === 'object' && 'seconds' in timestamp) {
        return new Date(timestamp.seconds * 1000).toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    if (timestamp instanceof Date) {
        return timestamp.toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    return 'Date inconnue';
};

const getTimestampMillis = (timestamp: any): number => {
    if (!timestamp) return 0;
    if (typeof timestamp === 'string') return new Date(timestamp).getTime();
    if (typeof timestamp.toDate === 'function') return timestamp.toDate().getTime();
    if (typeof timestamp === 'object' && 'seconds' in timestamp) return timestamp.seconds * 1000;
    if (timestamp instanceof Date) return timestamp.getTime();
    return 0;
};

const CommentItem: React.FC<{ comment: Comment }> = ({ comment }) => (
    <div className="flex items-start space-x-3 group">
        <div className="relative flex-shrink-0">
            <img
                src={comment.user_photo_url || generateDefaultAvatar(comment.created_by)}
                alt={comment.created_by}
                className="w-12 h-12 rounded-full ring-2 ring-amber-500/20 group-hover:ring-amber-500/40 transition-all duration-300"
            />
        </div>
        <div className="flex-1 min-w-0">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-black dark:to-gray-900 p-4 rounded-xl rounded-tl-none shadow-sm group-hover:shadow-md transition-all duration-300 border border-gray-200/50 dark:border-gray-700/50">
                <p className="font-bold text-sm text-gray-900 dark:text-white mb-1.5">{comment.created_by}</p>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed break-words">{comment.comment}</p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 ml-1">
                {formatTimestamp(comment.created_at)}
            </p>
        </div>
    </div>
);

interface CommentSectionProps {
    itemUid: string;
    onAuthRequired: (action: string) => void;
}

const CommentSection: React.FC<CommentSectionProps> = ({ itemUid, onAuthRequired }) => {
    const { t, userProfile } = useAppContext();
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const MAX_COMMENT_LENGTH = 280;

    useEffect(() => {
        const fetchComments = async () => {
            if (!itemUid) return;
            const fetchedComments = await commentService.getComments(itemUid);
            const sortedComments = [...fetchedComments].sort((a, b) => {
                const dateA = getTimestampMillis(a.created_at);
                const dateB = getTimestampMillis(b.created_at);
                return dateB - dateA;
            });
            setComments(sortedComments);
        };
        fetchComments();
    }, [itemUid]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || newComment.length > MAX_COMMENT_LENGTH) return;

        if (!userProfile) {
            onAuthRequired('commenter cette vidéo');
            return;
        }

        try {
            const addedComment = await commentService.addComment(itemUid, newComment, userProfile);
            if (addedComment) {
                setComments([addedComment, ...comments]);
                setNewComment('');
            }
        } catch (error) {
            console.error('Error adding comment:', error);
            toast.error('Erreur lors de l\'ajout du commentaire', {
                position: 'bottom-center',
                autoClose: 2000,
            });
        }
    };

    const charCountColor = newComment.length > MAX_COMMENT_LENGTH
        ? 'text-red-500'
        : newComment.length > MAX_COMMENT_LENGTH - 20
            ? 'text-yellow-500'
            : 'text-gray-500 dark:text-gray-400';

    return (
        <div className="space-y-6">
            <div className="pb-2 border-b border-gray-200 dark:border-black">
                <h3 className="text-2xl font-black text-gray-900 dark:text-white">
                    {t('comments')} <span className="text-amber-500">({comments.length})</span>
                </h3>
            </div>

            <form onSubmit={handleSubmit} className="flex items-start space-x-3 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-black dark:to-gray-900 p-4 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm">
                <img src={userProfile?.photo_url || generateDefaultAvatar(userProfile?.display_name)} alt="you" className="w-12 h-12 rounded-full flex-shrink-0 ring-2 ring-amber-500/20" />
                <div className="flex-1">
                    <div className="relative">
                        <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder={t('addAComment')}
                            className="w-full bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-4 pr-14 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none transition-all duration-300 shadow-sm"
                            rows={3}
                            maxLength={MAX_COMMENT_LENGTH + 1}
                        />
                        <button
                            type="submit"
                            className="absolute right-3 bottom-3 p-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full hover:from-amber-600 hover:to-orange-600 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-110 disabled:hover:scale-100"
                            disabled={!newComment.trim() || newComment.length > MAX_COMMENT_LENGTH}
                        >
                            <PaperAirplaneIcon className="w-5 h-5" />
                        </button>
                    </div>
                    <p className={`text-xs text-right mt-2 pr-2 font-semibold ${charCountColor}`}>
                        {newComment.length}/{MAX_COMMENT_LENGTH}
                    </p>
                </div>
            </form>
            <div className="space-y-4">
                {comments.length > 0 ? (
                    comments.map((comment, index) => <CommentItem key={`${comment.uid}-${index}-${comment.created_at}`} comment={comment} />)
                ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <p className="text-lg font-semibold">Aucun commentaire pour le moment</p>
                        <p className="text-sm mt-2">Soyez le premier à commenter !</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export { formatNumber, formatTimestamp, getTimestampMillis, CommentItem, CommentSection };
