'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Achievement {
  type: string;
  title: string;
  description: string;
  icon: string;
}

interface CelebrationModalProps {
  achievements: Achievement[];
  onClose: () => void;
}

const ICON_MAP: Record<string, string> = {
  rocket: '\u{1F680}',
  fire: '\u{1F525}',
  star: '\u{2B50}',
  trophy: '\u{1F3C6}',
  book: '\u{1F4DA}',
  academic: '\u{1F393}',
  crown: '\u{1F451}',
  cards: '\u{1F0CF}',
  sparkles: '\u{2728}',
};

export default function CelebrationModal({ achievements, onClose }: CelebrationModalProps) {
  const [confettiPieces, setConfettiPieces] = useState<Array<{ id: number; x: number; color: string; delay: number }>>([]);

  useEffect(() => {
    if (achievements.length === 0) return;

    const colors = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899'];
    const pieces = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 0.5,
    }));
    setConfettiPieces(pieces);

    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [achievements, onClose]);

  if (achievements.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      >
        {/* Confetti */}
        {confettiPieces.map((piece) => (
          <motion.div
            key={piece.id}
            initial={{ y: -20, x: `${piece.x}vw`, opacity: 1 }}
            animate={{ y: '110vh', opacity: 0 }}
            transition={{ duration: 2 + Math.random(), delay: piece.delay, ease: 'linear' }}
            className="fixed top-0 w-2 h-2 rounded-full"
            style={{ backgroundColor: piece.color, left: `${piece.x}%` }}
          />
        ))}

        {/* Modal */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 max-w-sm w-full text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
            className="text-5xl mb-4"
          >
            {ICON_MAP[achievements[0].icon] || '\u{1F3C6}'}
          </motion.div>

          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            Achievement Unlocked!
          </h2>

          <div className="space-y-3">
            {achievements.map((achievement) => (
              <motion.div
                key={achievement.type}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-4"
              >
                <p className="font-semibold text-gray-900">{achievement.title}</p>
                <p className="text-sm text-gray-600 mt-0.5">{achievement.description}</p>
              </motion.div>
            ))}
          </div>

          <button
            onClick={onClose}
            className="mt-6 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-medium rounded-xl hover:from-amber-600 hover:to-yellow-600 transition-all shadow-lg"
          >
            Awesome!
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
