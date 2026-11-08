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
}: LogoProps) {
  const sizeMap = {
    sm: {
      img: collapsed
        ? 'w-10 h-10 object-contain'
        : 'h-10 sm:h-11 w-auto max-w-[170px] object-contain',
    },
    md: {
      img: collapsed
        ? 'w-12 h-12 object-contain'
        : 'h-14 sm:h-16 w-auto max-w-[240px] object-contain',
    },
    lg: {
      img: collapsed
        ? 'w-16 h-16 object-contain'
        : 'h-20 sm:h-24 md:h-28 w-auto max-w-[340px] sm:max-w-[420px] object-contain',
    },
    xl: {
      img: collapsed
        ? 'w-24 h-24 object-contain'
        : 'h-28 sm:h-36 w-auto max-w-[480px] object-contain',
    },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  return (
    <div className={`flex items-center ${className}`}>
      <img
        src="/logo.png"
        alt="IoTRONCS"
        className={`${currentSize.img} shrink-0`}
      />
    </div>
  );
}
