import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { toast } from 'react-toastify';
import { Comment, generateDefaultAvatar, commentService } from '../lib/db';
import {
    LikeIcon,
    TrashIcon,
    XMarkIcon,
    CheckIcon,
    CommentIcon,
    ChevronDownIcon,
} from './icons';

const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
};

const getTimestampMillis = (timestamp: any): number => {
    if (!timestamp) return 0;
    if (typeof timestamp === 'string') {
        const trimmed = timestamp.trim();
        const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})(?:\s+UTC([+-]\d{1,2})(?::\d{2})?)?$/i;
        const match = trimmed.match(dateRegex);
        if (match) {
            const [, day, month, year, hours, minutes, seconds, tz] = match;
            const date = new Date(Date.UTC(+year, +month - 1, +day, +hours, +minutes, +seconds));
            if (tz) date.setUTCMinutes(date.getUTCMinutes() - +tz * 60);
            return date.getTime();
        }
        const fallbackRegex = /^(\d{2})\/(\d{2})\/(\d{4})/;
        const fallbackMatch = trimmed.match(fallbackRegex);
        if (fallbackMatch) {
            const [, day, month, year] = fallbackMatch;
            return new Date(+year, +month - 1, +day).getTime();
        }
        return new Date(timestamp).getTime();
    }
    if (typeof timestamp.toDate === 'function') return timestamp.toDate().getTime();
    if (typeof timestamp === 'object' && 'seconds' in timestamp) return timestamp.seconds * 1000;
    if (timestamp instanceof Date) return timestamp.getTime();
    return 0;
};

const formatRelativeTime = (timestamp: any, locale: string): string => {
    const ms = getTimestampMillis(timestamp);
    if (!ms) return '';
    const now = Date.now();
    if (ms > now) return '';
    const diff = now - ms;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (seconds < 60) return locale === 'fr-FR' ? `à l'instant` : 'just now';
    if (minutes < 60) return locale === 'fr-FR' ? `il y a ${minutes} min` : `${minutes}m ago`;
    if (hours < 24) return locale === 'fr-FR' ? `il y a ${hours}h` : `${hours}h ago`;
    if (days < 7) return locale === 'fr-FR' ? `il y a ${days}j` : `${days}d ago`;
    if (weeks < 5) return locale === 'fr-FR' ? `il y a ${weeks} sem` : `${weeks}w ago`;
    if (months < 12) return locale === 'fr-FR' ? `il y a ${months} mois` : `${months}mo ago`;
    if (locale === 'fr-FR') return `il y a ${years} ${years === 1 ? 'an' : 'ans'}`;
    return `${years}y ago`;
};

const formatFullDate = (timestamp: any, locale: string): string => {
    const ms = getTimestampMillis(timestamp);
    if (!ms) return '';
    return new Date(ms).toLocaleString(locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const PAGE_SIZE = 15;

interface CommentSectionProps {
    itemUid: string;
    onAuthRequired: (action: string) => void;
}

const MAX_COMMENT_LENGTH = 280;

type SortOrder = 'newest' | 'oldest';

const CommentSection: React.FC<CommentSectionProps> = ({ itemUid, onAuthRequired }) => {
    const { t, userProfile, language } = useAppContext();
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [replyTo, setReplyTo] = useState<{ id: string; username: string } | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editText, setEditText] = useState('');
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [inputFocused, setInputFocused] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const locale = language === 'fr' ? 'fr-FR' : 'en-US';

    const fetchComments = useCallback(async (append = false) => {
        if (!itemUid) {
            setIsLoading(false);
            return;
        }
        if (!append) setIsLoading(true);
        setFetchError(false);
        try {
            const startAfter = append && comments.length > 0 ? comments[comments.length - 1].id : undefined;
            const result = await commentService.getComments(itemUid, {
                limit: PAGE_SIZE,
                startAfter,
            });
            if (append) {
                setComments(prev => [...prev, ...result.comments]);
            } else {
                setComments(result.comments);
            }
            setHasMore(result.hasMore);
        } catch {
            setFetchError(true);
        } finally {
            setIsLoading(false);
            setLoadingMore(false);
        }
    }, [itemUid]);

    useEffect(() => {
        if (!itemUid) {
            setIsLoading(false);
            return;
        }
        fetchComments();
    }, [itemUid, fetchComments]);

    const sortedComments = React.useMemo(() => {
        const topLevel = comments.filter(c => !c.parent_id);
        topLevel.sort((a, b) => {
            const dateA = getTimestampMillis(a.created_at);
            const dateB = getTimestampMillis(b.created_at);
            return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
        });
        const replyMap = new Map<string, Comment[]>();
        for (const c of comments) {
            if (c.parent_id) {
                const replies = replyMap.get(c.parent_id) || [];
                replies.push(c);
                replyMap.set(c.parent_id, replies);
            }
        }
        for (const [, replies] of replyMap) {
            replies.sort((a, b) => getTimestampMillis(a.created_at) - getTimestampMillis(b.created_at));
        }
        return { topLevel, replyMap };
    }, [comments, sortOrder]);

    const autoResize = useCallback(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = Math.min(el.scrollHeight, 160) + 'px';
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || newComment.length > MAX_COMMENT_LENGTH || isSubmitting) return;

        if (!userProfile) {
            onAuthRequired(t('comment'));
            return;
        }

        const trimmedText = newComment.trim();
        setIsSubmitting(true);

        const optimisticComment: Comment = {
            id: `temp-${Date.now()}`,
            comment: trimmedText,
            created_at: new Date().toISOString(),
            created_by: userProfile.display_name || userProfile.email.split('@')[0],
            uid: itemUid,
            user_photo_url: userProfile.photo_url || undefined,
            likes: 0,
            liked_by: [],
            parent_id: replyTo?.id ?? null,
            edited: false,
        };

        setComments(prev => [optimisticComment, ...prev]);
        setNewComment('');
        setReplyTo(null);
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }

        try {
            const addedComment = await commentService.addComment(
                itemUid,
                trimmedText,
                userProfile,
                replyTo?.id
            );
            if (addedComment) {
                setComments(prev => prev.map(c => (c.id === optimisticComment.id ? addedComment : c)));
            } else {
                setComments(prev => prev.filter(c => c.id !== optimisticComment.id));
                toast.error(t('errorOccurred'), { position: 'bottom-center', autoClose: 2000 });
            }
        } catch {
            setComments(prev => prev.filter(c => c.id !== optimisticComment.id));
            toast.error(t('errorOccurred'), { position: 'bottom-center', autoClose: 2000 });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLike = async (comment: Comment) => {
        if (!userProfile) {
            onAuthRequired(t('comment'));
            return;
        }
        const userId = userProfile.uid;
        const isLiked = (comment.liked_by || []).includes(userId);

        setComments(prev => prev.map(c => {
            if (c.id !== comment.id) return c;
            return {
                ...c,
                liked_by: isLiked ? c.liked_by.filter(id => id !== userId) : [...c.liked_by, userId],
                likes: isLiked ? Math.max(0, c.likes - 1) : c.likes + 1,
            };
        }));

        try {
            if (isLiked) {
                await commentService.unlikeComment(comment.id, userId);
            } else {
                await commentService.likeComment(comment.id, userId);
            }
        } catch {
            setComments(prev => prev.map(c => {
                if (c.id !== comment.id) return c;
                return {
                    ...c,
                    liked_by: isLiked ? [...c.liked_by, userId] : c.liked_by.filter(id => id !== userId),
                    likes: isLiked ? c.likes + 1 : Math.max(0, c.likes - 1),
                };
            }));
            toast.error(t('errorOccurred'), { position: 'bottom-center', autoClose: 2000 });
        }
    };

    const handleDelete = async (commentId: string) => {
        setDeletingId(commentId);
        const deletedComments = comments.filter(c => c.id === commentId || c.parent_id === commentId);
        setComments(prev => prev.filter(c => c.id !== commentId && c.parent_id !== commentId));
        setConfirmDeleteId(null);

        try {
            const ok = await commentService.deleteComment(commentId);
            if (!ok) {
                setComments(prev => [...deletedComments, ...prev]);
                toast.error(t('errorOccurred'), { position: 'bottom-center', autoClose: 2000 });
            } else {
                toast.success(t('commentDeleted'), { position: 'bottom-center', autoClose: 2000 });
            }
        } catch {
            setComments(prev => [...deletedComments, ...prev]);
            toast.error(t('errorOccurred'), { position: 'bottom-center', autoClose: 2000 });
        } finally {
            setDeletingId(null);
        }
    };

    const handleEdit = async (commentId: string) => {
        if (!editText.trim() || editText.length > MAX_COMMENT_LENGTH) return;
        const originalComment = comments.find(c => c.id === commentId);
        if (!originalComment) return;

        const newText = editText.trim();
        setComments(prev => prev.map(c => (c.id === commentId ? { ...c, comment: newText, edited: true } : c)));
        setEditingId(null);
        setEditText('');

        try {
            const ok = await commentService.updateComment(commentId, newText);
            if (!ok) {
                setComments(prev => prev.map(c => (c.id === commentId ? originalComment : c)));
                toast.error(t('errorOccurred'), { position: 'bottom-center', autoClose: 2000 });
            }
        } catch {
            setComments(prev => prev.map(c => (c.id === commentId ? originalComment : c)));
            toast.error(t('errorOccurred'), { position: 'bottom-center', autoClose: 2000 });
        }
    };

    const startReply = (comment: Comment) => {
        setReplyTo({ id: comment.id, username: comment.created_by });
        setNewComment('');
        setTimeout(() => textareaRef.current?.focus(), 50);
    };

    const startEdit = (comment: Comment) => {
        setEditingId(comment.id);
        setEditText(comment.comment);
        setTimeout(() => {
            const el = textareaRef.current;
            if (el) {
                el.focus();
                el.setSelectionRange(el.value.length, el.value.length);
            }
        }, 50);
    };

    const cancelReply = () => {
        setReplyTo(null);
        setNewComment('');
    };

    const handleCancel = () => {
        setNewComment('');
        setReplyTo(null);
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
    };

    const charCountColor = newComment.length > MAX_COMMENT_LENGTH
        ? 'text-red-500'
        : newComment.length > MAX_COMMENT_LENGTH - 20
            ? 'text-yellow-500'
            : 'text-gray-400';

    const isSubmitDisabled = !newComment.trim() || newComment.length > MAX_COMMENT_LENGTH || isSubmitting;

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-800">
                                <h3 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white">
                    {t('comments')} {' '}
                    <span className="text-amber-500 text-base font-bold ml-1">
                        ({comments.filter(c => !c.parent_id).length})
                    </span>
                </h3>
                <div className="relative">
                    <select
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                        className="appearance-none bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg py-1 pl-2.5 pr-7 text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                    >
                        <option value="newest">{t('sortByNewest')}</option>
                        <option value="oldest">{t('sortByOldest')}</option>
                    </select>
                    <ChevronDownIcon className="w-3.5 h-3.5 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
                </div>
            </div>

            <form onSubmit={handleSubmit} className="flex items-start gap-2 sm:gap-3">
                <img
                    src={userProfile?.photo_url || generateDefaultAvatar(userProfile?.display_name)}
                    alt=""
                    className="w-8 sm:w-9 h-8 sm:h-9 rounded-full flex-shrink-0 ring-2 ring-amber-500/20 mt-[2px]"
                />
                <div className="flex-1 min-w-0">
                    {replyTo && (
                        <div className="flex items-center justify-between mb-1">
                            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                                {t('replyingTo')} <span className="font-bold">@{replyTo.username}</span>
                            </p>
                            <button
                                type="button"
                                onClick={cancelReply}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                                aria-label={t('cancelReply')}
                            >
                                <XMarkIcon className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                    <div className="border-b-2 border-gray-300 dark:border-gray-600 focus-within:border-amber-500 transition-colors duration-200 pb-0.5">
                        <textarea
                            ref={textareaRef}
                            value={newComment}
                            onChange={(e) => { setNewComment(e.target.value); autoResize(); }}
                            onFocus={() => setInputFocused(true)}
                            onBlur={() => setInputFocused(false)}
                            placeholder={replyTo ? t('replyPlaceholder') : t('addAComment')}
                            className="w-full bg-transparent border-none outline-none resize-none p-0 text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 text-gray-900 dark:text-white leading-relaxed"
                            rows={1}
                            maxLength={MAX_COMMENT_LENGTH + 1}
                            aria-describedby="char-count"
                        />
                    </div>
                    {(inputFocused || newComment.length > 0) && (
                        <div className="flex items-center justify-end gap-2 mt-2">
                            <span
                                id="char-count"
                                aria-live="polite"
                                aria-label={`${newComment.length} ${t('characters')}`}
                                className={`text-xs font-medium mr-auto ${charCountColor}`}
                            >
                                {newComment.length}/{MAX_COMMENT_LENGTH}
                            </span>
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="px-3 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                            >
                                {locale === 'fr-FR' ? 'Annuler' : 'Cancel'}
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitDisabled}
                                className="px-3 py-1 text-xs font-semibold text-white bg-amber-500 rounded-full hover:bg-amber-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                            >
                                {isSubmitting ? (
                                    <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                ) : (
                                    locale === 'fr-FR' ? 'Commenter' : 'Comment'
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </form>

            {isLoading && (
                <div className="space-y-4" role="status" aria-label={t('loading')}>
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-start gap-2 sm:gap-3 animate-pulse">
                            <div className="w-8 sm:w-9 h-8 sm:h-9 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0 mt-[10px]" />
                            <div className="flex-1 space-y-2">
                                <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
                                <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded-lg" />
                                <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {fetchError && !isLoading && (
                <div className="text-center py-8" role="alert">
                    <p className="text-red-500 dark:text-red-400 text-sm font-semibold">{t('errorOccurred')}</p>
                    <button
                        onClick={() => fetchComments()}
                        className="mt-3 px-4 py-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors"
                    >
                        {t('retry')}
                    </button>
                </div>
            )}

            {!isLoading && !fetchError && (
                <div role="list" className="space-y-0">
                    {sortedComments.topLevel.length > 0 ? (
                        sortedComments.topLevel.map((comment) => (
                            <React.Fragment key={comment.id}>
                                <CommentRow
                                    comment={comment}
                                    locale={locale}
                                    userProfile={userProfile}
                                    editingId={editingId}
                                    editText={editText}
                                    confirmDeleteId={confirmDeleteId}
                                    deletingId={deletingId}
                                    isLiked={userProfile ? (comment.liked_by || []).includes(userProfile.uid) : false}
                                    onEditChange={setEditText}
                                    onLike={() => handleLike(comment)}
                                    onReply={() => startReply(comment)}
                                    onEdit={() => startEdit(comment)}
                                    onEditSave={() => handleEdit(comment.id)}
                                    onEditCancel={() => { setEditingId(null); setEditText(''); }}
                                    onDelete={() => setConfirmDeleteId(comment.id)}
                                    onConfirmDelete={() => handleDelete(comment.id)}
                                    onCancelDelete={() => setConfirmDeleteId(null)}
                                />
                                {sortedComments.replyMap.get(comment.id)?.map((reply) => (
                                    <ReplyRow
                                        key={reply.id}
                                        comment={reply}
                                        locale={locale}
                                        userProfile={userProfile}
                                        editingId={editingId}
                                        editText={editText}
                                        confirmDeleteId={confirmDeleteId}
                                        deletingId={deletingId}
                                        isLiked={userProfile ? (reply.liked_by || []).includes(userProfile.uid) : false}
                                        onEditChange={setEditText}
                                        onLike={() => handleLike(reply)}
                                        onEdit={() => startEdit(reply)}
                                        onEditSave={() => handleEdit(reply.id)}
                                        onEditCancel={() => { setEditingId(null); setEditText(''); }}
                                        onDelete={() => setConfirmDeleteId(reply.id)}
                                        onConfirmDelete={() => handleDelete(reply.id)}
                                        onCancelDelete={() => setConfirmDeleteId(null)}
                                    />
                                ))}
                            </React.Fragment>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center py-10 text-gray-400 dark:text-gray-500">
                            <CommentIcon className="w-10 h-10 mb-3 opacity-50" />
                            <p className="text-base font-semibold">{t('noCommentsYet')}</p>
                            <p className="text-sm mt-1">{t('beFirstToComment')}</p>
                        </div>
                    )}

                    {hasMore && !isLoading && (
                        <div className="pt-3 text-center">
                            <button
                                onClick={() => { setLoadingMore(true); fetchComments(true); }}
                                disabled={loadingMore}
                                className="px-5 py-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors disabled:opacity-50"
                            >
                                {loadingMore ? (
                                    <span className="flex items-center space-x-1.5">
                                        <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        <span>{t('loading')}</span>
                                    </span>
                                ) : (
                                    t('showMoreComments')
                                )}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

interface CommentRowProps {
    comment: Comment;
    locale: string;
    userProfile: any;
    editingId: string | null;
    editText: string;
    confirmDeleteId: string | null;
    deletingId: string | null;
    isLiked: boolean;
    onEditChange: (val: string) => void;
    onLike: () => void;
    onReply?: () => void;
    onEdit: () => void;
    onEditSave: () => void;
    onEditCancel: () => void;
    onDelete: () => void;
    onConfirmDelete: () => void;
    onCancelDelete: () => void;
}

const CommentRow: React.FC<CommentRowProps> = React.memo(({
    comment,
    locale,
    userProfile,
    editingId,
    editText,
    confirmDeleteId,
    deletingId,
    isLiked,
    onEditChange,
    onLike,
    onReply,
    onEdit,
    onEditSave,
    onEditCancel,
    onDelete,
    onConfirmDelete,
    onCancelDelete,
}) => {
    const isEditing = editingId === comment.id;
    const isConfirmingDelete = confirmDeleteId === comment.id;
    const isDeleting = deletingId === comment.id;
    const isOwn = userProfile && (comment.created_by === userProfile.display_name || comment.created_by === userProfile.email?.split('@')[0]);

    return (
        <div role="listitem" className="flex items-start gap-2 sm:gap-3 py-3 group hover:bg-gray-50/50 dark:hover:bg-gray-800/30 rounded-lg px-2 -mx-2 transition-colors duration-150">
            <img
                src={comment.user_photo_url || generateDefaultAvatar(comment.created_by)}
                alt={comment.created_by}
                className="w-9 h-9 rounded-full flex-shrink-0 ring-2 ring-transparent group-hover:ring-amber-500/30 transition-all duration-200 mt-0.5"
            />
            <div className="flex-1 min-w-0">
                <div className="flex items-baseline space-x-2">
                    <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                        {comment.created_by}
                    </p>
                    <p
                        className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0 cursor-default"
                        title={formatFullDate(comment.created_at, locale)}
                    >
                        {formatRelativeTime(comment.created_at, locale)}
                    </p>
                    {comment.edited && (
                        <span className="text-[10px] text-gray-400 dark:text-gray-600 italic">
                            ({locale === 'fr-FR' ? 'modifié' : 'edited'})
                        </span>
                    )}
                </div>

                {isEditing ? (
                    <div className="mt-1.5 space-y-1.5">
                        <textarea
                            value={editText}
                            onChange={(e) => onEditChange(e.target.value)}
                            className="w-full bg-white dark:bg-gray-900 border-2 border-amber-500 rounded-lg p-2 text-sm focus:ring-2 focus:ring-amber-500 resize-none transition-all duration-200"
                            rows={2}
                            maxLength={MAX_COMMENT_LENGTH + 1}
                            autoFocus
                        />
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={onEditSave}
                                disabled={!editText.trim() || editText.length > MAX_COMMENT_LENGTH}
                                className="p-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                                aria-label="Save"
                            >
                                <CheckIcon className="w-4 h-4" />
                            </button>
                            <button
                                onClick={onEditCancel}
                                className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                                aria-label="Cancel"
                            >
                                <XMarkIcon className="w-4 h-4" />
                            </button>
                            <span className={`text-xs font-medium ${
                                editText.length > MAX_COMMENT_LENGTH ? 'text-red-500' : 'text-gray-400'
                            }`}>
                                {editText.length}/{MAX_COMMENT_LENGTH}
                            </span>
                        </div>
                    </div>
                ) : (
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed break-words mt-0.5 text-sm">
                        {comment.comment}
                    </p>
                )}

                {!isEditing && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                        <button
                            onClick={onLike}
                            className={`flex items-center gap-1 text-xs font-medium transition-all duration-200 group/btn ${
                                isLiked
                                    ? 'text-amber-500'
                                    : 'text-gray-400 hover:text-amber-500'
                            }`}
                            aria-label={isLiked ? 'Unlike' : 'Like'}
                        >
                        <LikeIcon className={`w-3.5 h-3.5 transition-all duration-200 ${
                            isLiked ? 'fill-current scale-110' : ''
                        } group-hover/btn:scale-110`} />
                            <span>{comment.likes > 0 ? formatNumber(comment.likes) : ''}</span>
                        </button>
                        {onReply && (
                            <button
                                onClick={onReply}
                                className="text-xs font-medium text-gray-400 hover:text-amber-500 transition-colors"
                            >
                                {locale === 'fr-FR' ? 'Répondre' : 'Reply'}
                            </button>
                        )}
                        {isOwn && (
                            <>
                                <button
                                    onClick={onEdit}
                                    className="text-xs font-medium text-gray-400 hover:text-amber-500 transition-colors"
                                    aria-label="Edit"
                                >
                                    {locale === 'fr-FR' ? 'Modifier' : 'Edit'}
                                </button>
                                {isConfirmingDelete ? (
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <button
                                            onClick={onConfirmDelete}
                                            disabled={isDeleting}
                                            className="px-2 py-0.5 text-[10px] font-semibold text-white bg-red-500 rounded hover:bg-red-600 disabled:opacity-50 transition-colors"
                                        >
                                            {isDeleting ? '...' : locale === 'fr-FR' ? 'Confirmer' : 'Delete'}
                                        </button>
                                        <button
                                            onClick={onCancelDelete}
                                            className="px-2 py-0.5 text-[10px] font-semibold text-gray-500 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                        >
                                            {locale === 'fr-FR' ? 'Annuler' : 'Cancel'}
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={onDelete}
                                        className="text-xs font-medium text-gray-400 hover:text-red-500 transition-colors"
                                        aria-label="Delete"
                                    >
                                        <TrashIcon className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
});

const ReplyRow: React.FC<CommentRowProps> = React.memo(({
    comment,
    locale,
    userProfile,
    editingId,
    editText,
    confirmDeleteId,
    deletingId,
    isLiked,
    onEditChange,
    onLike,
    onEdit,
    onEditSave,
    onEditCancel,
    onDelete,
    onConfirmDelete,
    onCancelDelete,
    onReply,
}) => {
    const isEditing = editingId === comment.id;
    const isConfirmingDelete = confirmDeleteId === comment.id;
    const isDeleting = deletingId === comment.id;
    const isOwn = userProfile && (comment.created_by === userProfile.display_name || comment.created_by === userProfile.email?.split('@')[0]);

    return (
        <div role="listitem" className="flex items-start gap-2 sm:gap-3 py-2.5 pl-6 sm:pl-9 ml-2 sm:ml-3 border-l-2 border-gray-200 dark:border-gray-700 group hover:bg-gray-50/50 dark:hover:bg-gray-800/30 rounded-r-lg transition-colors duration-150">
            <img
                src={comment.user_photo_url || generateDefaultAvatar(comment.created_by)}
                alt={comment.created_by}
                className="w-7 h-7 rounded-full flex-shrink-0 ring-2 ring-transparent group-hover:ring-amber-500/30 transition-all duration-200 mt-0.5"
            />
            <div className="flex-1 min-w-0">
                <div className="flex items-baseline space-x-2">
                    <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                        {comment.created_by}
                    </p>
                    <p
                        className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0 cursor-default"
                        title={formatFullDate(comment.created_at, locale)}
                    >
                        {formatRelativeTime(comment.created_at, locale)}
                    </p>
                    {comment.edited && (
                        <span className="text-[10px] text-gray-400 dark:text-gray-600 italic">
                            ({locale === 'fr-FR' ? 'modifié' : 'edited'})
                        </span>
                    )}
                </div>

                {isEditing ? (
                    <div className="mt-1.5 space-y-1.5">
                        <textarea
                            value={editText}
                            onChange={(e) => onEditChange(e.target.value)}
                            className="w-full bg-white dark:bg-gray-900 border-2 border-amber-500 rounded-lg p-2 text-sm focus:ring-2 focus:ring-amber-500 resize-none transition-all duration-200"
                            rows={2}
                            maxLength={MAX_COMMENT_LENGTH + 1}
                            autoFocus
                        />
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={onEditSave}
                                disabled={!editText.trim() || editText.length > MAX_COMMENT_LENGTH}
                                className="p-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                                aria-label="Save"
                            >
                                <CheckIcon className="w-4 h-4" />
                            </button>
                            <button
                                onClick={onEditCancel}
                                className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                                aria-label="Cancel"
                            >
                                <XMarkIcon className="w-4 h-4" />
                            </button>
                            <span className={`text-xs font-medium ${
                                editText.length > MAX_COMMENT_LENGTH ? 'text-red-500' : 'text-gray-400'
                            }`}>
                                {editText.length}/{MAX_COMMENT_LENGTH}
                            </span>
                        </div>
                    </div>
                ) : (
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed break-words mt-0.5 text-sm">
                        {comment.comment}
                    </p>
                )}

                {!isEditing && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                        <button
                            onClick={onLike}
                            className={`flex items-center gap-1 text-xs font-medium transition-all duration-200 group/btn ${
                                isLiked
                                    ? 'text-amber-500'
                                    : 'text-gray-400 hover:text-amber-500'
                            }`}
                            aria-label={isLiked ? 'Unlike' : 'Like'}
                        >
                            <LikeIcon className={`w-3.5 h-3.5 transition-all duration-200 ${
                                isLiked ? 'fill-current scale-110' : ''
                            } group-hover/btn:scale-110`} />
                            <span>{comment.likes > 0 ? formatNumber(comment.likes) : ''}</span>
                        </button>
                        {onReply && (
                            <button
                                onClick={onReply}
                                className="text-xs font-medium text-gray-400 hover:text-amber-500 transition-colors"
                            >
                                {locale === 'fr-FR' ? 'Répondre' : 'Reply'}
                            </button>
                        )}
                        {isOwn && (
                            <>
                                <button
                                    onClick={onEdit}
                                    className="text-xs font-medium text-gray-400 hover:text-amber-500 transition-colors"
                                    aria-label="Edit"
                                >
                                    {locale === 'fr-FR' ? 'Modifier' : 'Edit'}
                                </button>
                                {isConfirmingDelete ? (
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <button
                                            onClick={onConfirmDelete}
                                            disabled={isDeleting}
                                            className="px-2 py-0.5 text-[10px] font-semibold text-white bg-red-500 rounded hover:bg-red-600 disabled:opacity-50 transition-colors"
                                        >
                                            {isDeleting ? '...' : locale === 'fr-FR' ? 'Confirmer' : 'Delete'}
                                        </button>
                                        <button
                                            onClick={onCancelDelete}
                                            className="px-2 py-0.5 text-[10px] font-semibold text-gray-500 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                        >
                                            {locale === 'fr-FR' ? 'Annuler' : 'Cancel'}
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={onDelete}
                                        className="text-xs font-medium text-gray-400 hover:text-red-500 transition-colors"
                                        aria-label="Delete"
                                    >
                                        <TrashIcon className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
});

export { formatNumber, formatRelativeTime, getTimestampMillis, CommentSection };
