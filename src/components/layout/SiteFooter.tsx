export default function SiteFooter() {
  return (
    <footer className="glass border-t border-[var(--border)] mt-[100px] py-20 px-6">
      <div className="max-w-[1440px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
        <div>
          <div className="font-mono font-black text-2xl mb-5 text-[var(--fg)] tracking-tighter">
            SNACKS <span className="text-[var(--accent)]">911</span>
          </div>
          <p className="text-[var(--muted)] text-[0.9rem] leading-relaxed">
            Tu unidad de respuesta rápida para emergencias de hambre. Operando 24/7 en el corazón de la ciudad.
          </p>
        </div>

        <div>
          <h4 className="font-black mb-5 text-[var(--fg)] tracking-widest text-sm">LINKS RÁPIDOS</h4>
          <div className="flex flex-col gap-2.5 text-[0.9rem]">
            <a href="/#hero" className="text-[var(--muted)] hover:text-[var(--accent)] transition-colors no-underline">Inicio</a>
            <a href="/#combos" className="text-[var(--muted)] hover:text-[var(--accent)] transition-colors no-underline">Combos</a>
            <a href="/menu" className="text-[var(--muted)] hover:text-[var(--accent)] transition-colors no-underline">Menú</a>
            <a href="/#order-status" className="text-[var(--muted)] hover:text-[var(--accent)] transition-colors no-underline">Estado</a>
          </div>
        </div>

        <div>
          <h4 className="font-black mb-5 text-[var(--fg)] tracking-widest text-sm">CONTACTO</h4>
          <p className="text-[var(--muted)] text-[0.9rem] mb-1">📍 Av. Rescate 911, Sector Industrial</p>
          <p className="text-[var(--muted)] text-[0.9rem] mb-5">📞 SOS: 800-SNACKS-911</p>
          <div className="flex gap-4 text-xl">
            <span className="cursor-pointer hover:scale-125 transition-transform">📸</span>
            <span className="cursor-pointer hover:scale-125 transition-transform">🐦</span>
            <span className="cursor-pointer hover:scale-125 transition-transform">📘</span>
          </div>
        </div>

        <div className="flex items-end">
          <button 
            className="btn-primary w-full py-4 text-sm font-black tracking-widest"
            onClick={() => window.location.href = '/menu'}
          >
            ORDENA AHORA 🔥
          </button>
        </div>
      </div>

      <div className="text-center mt-20 pt-10 border-t border-white/5 text-[0.7rem] text-[var(--muted)] opacity-50 uppercase tracking-[0.2em] font-bold">
        © {new Date().getFullYear()} SNACKS 911 - DESPACHO TÁCTICO DE CALORÍAS.
      </div>
    </footer>
  );
}
