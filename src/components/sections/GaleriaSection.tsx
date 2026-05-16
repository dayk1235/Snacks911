import { motion } from 'framer-motion';

const galleryImages = [
  { src: '/images/alitas.webp',   alt: 'Alitas crujientes con salsa BBQ' },
  { src: '/images/boneless.webp', alt: 'Boneless jugosos con salsa buffalo' },
  { src: '/images/papas.webp',    alt: 'Papas loaded con queso y jalapeños' },
  { src: '/images/combo.webp',    alt: 'Combo mixto 911' },
  { src: '/images/alitas.webp',   alt: 'Alitas doradas con salsa habanero' },
  { src: '/images/boneless.webp', alt: 'Boneless con chipotle cremoso' },
];

export default function GaleriaSection() {
  return (
    <section id="galeria" className="relative bg-[#050505] py-32 overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-full bg-[var(--color-primary)]/5 blur-[150px] rounded-full pointer-events-none" />

      <div className="w-full max-w-[1400px] mx-auto px-6 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="m-0 font-black uppercase text-white tracking-tighter" style={{ fontSize: 'clamp(2rem, 6vw, 4rem)' }}>
            Así se ven <br/>
            <span className="text-[var(--color-primary)]">cuando llegan 👀</span>
          </h2>
          <p className="mt-4 font-bold tracking-widest uppercase text-white/40 text-sm">
            Sin filtros. Solo sabor real.
          </p>
        </div>

        {/* Premium Masonry-style columns */}
        <div className="columns-2 md:columns-3 gap-6 space-y-6">
          {galleryImages.map((img, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ delay: i * 0.1, duration: 0.6, ease: "easeOut" }}
              className={`relative break-inside-avoid rounded-[32px] overflow-hidden group shadow-2xl bg-black border border-white/10 cursor-pointer float-anim-${i % 3}`}
            >
              {/* Dark vignette overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 z-10 opacity-70 group-hover:opacity-20 transition-opacity duration-500" />
              
              {/* Cyber color tint overlay on hover */}
              <div className="absolute inset-0 bg-[var(--color-primary)]/30 mix-blend-overlay z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              {/* Image with slow cinematic zoom */}
              <img
                src={img.src}
                alt={img.alt}
                className="w-full h-auto block object-cover transition-all duration-[800ms] ease-[cubic-bezier(0.2,1,0.3,1)] group-hover:scale-110 group-hover:rotate-1"
                loading="lazy"
              />

              {/* Premium Glassmorphism Badge */}
              <div className="absolute bottom-5 left-5 z-20 translate-y-8 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 delay-75 pointer-events-none">
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 px-4 py-2 rounded-2xl text-white text-[0.65rem] font-black tracking-[2px] uppercase shadow-[0_10px_20px_rgba(0,0,0,0.5)]">
                  {img.alt.split(' ')[0]} 🔥
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes float-0 { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
        @keyframes float-1 { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-15px); } }
        @keyframes float-2 { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
        
        .float-anim-0 { animation: float-0 7s ease-in-out infinite; }
        .float-anim-1 { animation: float-1 9s ease-in-out infinite; animation-delay: 1.5s; }
        .float-anim-2 { animation: float-2 8s ease-in-out infinite; animation-delay: 0.5s; }
      `}} />
    </section>
  );
}
