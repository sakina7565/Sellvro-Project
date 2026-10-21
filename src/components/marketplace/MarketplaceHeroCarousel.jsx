import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Pause, Play, ShieldCheck, ArrowRight } from 'lucide-react'
import { HERO_SLIDES } from './marketplaceData.js'

function MarketplaceHeroCarousel() {
  const [current, setCurrent] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)

  useEffect(() => {
    if (!isPlaying) return
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % HERO_SLIDES.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [isPlaying])

  const slide = HERO_SLIDES[current]

  const prevSlide = () => {
    setCurrent((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)
  }

  const nextSlide = () => {
    setCurrent((prev) => (prev + 1) % HERO_SLIDES.length)
  }

  return (
    <section className="relative mx-auto mt-4 max-w-7xl px-4 sm:px-6">
      <div className="relative h-[340px] sm:h-[400px] md:h-[440px] w-full overflow-hidden rounded-2xl bg-slate-900 shadow-md">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0">
          <img
            src={slide.image}
            alt={slide.title}
            className="h-full w-full object-cover transition-transform duration-1000 ease-out scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/60 to-transparent" />
        </div>

        {/* Content Box */}
        <div className="relative z-10 flex h-full max-w-2xl flex-col justify-center px-6 sm:px-12 text-white">
          <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold tracking-wider uppercase text-blue-200 backdrop-blur-md">
            <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
            <span>{slide.tag}</span>
          </div>

          <h1 className="mt-4 text-2xl font-black leading-tight tracking-tight sm:text-4xl md:text-5xl">
            {slide.title}
          </h1>

          <p className="mt-3 text-xs sm:text-sm md:text-base leading-relaxed text-slate-200 line-clamp-2 sm:line-clamp-none max-w-xl">
            {slide.subtitle}
          </p>

          <div className="mt-6 sm:mt-8 flex flex-wrap items-center gap-3">
            <Link
              to={slide.ctaLink}
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-xs sm:text-sm font-bold text-slate-900 shadow-md transition-all hover:bg-slate-100 hover:shadow-lg focus:outline-none"
            >
              <span>{slide.ctaText}</span>
              <ArrowRight className="h-4 w-4 text-blue-600" />
            </Link>

            {slide.secondaryCtaText && (
              <Link
                to={slide.secondaryCtaLink || '/login'}
                className="inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white backdrop-blur-md transition-all hover:bg-white/20 focus:outline-none"
              >
                <span>{slide.secondaryCtaText}</span>
              </Link>
            )}
          </div>
        </div>

        {/* Bottom Carousel Controls (eBay style) */}
        <div className="absolute bottom-5 right-6 z-20 flex items-center gap-3 rounded-full bg-black/40 px-3.5 py-1.5 backdrop-blur-md">
          {/* Dot Indicators */}
          <div className="flex items-center gap-1.5">
            {HERO_SLIDES.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrent(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className={`h-2 rounded-full transition-all ${
                  current === idx ? 'w-5 bg-white' : 'w-2 bg-white/40 hover:bg-white/70'
                }`}
              />
            ))}
          </div>

          <span className="text-white/30 text-xs">|</span>

          {/* Prev Arrow */}
          <button
            type="button"
            onClick={prevSlide}
            aria-label="Previous slide"
            className="text-white/80 hover:text-white transition"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Next Arrow */}
          <button
            type="button"
            onClick={nextSlide}
            aria-label="Next slide"
            className="text-white/80 hover:text-white transition"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* Pause / Play */}
          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            aria-label={isPlaying ? 'Pause slideshow' : 'Play slideshow'}
            className="text-white/80 hover:text-white transition ml-0.5"
          >
            {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
          </button>
        </div>
      </div>
    </section>
  )
}

export default MarketplaceHeroCarousel
