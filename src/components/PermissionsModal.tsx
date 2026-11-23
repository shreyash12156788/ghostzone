import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, ShieldCheck, Smartphone, X } from 'lucide-react';

interface PermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestGps: () => void;
  gpsStatus: string;
}

export const PermissionsModal: React.FC<PermissionsModalProps> = ({
  isOpen,
  onClose,
  onRequestGps,
  gpsStatus,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm">
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          className="w-full max-w-md bg-card border border-border rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 pb-safe"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/30 text-primary">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-display font-bold text-base text-foreground">
                  Location & Sensor Access
                </h3>
                <p className="text-xs text-muted-foreground">
                  Required for real-world gameplay
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-full text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-3 my-4 text-xs text-muted-foreground">
            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-secondary/50 border border-border/60">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-foreground">High-Precision Geofencing:</span>{' '}
                Used solely to detect whether you are inside the designated campus safe zone and track radar reveal coordinates.
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-secondary/50 border border-border/60">
              <Smartphone className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-foreground">Keep Screen Awake:</span>{' '}
                Uses the Screen Wake Lock API to prevent your phone from sleeping while you are running and hiding.
              </div>
            </div>
          </div>

          <div className="space-y-2 mt-5">
            <button
              type="button"
              onClick={() => {
                onRequestGps();
                onClose();
              }}
              className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-display font-bold text-sm shadow-md hover:bg-primary/90 transition-colors"
            >
              {gpsStatus === 'granted' ? 'GPS Already Connected' : 'Allow High-Accuracy Location'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 text-xs text-muted-foreground hover:text-foreground text-center"
            >
              I will use Simulation Mode on desktop
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
