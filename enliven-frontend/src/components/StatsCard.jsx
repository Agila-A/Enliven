import React from 'react';

export function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  trend,
  color = 'red', // red, green, yellow
  className = ''
}) {
  const colorClasses = {
    red: 'bg-red/10 text-red',
    yellow: 'bg-yellow/10 text-yellow',
    green: 'bg-green/10 text-green',
  };
  
  const borderClasses = {
    red: 'border-red/20',
    yellow: 'border-yellow/20',
    green: 'border-green/20',
  };
  
  return (
    <div className={`bg-white rounded-3xl p-6 border ${borderClasses[color] || 'border-cream/50'} shadow-sm hover:shadow-soft transition-all group ${className}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground/60 uppercase tracking-widest mb-2">{title}</p>
          <h3 className="text-4xl font-bold text-foreground mb-1">{value}</h3>
          {trend && (
            <p className={`text-sm mt-3 font-semibold ${trend.positive ? 'text-green' : 'text-red'}`}>
              {trend.positive ? '↑' : '↓'} {trend.value}
            </p>
          )}
        </div>
        {Icon && (
          <div className={`${colorClasses[color] || 'bg-cream text-foreground'} rounded-2xl p-4 transition-transform group-hover:scale-110 duration-300`}>
            <Icon className="w-8 h-8" />
          </div>
        )}
      </div>
    </div>
  );
}
