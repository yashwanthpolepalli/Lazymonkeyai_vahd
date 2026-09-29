export interface LogoProps {
  collapsed?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showSubtitle?: boolean;
}

export function Logo({
  collapsed = false,
  size = 'md',
  className = '',
  showSubtitle = true,
}: LogoProps) {
  const sizeMap = {
    sm: {
      img: 'w-12 h-12 rounded-xl',
      title: 'text-sm',
      sub: 'text-[10px]',
      gap: 'gap-2.5',
    },
    md: {
      img: 'w-16 h-16 rounded-2xl shadow-sm border border-slate-200/60 p-1 bg-white',
      title: 'text-lg',
      sub: 'text-xs',
      gap: 'gap-3',
    },
    lg: {
      img: 'w-24 h-24 rounded-3xl shadow-lg border-2 border-slate-200/90 p-1.5 bg-white',
      title: 'text-2xl sm:text-3xl',
      sub: 'text-xs sm:text-sm',
      gap: 'gap-4',
    },
    xl: {
      img: 'w-36 h-36 rounded-3xl shadow-xl border-2 border-slate-200 p-2 bg-white',
      title: 'text-4xl',
      sub: 'text-base',
      gap: 'gap-5',
    },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  return (
    <div className={`flex items-center ${currentSize.gap} ${className}`}>
      <img
        src="/logo.png"
        alt="VAHD"
        className={`${currentSize.img} object-contain shrink-0`}
      />
      {!collapsed && (
        <div className="flex flex-col leading-tight">
          <div className={`font-black tracking-tight flex items-center gap-1.5 leading-none ${currentSize.title}`}>
            <span className="text-slate-900">VAHD</span>
          </div>
          {showSubtitle && (
            <span className={`font-bold text-blue-600 tracking-wider uppercase mt-0.5 ${currentSize.sub}`}>
              LazymonkeyAI
            </span>
          )}
        </div>
      )}
    </div>
  );
}

