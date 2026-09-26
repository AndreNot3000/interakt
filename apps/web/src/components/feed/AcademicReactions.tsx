'use client';

import { useState, useRef, useEffect } from 'react';
import { api } from '@/lib/api';

export type AcademicReactionType = 'INSIGHTFUL' | 'LOVE' | 'CELEBRATE' | 'LIKE';

interface ReactionMeta {
  type: AcademicReactionType;
  label: string;
  emoji: string;
  activeColor: string;
  bgColor: string;
}

export const REACTION_CONFIG: Record<AcademicReactionType, ReactionMeta> = {
  INSIGHTFUL: {
    type: 'INSIGHTFUL',
    label: 'Insightful',
    emoji: '💡',
    activeColor: 'text-amber-600 font-bold',
    bgColor: 'bg-amber-50 border-amber-200 text-amber-700',
  },
  LOVE: {
    type: 'LOVE',
    label: 'Helpful',
    emoji: '🤝',
    activeColor: 'text-emerald-600 font-bold',
    bgColor: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  },
  CELEBRATE: {
    type: 'CELEBRATE',
    label: 'Celebrate',
    emoji: '🎉',
    activeColor: 'text-purple-600 font-bold',
    bgColor: 'bg-purple-50 border-purple-200 text-purple-700',
  },
  LIKE: {
    type: 'LIKE',
    label: 'Upvote',
    emoji: '⬆️',
    activeColor: 'text-blue-600 font-bold',
    bgColor: 'bg-blue-50 border-blue-200 text-blue-700',
  },
};

interface AcademicReactionsProps {
  targetId: string;
  targetType: 'post' | 'comment';
  initialCount?: number;
  initialUserReaction?: AcademicReactionType | null;
  size?: 'sm' | 'md';
  onReactionChange?: (newReaction: AcademicReactionType | null, newCount: number) => void;
}

export function AcademicReactions({
  targetId,
  targetType,
  initialCount = 0,
  initialUserReaction = null,
  size = 'md',
  onReactionChange,
}: AcademicReactionsProps) {
  const [currentReaction, setCurrentReaction] = useState<AcademicReactionType | null>(
    initialUserReaction,
  );
  const [count, setCount] = useState<number>(initialCount);
  const [showPicker, setShowPicker] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync state if props change externally
  useEffect(() => {
    setCurrentReaction(initialUserReaction);
    setCount(initialCount);
  }, [initialUserReaction, initialCount]);

  const handleMouseEnter = () => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    setShowPicker(true);
  };

  const handleMouseLeave = () => {
    hideTimeoutRef.current = setTimeout(() => {
      setShowPicker(false);
    }, 300);
  };

  const triggerReaction = async (selectedType: AcademicReactionType) => {
    if (isLoading) return;
    setIsLoading(true);
    setShowPicker(false);

    const prevReaction = currentReaction;
    const prevCount = count;

    // Optimistic Calculation
    let nextReaction: AcademicReactionType | null = selectedType;
    let nextCount = prevCount;

    if (prevReaction === selectedType) {
      // Toggle off
      nextReaction = null;
      nextCount = Math.max(0, prevCount - 1);
    } else if (prevReaction === null) {
      // First reaction
      nextReaction = selectedType;
      nextCount = prevCount + 1;
    } else {
      // Switched reaction type; count remains the same
      nextReaction = selectedType;
    }

    setCurrentReaction(nextReaction);
    setCount(nextCount);
    onReactionChange?.(nextReaction, nextCount);

    try {
      const endpoint =
        targetType === 'post'
          ? `/reactions/posts/${targetId}`
          : `/reactions/comments/${targetId}`;

      const res = await api.post(endpoint, { type: selectedType });
      if (res.data?.success && res.data?.data) {
        const serverReaction = res.data.data.reacted ? res.data.data.type : null;
        setCurrentReaction(serverReaction);
      }
    } catch (err) {
      console.error(`Failed to react to ${targetType}:`, err);
      // Revert optimistic changes
      setCurrentReaction(prevReaction);
      setCount(prevCount);
      onReactionChange?.(prevReaction, prevCount);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMainButtonClick = () => {
    if (currentReaction) {
      // Quick toggle off
      triggerReaction(currentReaction);
    } else {
      // Default to Upvote
      triggerReaction('LIKE');
    }
  };

  const activeConfig = currentReaction ? REACTION_CONFIG[currentReaction] : null;

  return (
    <div
      ref={containerRef}
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Floating Reaction Picker Dock */}
      {showPicker && (
        <div className="absolute bottom-full left-0 mb-2 z-30 flex items-center gap-1.5 p-1.5 bg-white/95 backdrop-blur-md rounded-full shadow-lg border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
          {(Object.keys(REACTION_CONFIG) as AcademicReactionType[]).map((type) => {
            const config = REACTION_CONFIG[type];
            const isSelected = currentReaction === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => triggerReaction(type)}
                className={`group relative flex items-center justify-center p-1.5 sm:p-2 rounded-full transition-all duration-150 hover:scale-125 ${
                  isSelected ? 'bg-slate-100 ring-2 ring-blue-500 shadow-xs' : 'hover:bg-slate-100'
                }`}
                title={config.label}
              >
                <span className="text-base sm:text-lg select-none leading-none">{config.emoji}</span>
                {/* Tooltip */}
                <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-[10px] font-bold text-white bg-slate-900 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {config.label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Primary Reaction Trigger Button */}
      <button
        type="button"
        onClick={handleMainButtonClick}
        disabled={isLoading}
        className={`flex items-center gap-1.5 rounded-lg transition-all ${
          size === 'sm' ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1.5 text-xs'
        } ${
          activeConfig
            ? `${activeConfig.bgColor} font-bold border`
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`}
      >
        <span className="leading-none text-sm">{activeConfig ? activeConfig.emoji : '⬆️'}</span>
        <span className="font-semibold">{activeConfig ? activeConfig.label : 'Upvote'}</span>
        {count > 0 && (
          <span
            className={`ml-0.5 font-bold ${
              activeConfig ? 'text-inherit' : 'text-slate-500'
            }`}
          >
            {count}
          </span>
        )}
      </button>
    </div>
  );
}
