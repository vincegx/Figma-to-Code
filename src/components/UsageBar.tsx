import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from '../i18n/I18nContext';

interface UsageData {
  today: {
    date: string;
    calls: Record<string, number>;
    totalCalls: number;
    analyses: number;
    tokens?: Record<string, number>; // Optional pour compatibilité avec anciennes données
    credits: {
      min: number;
      typical: number;
      max: number;
      dailyLimit: number;
      percentUsed: number;
      isActual: boolean;
    };
  };
  historical: Array<{
    date: string;
    totalCalls: number;
    analyses: number;
    creditsEstimate: number;
  }>;
  status: {
    emoji: string;
    text: string;
    level: 'safe' | 'good' | 'warning' | 'critical' | 'danger';
  };
}

export function UsageBar() {
  const { t } = useTranslation();
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    fetchUsage();
    // Refresh every 30 seconds
    const interval = setInterval(fetchUsage, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchUsage = async () => {
    try {
      const response = await fetch('/api/usage');
      const data = await response.json();
      setUsage(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch usage:', error);
      setLoading(false);
    }
  };

  // Ne pas afficher de skeleton pour éviter le flash au chargement
  if (loading || !usage) {
    return null;
  }

  const { today, status } = usage;
  const percentUsed = today.credits.percentUsed;

  // Couleur de la barre de progression - utilise --color-1 (la plus foncée du thème)
  const getBarColor = () => {
    return 'var(--color-1)';
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('fr-FR').format(num);
  };

  const formatLimit = (num: number) => {
    // Format 1200000 → "1 200K"
    if (num >= 1000) {
      const thousands = num / 1000;
      return new Intl.NumberFormat('fr-FR').format(thousands) + 'K';
    }
    return new Intl.NumberFormat('fr-FR').format(num);
  };

  // Calculer la position du tooltip quand il s'affiche
  const handleMouseEnter = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setTooltipPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX
      });
    }
    setShowTooltip(true);
  };

  return (
    <div
      ref={containerRef}
      className="relative backdrop-blur-sm rounded-xl px-4 py-1.5 cursor-help transition-all hover:shadow-lg"
      style={{
        backgroundColor: 'var(--bg-overlay-light)',
        borderWidth: '1px',
        borderColor: 'var(--border-light)'
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Layout horizontal compact - Responsive */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Emoji + Titre (titre masqué sur mobile) */}
        <div className="flex items-center gap-1 md:gap-2">
          <span className="text-sm md:text-base">{status.emoji}</span>
          <h3
            className="hidden md:block text-xs font-medium whitespace-nowrap"
            style={{ color: 'var(--color-black)' }}
          >
            {t('usage.title')}
          </h3>
        </div>

        {/* Barre de progression + pourcentage */}
        <div className="flex items-center gap-1 md:gap-2 flex-1 min-w-0">
          <div className="flex-1 min-w-[80px] md:min-w-[120px]">
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ backgroundColor: 'var(--color-2)' }}
            >
              <div
                className="h-full transition-all duration-500 ease-out"
                style={{
                  width: `${Math.min(percentUsed, 100)}%`,
                  backgroundColor: getBarColor()
                }}
              ></div>
            </div>
          </div>
          <div className="text-[10px] md:text-xs font-semibold whitespace-nowrap" style={{ color: 'var(--color-black)' }}>
            {percentUsed.toFixed(1)}%
          </div>
        </div>

        {/* Stats à droite (masqué sur très petits écrans, simplifié sur mobile) */}
        <div className="hidden sm:flex items-center gap-2 md:gap-3 whitespace-nowrap">
          <div className="text-[9px] md:text-[10px]" style={{ color: 'var(--color-black)' }}>
            <span className="hidden md:inline">~{formatNumber(today.credits.typical)} / </span>
            {formatLimit(today.credits.dailyLimit)}
            <span className="hidden md:inline"> {t('usage.credits')} (Pro)</span>
          </div>
          <div className="hidden md:block text-[10px]" style={{ color: 'var(--color-black)' }}>
            {today.analyses} {t('usage.analyses_today')}
          </div>
        </div>
      </div>

      {/* Tooltip détaillé au hover - avec Portal pour bypasser le stacking context */}
      {showTooltip && createPortal(
        <div
          className="fixed w-96 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 p-4 animate-in fade-in slide-in-from-top-2 duration-200"
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
            zIndex: 99999
          }}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <div className="space-y-3">
            {/* Total de tokens utilisés */}
            <div>
              <h4 className="text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100">
                {t('usage.tooltip.tokens_used')}
              </h4>
              <div className="rounded p-3 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border border-blue-200 dark:border-blue-700">
                <div className="flex justify-between items-center">
                  <div className="text-gray-700 dark:text-gray-300 font-medium">Total</div>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {formatNumber(today.credits.typical)}
                  </div>
                </div>
                <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                  {formatNumber(today.credits.dailyLimit)} limit / {percentUsed.toFixed(1)}% used
                </div>
              </div>
            </div>

            {/* Détail par outil MCP */}
            <div>
              <h4 className="text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100">
                {t('usage.tooltip.mcp_tools')}
              </h4>
              <div className="space-y-1 text-xs">
                {Object.entries(today.calls).map(([tool, count]) => (
                  <div key={tool} className="flex justify-between items-center gap-3 py-1">
                    <span className="font-mono text-gray-600 dark:text-gray-400 text-[10px]">
                      {tool}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 dark:text-gray-400">
                        {count}×
                      </span>
                      <span className="font-semibold text-blue-600 dark:text-blue-400 min-w-[60px] text-right">
                        {formatNumber(today.tokens?.[tool] || 0)} tk
                      </span>
                    </div>
                  </div>
                ))}
                {Object.keys(today.calls).length === 0 && (
                  <div className="italic text-gray-500 dark:text-gray-400">
                    {t('usage.tooltip.no_calls')}
                  </div>
                )}
              </div>
            </div>

            {/* Mini graphique 7 derniers jours */}
            <div>
              <h4 className="text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100">
                {t('usage.tooltip.last_days')}
              </h4>
              <div className="flex items-end justify-between gap-1 h-12">
                {usage.historical.map((day) => {
                  const maxCredits = Math.max(...usage.historical.map(d => d.creditsEstimate), 1);
                  const height = (day.creditsEstimate / maxCredits) * 100;
                  return (
                    <div
                      key={day.date}
                      className="flex-1 group relative"
                      title={`${day.date}: ${day.analyses} ${t('usage.tooltip.analyses')}`}
                    >
                      <div
                        className="bg-blue-500 dark:bg-blue-400 rounded-t transition-all group-hover:bg-blue-600 dark:group-hover:bg-blue-300"
                        style={{ height: `${height}%`, minHeight: day.creditsEstimate > 0 ? '4px' : '0' }}
                      ></div>
                      <div className="text-[9px] text-center mt-1 truncate text-gray-500 dark:text-gray-400">
                        {day.date.slice(5)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Disclaimer */}
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs italic text-gray-600 dark:text-gray-400">
                {t('usage.tooltip.disclaimer')}
              </p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
