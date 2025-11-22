import React from 'react';

export function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  trend,
  color = 'primary',
  className = '' 
}) {
  const colorClasses = {
    primary: 'bg-gradient-to-br from-blue-50 to-blue-100 text-primary',
    purple: 'bg-gradient-to-br from-purple-50 to-purple-100 text-[#582B5B]',
    pink: 'bg-gradient-to-br from-pink-50 to-pink-100 text-[#864F6C]',
    success: 'bg-gradient-to-br from-green-50 to-green-100 text-success'
  };
  
  return (
    <div className={`bg-card rounded-xl p-6 border border-border shadow-sm hover:shadow-md transition-shadow ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <h3 className="text-3xl font-semibold text-foreground">{value}</h3>
          {trend && (
            <p className={`text-sm mt-2 ${trend.positive ? 'text-success' : 'text-destructive'}`}>
              {trend.positive ? '↑' : '↓'} {trend.value}
            </p>
          )}
        </div>
        {Icon && (
          <div className={`${colorClasses[color]} rounded-lg p-3`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
    </div>
  );
}
