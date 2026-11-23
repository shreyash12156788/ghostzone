import React from 'react';
import { Crown, Eye, Shield, Skull, AlertTriangle } from 'lucide-react';
import { Player } from '../types';
import { cn } from '../lib/utils';

interface AvatarBadgeProps {
  player: Player;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showRole?: boolean;
  showStatus?: boolean;
  className?: string;
}

export const AvatarBadge: React.FC<AvatarBadgeProps> = ({
  player,
  size = 'md',
  showRole = true,
  showStatus = true,
  className,
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-11 h-11 text-sm',
    lg: 'w-14 h-14 text-base font-semibold',
    xl: 'w-20 h-20 text-2xl font-bold',
  };

  const initial = (player.name || 'P').charAt(0).toUpperCase();

  // Status colors & borders
  let ringColor = 'ring-border';
  if (player.status === 'OUT_OF_ZONE') ringColor = 'ring-warning animate-pulse';
  else if (player.status === 'CAUGHT') ringColor = 'ring-destructive opacity-75';
  else if (player.status === 'DISQUALIFIED') ringColor = 'ring-destructive opacity-60 grayscale';
  else if (player.isReady || player.status === 'HIDING') ringColor = 'ring-primary';

  return (
    <div className={cn('relative inline-flex flex-col items-center', className)}>
      <div
        className={cn(
          'relative rounded-full flex items-center justify-center font-display transition-all shadow-md ring-2',
          sizeClasses[size],
          ringColor
        )}
        style={{
          backgroundColor: player.avatar || '#10b981',
          color: '#ffffff',
          textShadow: '0 1px 2px rgba(0,0,0,0.5)',
        }}
      >
        {initial}

        {/* Host Crown badge */}
        {player.isHost && (
          <span
            className="absolute -top-1.5 -right-1 bg-amber-500 text-black rounded-full p-0.5 shadow-sm"
            title="Host"
          >
            <Crown className="w-3 h-3" fill="currentColor" />
          </span>
        )}

        {/* Role icon badge */}
        {showRole && player.role !== 'UNDECIDED' && (
          <span
            className={cn(
              'absolute -bottom-1 -right-1 rounded-full p-0.5 text-white shadow-sm',
              player.role === 'SEEKER' ? 'bg-destructive' : 'bg-primary'
            )}
          >
            {player.role === 'SEEKER' ? (
              <Eye className="w-3 h-3" />
            ) : (
              <Shield className="w-3 h-3" />
            )}
          </span>
        )}

        {/* Out of zone indicator */}
        {player.status === 'OUT_OF_ZONE' && (
          <span className="absolute -top-1 -left-1 bg-warning text-black rounded-full p-0.5 animate-bounce">
            <AlertTriangle className="w-3 h-3" />
          </span>
        )}

        {/* Caught / Disqualified indicator */}
        {(player.status === 'CAUGHT' || player.status === 'DISQUALIFIED') && (
          <span className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
            <Skull className="w-4 h-4 text-white/90" />
          </span>
        )}
      </div>

      {showStatus && (
        <span className="text-[10px] font-medium text-muted-foreground mt-0.5 truncate max-w-[70px]">
          {player.name}
        </span>
      )}
    </div>
  );
};
