import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Eye, Radio, AlertTriangle, Trophy } from 'lucide-react';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const rules = [
    {
      icon: Eye,
      title: '1. Seeker vs Hiders',
      desc: 'One player is randomly chosen (or assigned by host) as the Seeker. Everyone else is a Hider running for stealth cover.',
      color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
    },
    {
      icon: Shield,
      title: '2. Hiding Countdown',
      desc: 'Hiders get a head start (default 1-2 min) to scatter and find concealment. The Seeker screen stays blindfolded until released.',
      color: 'text-primary bg-primary/10 border-primary/30',
    },
    {
      icon: Radio,
      title: '3. Periodic Radar Reveals',
      desc: 'Every 3-5 minutes, a tactical radar scan activates for 15 seconds! All hiders are exposed on the live map before disappearing back into stealth.',
      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    },
    {
      icon: AlertTriangle,
      title: '4. Boundary Geofence',
      desc: 'Stay inside the map zone! If you step outside, an emergency siren triggers with a 20s grace period and compass arrow. Fail to return = Disqualification.',
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    },
    {
      icon: Trophy,
      title: '5. How to Win',
      desc: 'Hiders win if at least one operative survives when the game clock runs out. Seeker wins if all hiders are caught or disqualified.',
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-md max-h-[85vh] bg-card border border-border rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden pb-safe"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="text-base font-display font-bold text-foreground flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-primary animate-ping" />
              How to Play HideNSeek Live
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Rule Cards List */}
          <div className="p-4 space-y-3 overflow-y-auto">
            {rules.map((rule, idx) => {
              const Icon = rule.icon;
              return (
                <div
                  key={idx}
                  className={`p-3 rounded-2xl border ${rule.color} flex gap-3 items-start`}
                >
                  <div className="p-2 rounded-xl bg-black/20 shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-display font-bold text-foreground">
                      {rule.title}
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                      {rule.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-display font-bold rounded-2xl transition-colors shadow-md"
            >
              Got It, Let's Play!
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
