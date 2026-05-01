import React, { useState } from "react";
import { CheckCircle2, XCircle, ArrowRight, RotateCcw } from "lucide-react";

export default function MiniQuiz({ questions = [], onComplete }) {
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);

  if (!questions || questions.length === 0) return null;

  const handleSelect = (idx) => {
    if (showResult) return;
    setSelectedAnswer(idx);
    setShowResult(true);
    if (idx === questions[currentQ].correct) {
      setScore(s => s + 1);
    }
  };

  const handleNext = () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ(currentQ + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      setCurrentQ(currentQ + 1); // Move to final screen
    }
  };

  const handleRetry = () => {
    setCurrentQ(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
  };

  // Final score screen
  if (currentQ >= questions.length) {
    return (
      <div className="w-full max-w-md bg-[var(--card)] border-2 border-[var(--enliven-cream)] rounded-2xl p-6 text-center shadow-sm">
        <h3 className="font-bold text-xl text-[var(--foreground)] mb-2">Quiz Complete!</h3>
        <p className="text-[var(--muted-foreground)] font-medium mb-6">
          You got <span className="font-bold text-[var(--enliven-purple)] text-xl">{score}</span> out of {questions.length} correct.
        </p>
        <div className="flex gap-3 justify-center">
          <button 
            onClick={handleRetry}
            className="px-4 py-2 flex items-center gap-2 rounded-xl border-2 border-[var(--enliven-cream)] font-bold text-sm text-[var(--foreground)] hover:bg-[var(--secondary)] transition-all"
          >
            <RotateCcw className="w-4 h-4" /> Try Again
          </button>
          {onComplete && (
            <button 
              onClick={() => onComplete(score)}
              className="px-4 py-2 rounded-xl bg-[var(--enliven-purple)] text-white font-bold text-sm hover:opacity-90 transition-all"
            >
              Done
            </button>
          )}
        </div>
      </div>
    );
  }

  const q = questions[currentQ];

  return (
    <div className="w-full max-w-md bg-[var(--card)] border-2 border-[var(--enliven-cream)] rounded-2xl p-6 shadow-sm my-2">
      <div className="flex justify-between items-center mb-4">
        <span className="text-[10px] font-bold text-[var(--enliven-purple)] uppercase tracking-widest">Mini-Quiz</span>
        <span className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-widest">{currentQ + 1} of {questions.length}</span>
      </div>
      
      <p className="font-bold text-[var(--foreground)] text-lg mb-4">{q.q}</p>
      
      <div className="flex flex-col gap-2">
        {q.options.map((opt, idx) => {
          const isSelected = selectedAnswer === idx;
          const isCorrect = idx === q.correct;
          let btnClass = "text-left px-4 py-3 rounded-xl border-2 font-medium transition-all ";
          let style = {};
          
          if (!showResult) {
            btnClass += "border-[var(--enliven-cream)] hover:border-[var(--enliven-purple)] hover:bg-[var(--secondary)] text-[var(--foreground)]";
          } else {
            if (isCorrect) {
              style = { borderColor: '#10b981', backgroundColor: '#ecfdf5', color: '#047857' };
            } else if (isSelected && !isCorrect) {
              style = { borderColor: '#ef4444', backgroundColor: '#fef2f2', color: '#b91c1c' };
            } else {
              btnClass += "border-[var(--enliven-cream)] opacity-50 text-[var(--muted-foreground)]";
            }
          }

          return (
            <button 
              key={idx}
              onClick={() => handleSelect(idx)}
              disabled={showResult}
              className={btnClass}
              style={style}
            >
              <div className="flex justify-between items-center gap-2">
                <span>{opt}</span>
                {showResult && isCorrect && <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: '#10b981' }} />}
                {showResult && isSelected && !isCorrect && <XCircle className="w-5 h-5 shrink-0" style={{ color: '#ef4444' }} />}
              </div>
            </button>
          );
        })}
      </div>

      {showResult && (
        <div className="mt-4 p-4 rounded-xl bg-[var(--enliven-cream)] text-[var(--foreground)] text-sm font-medium">
          <p className="font-bold mb-1">Explanation:</p>
          <p>{q.explanation}</p>
        </div>
      )}

      {showResult && (
        <button 
          onClick={handleNext}
          className="mt-4 w-full flex justify-center items-center gap-2 py-3 bg-[var(--enliven-purple)] text-white font-bold rounded-xl hover:opacity-90 transition-all"
        >
          {currentQ < questions.length - 1 ? "Next Question" : "See Results"} <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
