'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface Review {
  id: string;
  name: string;
  emoji: string;
  rating: number;
  text: string;
  date: string;
  reaction?: string;
  photoUrl?: string;
}

const SEED_REVIEWS: Review[] = [
  { id: 'r1', name: 'Carlos M.',  emoji: '😤', rating: 5, text: 'Las alitas BBQ son un pecado, no puedo dejar de pedirlas. Entrega súper rápida y bien calientes 🔥', date: '2026-04-07', reaction: '🔥' },
  { id: 'r2', name: 'Valeria R.', emoji: '🤩', rating: 5, text: 'El Combo 911 me dejó sin palabras. Los boneless mango habanero son otro nivel, picante perfecto.', date: '2026-04-06', reaction: '❤️' },
  { id: 'r3', name: 'Javier T.',  emoji: '😮', rating: 4, text: 'Super riquísimo todo. Las papas gajo loaded me voló la cabeza. Solo le falta un poco más de salsa.', date: '2026-04-05', reaction: '🔥' },
  { id: 'r4', name: 'Ana P.',     emoji: '🥵', rating: 5, text: '¡No puedo con esto! Las alitas buffalo me dejaron llorando (de felicidad). Definitivamente lo mejor de la zona.', date: '2026-04-04', reaction: '💯' },
  { id: 'r5', name: 'Mike S.',    emoji: '😋', rating: 5, text: 'Pedí por primera vez y ya soy cliente fijo. Atención increíble y la comida llegó perfecto.', date: '2026-04-03', reaction: '❤️' },
  { id: 'r6', name: 'Sofía L.',   emoji: '💪', rating: 5, text: 'Lo mejor que le ha pasado a mis noches de Netflix. Antojo resuelto en 30 min.', date: '2026-04-02', reaction: '🔥' },
];

const EMOJIS   = ['😤', '🤩', '😮', '🥵', '😋', '💪', '🔥', '😱'];
const REACTIONS = ['🔥', '❤️', '💯', '😍', '👏'];

const LS_KEY = 'snacks911_reviews';

function loadReviews(): Review[] {
  if (typeof window === 'undefined') return SEED_REVIEWS;
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : SEED_REVIEWS;
  } catch {
    return SEED_REVIEWS;
  }
}

function saveReviews(reviews: Review[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LS_KEY, JSON.stringify(reviews));
}

/* ── Flame Rating ─────────────────────────────────────────────────────────── */
function FlameRating({ value, onChange }: { value: number; onChange?: (n: number) => void }) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;
  return (
    <div style={{ display: 'flex', gap: '4px' }}>
      {Array.from({ length: 5 }).map((_, i) => {
        const isLit = i < display;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onChange?.(i + 1)}
            onMouseEnter={() => onChange && setHovered(i + 1)}
            onMouseLeave={() => onChange && setHovered(0)}
            style={{
              background: 'none', border: 'none', cursor: onChange ? 'pointer' : 'default',
              fontSize: '1.4rem', padding: '0 1px',
              filter: isLit ? 'brightness(1)' : 'brightness(0.2) grayscale(1)',
              transition: 'filter 0.15s',
              animation: isLit && onChange ? 'flame-flicker 0.8s ease-in-out infinite' : 'none',
              animationDelay: `${i * 0.12}s`,
            }}
          >
            🔥
          </button>
        );
      })}
    </div>
  );
}

/* ── Photo Lightbox ───────────────────────────────────────────────────────── */
function PhotoLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 99990,
        animation: 'fadeIn 0.25s ease',
      }}
    >
      <img
        src={src}
        alt="Review photo"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '90vw', maxHeight: '85vh',
          borderRadius: '16px',
          boxShadow: '0 20px 80px rgba(0,0,0,0.6)',
          border: '2px solid rgba(255,69,0,0.3)',
          objectFit: 'contain',
        }}
      />
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: '1.5rem', right: '1.5rem',
          background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '50%', width: '40px', height: '40px',
          color: '#fff', fontSize: '1.2rem', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        ✕
      </button>
    </div>
  );
}

/* ── Single Review Card ───────────────────────────────────────────────────── */
function ReviewCard({
  review,
  onReact,
  onPhotoClick,
}: {
  review: Review;
  onReact: (id: string, r: string) => void;
  onPhotoClick: (src: string) => void;
}) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: '20px',
        padding: '1.6rem',
        display: 'flex', flexDirection: 'column', gap: '0.9rem',
        boxShadow: '0 8px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
        minWidth: '300px',
        maxWidth: '380px',
        flexShrink: 0,
        height: 'auto',
        userSelect: 'none',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{
          width: '44px', height: '44px', borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(255,69,0,0.2), rgba(255,184,0,0.15))',
          border: '1px solid rgba(255,69,0,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.4rem', flexShrink: 0,
        }}>
          {review.emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>{review.name}</div>
          <div style={{ fontSize: '0.72rem', color: '#444', marginTop: '1px' }}>
            {new Date(review.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        </div>
        <FlameRating value={review.rating} />
      </div>

      {/* Photo */}
      {review.photoUrl && (
        <div
          onClick={() => onPhotoClick(review.photoUrl!)}
          style={{
            borderRadius: '12px',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.08)',
            cursor: 'pointer',
            position: 'relative',
          }}
        >
          <img
            src={review.photoUrl}
            alt={`Foto de ${review.name}`}
            style={{
              width: '100%',
              height: '160px',
              objectFit: 'cover',
              display: 'block',
              transition: 'transform 0.3s ease',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLImageElement).style.transform = 'scale(1.05)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLImageElement).style.transform = 'scale(1)'; }}
          />
          <div style={{
            position: 'absolute', bottom: '8px', right: '8px',
            background: 'rgba(0,0,0,0.6)', borderRadius: '6px',
            padding: '2px 8px', fontSize: '0.7rem', color: '#ddd',
          }}>
            📷 Ver foto
          </div>
        </div>
      )}

      {/* Text */}
      <p style={{
        fontSize: '0.9rem', color: '#bbb', lineHeight: 1.65,
        margin: 0, flex: 1,
        fontStyle: 'italic',
      }}>
        &quot;{review.text}&quot;
      </p>

      {/* Reactions */}
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        {REACTIONS.map(r => (
          <button
            key={r}
            type="button"
            onClick={() => onReact(review.id, r)}
            style={{
              background: review.reaction === r ? 'rgba(255,69,0,0.15)' : 'rgba(255,255,255,0.05)',
              border: review.reaction === r ? '1px solid rgba(255,69,0,0.35)' : '1px solid rgba(255,255,255,0.08)',
              borderRadius: '20px', padding: '0.2rem 0.6rem',
              fontSize: '0.85rem', cursor: 'pointer',
              transition: 'all 0.18s',
            }}
          >
            {r}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Infinite Carousel ────────────────────────────────────────────────────── */
function InfiniteCarousel({
  reviews,
  onReact,
  onPhotoClick,
}: {
  reviews: Review[];
  onReact: (id: string, r: string) => void;
  onPhotoClick: (src: string) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);

  // We need to duplicate items for seamless loop
  const items = reviews.length > 0 ? [...reviews, ...reviews] : [];

  // Calculate animation duration based on number of cards
  const cardWidth = 340; // avg card width + gap
  const totalWidth = reviews.length * cardWidth;
  const speed = 40; // px per second
  const duration = totalWidth / speed;

  return (
    <div
      style={{
        overflow: 'hidden',
        maskImage: 'linear-gradient(90deg, transparent 0%, black 5%, black 95%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, black 5%, black 95%, transparent 100%)',
        width: '100%',
        padding: '0.5rem 0',
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        ref={trackRef}
        style={{
          display: 'flex',
          gap: '1.25rem',
          width: 'max-content',
          animation: `scroll-carousel ${duration}s linear infinite`,
          animationPlayState: paused ? 'paused' : 'running',
        }}
      >
        {items.map((review, i) => (
          <ReviewCard
            key={`${review.id}-${i}`}
            review={review}
            onReact={onReact}
            onPhotoClick={onPhotoClick}
          />
        ))}
      </div>

      <style>{`
        @keyframes scroll-carousel {
          0% { transform: translateX(0); }
          100% { transform: translateX(-${totalWidth}px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/* ── Main ReviewSection ───────────────────────────────────────────────────── */
export default function ReviewSection() {
  const [reviews, setReviews]       = useState<Review[]>([]);
  const [showForm, setShowForm]     = useState(false);
  const [formName, setFormName]     = useState('');
  const [formEmoji, setFormEmoji]   = useState('😤');
  const [formRating, setFormRating] = useState(5);
  const [formText, setFormText]     = useState('');
  const [formPhoto, setFormPhoto]   = useState<string | null>(null);
  const [submitted, setSubmitted]   = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setReviews(loadReviews());
  }, []);

  const handleReact = (id: string, reaction: string) => {
    const updated = reviews.map(r => r.id === id ? { ...r, reaction } : r);
    setReviews(updated);
    saveReviews(updated);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate it's an image
    if (!file.type.startsWith('image/')) return;

    // Max 2MB
    if (file.size > 2 * 1024 * 1024) {
      alert('La imagen debe ser menor a 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormPhoto(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formText.trim()) return;

    const newReview: Review = {
      id: `r${Date.now()}`,
      name: formName.trim(),
      emoji: formEmoji,
      rating: formRating,
      text: formText.trim(),
      date: new Date().toISOString().slice(0, 10),
      photoUrl: formPhoto || undefined,
    };

    const updated = [newReview, ...reviews];
    setReviews(updated);
    saveReviews(updated);
    setSubmitted(true);
    setFormName(''); setFormText(''); setFormRating(5); setFormEmoji('😤');
    setFormPhoto(null);

    setTimeout(() => { setSubmitted(false); setShowForm(false); }, 2500);
  };

  return (
    <section
      id="reviews"
      style={{ padding: '5rem 0', scrollMarginTop: '70px', overflow: 'hidden' }}
    >
      {/* Lightbox */}
      {lightboxSrc && (
        <PhotoLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      )}

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '3rem', padding: '0 1.5rem' }}>
        <span style={{
          fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: '#FF4500',
          fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase',
          display: 'block', marginBottom: '0.75rem',
        }}>
          🔥 Lo que dicen nuestros clientes
        </span>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(2rem, 5vw, 4rem)',
          color: '#fff', letterSpacing: '0.04em', margin: '0 0 1rem',
        }}>
          RESEÑAS REALES
        </h2>
        <p style={{ color: '#555', fontSize: '0.9rem', maxWidth: '480px', margin: '0 auto' }}>
          Sin filtros, sin mentiras. Solo la verdad caliente directo de nuestros clientes 🌶️
        </p>
      </div>

      {/* Infinite scrolling carousel */}
      <InfiniteCarousel
        reviews={reviews}
        onReact={handleReact}
        onPhotoClick={(src) => setLightboxSrc(src)}
      />

      {/* CTA + Form */}
      <div style={{ padding: '0 1.5rem', maxWidth: '1200px', margin: '2.5rem auto 0' }}>
        {!showForm && (
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={() => setShowForm(true)}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(1.04)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(255,69,0,0.4)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 24px rgba(255,69,0,0.25)';
              }}
              style={{
                background: 'linear-gradient(135deg, #FF4500, #FF6500)',
                border: 'none', borderRadius: '14px',
                padding: '0.85rem 2rem', color: '#fff',
                fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
                boxShadow: '0 4px 24px rgba(255,69,0,0.25)',
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                transition: 'all 0.2s ease',
              }}
            >
              ✍️ Dejar mi reseña
            </button>
          </div>
        )}

        {/* Inline review form */}
        {showForm && (
          <div
            style={{
              background: 'rgba(255,255,255,0.03)',
              backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: '24px', padding: '2rem',
              maxWidth: '580px', margin: '0 auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.07)',
              animation: 'slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            {submitted ? (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <div style={{ fontSize: '3rem', marginBottom: '0.75rem', animation: 'review-pop 0.6s ease forwards' }}>🔥</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>¡Gracias por tu reseña!</div>
                <div style={{ color: '#555', fontSize: '0.85rem', marginTop: '0.4rem' }}>Ya aparece en el carrusel.</div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>
                    Tu experiencia 🌶️
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', fontSize: '1.1rem' }}
                  >
                    ✕
                  </button>
                </div>

                {/* Emoji picker */}
                <div>
                  <label style={labelStyle}>Elige tu emoji</label>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {EMOJIS.map(e => (
                      <button
                        key={e} type="button"
                        onClick={() => setFormEmoji(e)}
                        style={{
                          fontSize: '1.6rem', background: formEmoji === e ? 'rgba(255,69,0,0.15)' : 'rgba(255,255,255,0.04)',
                          border: formEmoji === e ? '1px solid rgba(255,69,0,0.4)' : '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '10px', padding: '0.3rem 0.45rem', cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label style={labelStyle}>Tu nombre</label>
                  <input
                    required value={formName} onChange={e => setFormName(e.target.value)}
                    placeholder="ej. Carlos M."
                    style={inputStyle}
                  />
                </div>

                {/* Rating */}
                <div>
                  <label style={labelStyle}>Calificación</label>
                  <FlameRating value={formRating} onChange={setFormRating} />
                </div>

                {/* Text */}
                <div>
                  <label style={labelStyle}>¿Qué te pareció?</label>
                  <textarea
                    required value={formText} onChange={e => setFormText(e.target.value)}
                    rows={3} placeholder="¡Cuéntanos tu experiencia con las alitas! 🍗"
                    style={{ ...inputStyle, resize: 'vertical' as const, lineHeight: 1.6 }}
                  />
                </div>

                {/* Photo Upload */}
                <div>
                  <label style={labelStyle}>📷 Agrega una foto (opcional)</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    style={{ display: 'none' }}
                  />

                  {formPhoto ? (
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <img
                        src={formPhoto}
                        alt="Preview"
                        style={{
                          width: '100%', maxHeight: '200px',
                          objectFit: 'cover', borderRadius: '12px',
                          border: '1px solid rgba(255,69,0,0.3)',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setFormPhoto(null)}
                        style={{
                          position: 'absolute', top: '8px', right: '8px',
                          background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: '50%', width: '28px', height: '28px',
                          color: '#fff', fontSize: '0.8rem', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,69,0,0.4)';
                        (e.currentTarget as HTMLElement).style.background = 'rgba(255,69,0,0.06)';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)';
                        (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
                      }}
                      style={{
                        width: '100%',
                        padding: '1.25rem',
                        background: 'rgba(255,255,255,0.03)',
                        border: '2px dashed rgba(255,255,255,0.12)',
                        borderRadius: '14px',
                        color: '#666',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.85rem',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <span style={{ fontSize: '1.8rem', opacity: 0.6 }}>📸</span>
                      <span>Toca para subir una foto</span>
                      <span style={{ fontSize: '0.72rem', color: '#444' }}>JPG, PNG — máx. 2MB</span>
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 30px rgba(255,69,0,0.45)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(255,69,0,0.3)';
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #FF4500, #FF6500)',
                    border: 'none', borderRadius: '12px',
                    padding: '0.85rem', color: '#fff',
                    fontWeight: 800, fontSize: '1rem', cursor: 'pointer',
                    boxShadow: '0 4px 20px rgba(255,69,0,0.3)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  🔥 Publicar reseña
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </section>
  );
}

/* ── Shared input styles ──────────────────────────────────────────────────── */
const labelStyle: React.CSSProperties = {
  fontSize: '0.75rem', color: '#555', fontWeight: 600,
  textTransform: 'uppercase', letterSpacing: '0.08em',
  display: 'block', marginBottom: '0.5rem',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.7rem 1rem',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: '12px', color: '#fff', fontSize: '0.9rem',
  outline: 'none', fontFamily: 'inherit',
};
