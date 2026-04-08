const LOGO_URL = 'https://firebasestorage.googleapis.com/v0/b/cevichedelreydb.firebasestorage.app/o/brand%2FLogo.png?alt=media&token=c7cf4491-254d-4c83-bc8d-06f81f1dd187'

function RestaurantLogo({ size = 'md', showTagline = false, variant = 'horizontal', className = '' }) {
  const sizes = {
    sm:  { img: 'w-7 h-7',   title: 'text-sm',   sub: 'text-[9px]',  gap: 'gap-2' },
    md:  { img: 'w-9 h-9',   title: 'text-base',  sub: 'text-[10px]', gap: 'gap-2.5' },
    lg:  { img: 'w-12 h-12', title: 'text-xl',   sub: 'text-xs',     gap: 'gap-3' },
    xl:  { img: 'w-16 h-16', title: 'text-2xl',  sub: 'text-sm',     gap: 'gap-4' },
    '2xl': { img: 'w-22 h-22', title: 'text-3xl', sub: 'text-base',  gap: 'gap-4' },
  }
  const s = sizes[size] || sizes.md

  const LogoImg = () => (
    <img
      src={LOGO_URL}
      alt="Ceviche del Rey"
      className={`${s.img} object-contain flex-shrink-0`}
    />
  )

  if (variant === 'mark') {
    return <LogoImg />
  }

  if (variant === 'stacked') {
    return (
      <div className={`flex flex-col items-center gap-2 ${className}`}>
        <LogoImg />
        <div className="text-center">
          <div className={`${s.title} font-playfair font-semibold text-white leading-tight tracking-tight`}>
            Ceviche del Rey
          </div>
          {showTagline && (
            <div className={`${s.sub} text-white/50 tracking-widest uppercase`}>
              Cocina Peruana
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`flex items-center ${s.gap} ${className}`}>
      <LogoImg />
      <div>
        <div className={`${s.title} font-playfair font-semibold text-white leading-tight tracking-tight`}>
          Ceviche del Rey
        </div>
        {showTagline && (
          <div className={`${s.sub} tracking-[0.18em] uppercase text-white/50 font-inter`}>
            Cocina Peruana
          </div>
        )}
      </div>
    </div>
  )
}

export default RestaurantLogo
