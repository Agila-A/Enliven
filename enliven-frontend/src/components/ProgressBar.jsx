import React from 'react';

export function ProgressBar({ 
  progress, 
  showLabel = false, 
  size = 'md',
  color = 'primary',
  className = '' 
}) {
  const clampedProgress = Math.min(Math.max(progress, 0), 100);
  
  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-3'
  };
  
  const colorClasses = {
    primary: 'bg-primary',
    success: 'bg-success',
    warning: 'bg-warning',
    purple: 'bg-[#582B5B]'
  };
  
  return (
    <div className={`w-full ${className}`}>
      <div className={`w-full bg-secondary rounded-full overflow-hidden ${heightClasses[size]}`}>
        <div 
          className={`${heightClasses[size]} ${colorClasses[color]} rounded-full transition-all duration-300 ease-out`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-sm text-muted-foreground mt-1">{clampedProgress}% complete</p>
      )}
    </div>
  );
}
