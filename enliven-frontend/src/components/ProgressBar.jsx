import React from 'react';

export function ProgressBar({ 
  progress, 
  showLabel = false, 
  size = 'md',
  colorClass = 'bg-red', // Allow dynamic class passing or default
  className = '' 
}) {
  const clampedProgress = Math.min(Math.max(progress, 0), 100);
  
  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4'
  };
  
  return (
    <div className={`w-full ${className}`}>
      <div className={`w-full bg-cream/50 rounded-full overflow-hidden ${heightClasses[size]}`}>
        <div 
          className={`${heightClasses[size]} ${colorClass} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-sm font-medium text-foreground/60 mt-2 text-right">{clampedProgress}% complete</p>
      )}
    </div>
  );
}
