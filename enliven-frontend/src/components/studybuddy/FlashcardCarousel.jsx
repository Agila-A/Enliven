import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";

export default function FlashcardCarousel({ cards = [] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Reset state when new cards arrive
  useEffect(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [cards]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
      if (e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        setIsFlipped(f => !f);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, cards.length]);

  if (!cards || cards.length === 0) return null;

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((i) => Math.min(i + 1, cards.length - 1));
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex((i) => Math.max(i - 1, 0));
  };

  const currentCard = cards[currentIndex];

  return (
    <div className="w-full max-w-sm flex flex-col items-center gap-4 my-2 select-none">
      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .transform-style-preserve-3d { transform-style: preserve-3d; }
        .rotate-y-180 { transform: rotateY(180deg); }
        .backface-hidden { backface-visibility: hidden; }
      `}</style>
      <div 
        className="relative w-full h-48 cursor-pointer group perspective-1000"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div 
          className={`w-full h-full relative transition-transform duration-500 transform-style-preserve-3d ${isFlipped ? "rotate-y-180" : ""}`}
        >
          {/* Front */}
          <div className="absolute inset-0 w-full h-full backface-hidden bg-[var(--card)] border-2 border-[var(--enliven-purple)] rounded-2xl p-6 flex flex-col justify-center items-center text-center shadow-sm">
            <span className="absolute top-3 left-4 text-[10px] font-bold text-[var(--enliven-purple)] uppercase tracking-widest">Question</span>
            <p className="text-[var(--foreground)] font-bold text-lg">{currentCard.front}</p>
            <div className="absolute bottom-3 right-4 opacity-50 group-hover:opacity-100 transition-opacity">
               <RefreshCw className="w-4 h-4 text-[var(--muted-foreground)]" />
            </div>
          </div>
          
          {/* Back */}
          <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 bg-[var(--enliven-cream)] border-2 border-[var(--enliven-purple)] rounded-2xl p-6 flex flex-col justify-center items-center text-center shadow-sm">
            <span className="absolute top-3 left-4 text-[10px] font-bold text-[var(--enliven-purple)] uppercase tracking-widest">Answer</span>
            <p className="text-[var(--foreground)] font-medium text-md overflow-y-auto custom-scrollbar">{currentCard.back}</p>
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between w-full px-4 text-[var(--foreground)]">
        <button 
          onClick={handlePrev} 
          disabled={currentIndex === 0}
          className="p-2 rounded-full border-2 border-[var(--enliven-cream)] disabled:opacity-30 hover:bg-[var(--secondary)] transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="font-bold text-sm tracking-widest uppercase text-[var(--muted-foreground)]">
          {currentIndex + 1} / {cards.length}
        </span>
        <button 
          onClick={handleNext} 
          disabled={currentIndex === cards.length - 1}
          className="p-2 rounded-full border-2 border-[var(--enliven-cream)] disabled:opacity-30 hover:bg-[var(--secondary)] transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
