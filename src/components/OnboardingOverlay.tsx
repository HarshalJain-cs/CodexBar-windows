import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, Zap, BarChart3, Settings, Keyboard } from 'lucide-react';

interface OnboardingStep {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const steps: OnboardingStep[] = [
  {
    title: 'Welcome to CodexBar',
    description: 'Track AI provider usage across Codex, Claude, Cursor, Gemini, Copilot, and more — all in one place.',
    icon: <Zap size={24} className="text-primary" />,
  },
  {
    title: 'Monitor Usage',
    description: 'Session and weekly usage bars show real-time consumption. Cards turn yellow at warning and red at critical levels.',
    icon: <BarChart3 size={24} className="text-cb-warning" />,
  },
  {
    title: 'Customize Everything',
    description: 'Open Settings to configure thresholds, enable/disable providers, change themes, and set up notifications.',
    icon: <Settings size={24} className="text-muted-foreground" />,
  },
  {
    title: 'Keyboard Shortcuts',
    description: 'Use Ctrl+R to refresh, Ctrl+, for settings, Ctrl+E to export, and number keys 1-9 to select providers.',
    icon: <Keyboard size={24} className="text-primary" />,
  },
];

const ONBOARDING_KEY = 'codexbar-onboarding-complete';

export default function OnboardingOverlay() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const done = localStorage.getItem(ONBOARDING_KEY);
    if (!done) setVisible(true);
  }, []);

  const close = useCallback(() => {
    setVisible(false);
    localStorage.setItem(ONBOARDING_KEY, 'true');
  }, []);

  const next = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      close();
    }
  };

  if (!visible) return null;

  const current = steps[step];

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="relative w-[340px] rounded-xl border border-border bg-card p-6 shadow-2xl"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          <button
            onClick={close}
            className="absolute top-3 right-3 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            aria-label="Close onboarding"
          >
            <X size={14} />
          </button>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex justify-center mb-4">{current.icon}</div>
              <h2 className="text-sm font-bold text-card-foreground text-center mb-2">
                {current.title}
              </h2>
              <p className="text-[11px] text-muted-foreground text-center leading-relaxed mb-6">
                {current.description}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Progress dots */}
          <div className="flex justify-center gap-1.5 mb-4">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step ? 'w-4 bg-primary' : 'w-1.5 bg-muted'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={close}
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip
            </button>
            <button
              onClick={next}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
            >
              {step < steps.length - 1 ? 'Next' : 'Get Started'}
              <ChevronRight size={12} />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
