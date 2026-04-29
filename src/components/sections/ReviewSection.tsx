'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '../ui/Button';
import gsap from 'gsap';

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
  { id: 'r1', name: 'Carlos M.',  emoji: '😤', rating: 5, text: 'Las alitas BBQ son un pecado, no puedo dejar de pedirlas. Entrega súper rápida y bien calientes 🔥', date: '2026-04-07', reaction: '🔥', photoUrl: '/images/alitas.webp' },
  { id: 'r2', name: 'Valeria R.', emoji: '🤩', rating: 5, text: 'El Combo 911 me dejó sin palabras. Los boneless mango habanero son otro nivel, picante perfecto.', date: '2026-04-06', reaction: '❤️', photoUrl: '/images/combo.webp' },
  { id: 'r3', name: 'Javier T.',  emoji: '😮', rating: 4, text: 'Super riquísimo todo. Las papas gajo loaded me voló la cabeza. Solo le falta un poco más de salsa.', date: '2026-04-05', reaction: '🔥', photoUrl: '/images/papas.webp' },
  { id: 'r4', name: 'Ana P.',     emoji: '🥵', rating: 5, text: '¡No puedo con esto! Las alitas buffalo me dejaron llorando (de felicidad). Definitivamente lo mejor de la zona.', date: '2026-04-04', reaction: '💯', photoUrl: '/images/alitas.webp' },
  { id: 'r5', name: 'Mike S.',    emoji: '😋', rating: 5, text: 'Pedí por primera vez y ya soy cliente fijo. Atención increíble y la comida llegó perfecto.', date: '2026-04-03', reaction: '❤️', photoUrl: '/images/boneless.webp' },
  { id: 'r6', name: 'Sofía L.',   emoji: '💪', rating: 5, text: 'Lo mejor que le ha pasado a mis noches de Netflix. Antojo resuelto en 30 min.', date: '2026-04-02', reaction: '🔥' },
];

const EMOJIS    = ['😤', '🤩', '😮', '🥵', '😋', '💪', '🔥', '😱'];
const REACTIONS = ['🔥', '❤️', '💯', '😍', '👏'];
const LS_KEY    = 'snacks911_reviews';

function loadReviews(): Review[] {
  if (typeof window === 'undefined') return SEED_REVIEWS;
  try {
    const raw = localStorage.getItem(LS_KEY);
    let reviews = raw ? JSON.parse(raw) : SEED_REVIEWS;
    
    // Data Cleanup: Filter out invalid/junk reviews
    reviews = (reviews as Review[]).filter(r => {
      // Must have a real name
      if (!r.name || r.name.trim().length < 2) return false;
      
      // Must have realistic text (not junk like "jhgf" or "sdfgh")
      const isJunkText = /^[asdfghjkl]+$/i.test(r.text.toLowerCase()) || 
                        /^[qwertyuiop]+$/i.test(r.text.toLowerCase()) ||
                        r.text.length < 5;
      if (isJunkText) return false;

      // Photo must be valid if present
      if (r.photoUrl && (
        r.photoUrl === 'Z' || 
        r.photoUrl.length < 3 || 
        (!r.photoUrl.startsWith('/') && !r.photoUrl.startsWith('data:') && !r.photoUrl.startsWith('http'))
      )) return false;

      return true;
    });

    return reviews.length > 0 ? reviews : SEED_REVIEWS;
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
        zIndex: 99999,
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
      className="card-premium"
      style={{
        padding: '1.6rem',
        display: 'flex', flexDirection: 'column', gap: '0.9rem',
        minWidth: '300px',
        maxWidth: '380px',
        flexShrink: 0,
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
            borderRadius: '12px', overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.08)',
            cursor: 'pointer', position: 'relative',
          }}
        >
          <img
            src={review.photoUrl}
            alt={`Foto de ${review.name}`}
            style={{
              width: '100%', height: '100px',
              maxHeight: '100px',
              objectFit: 'cover', display: 'block',
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
      <p style={{ fontSize: '0.9rem', color: '#bbb', lineHeight: 1.65, margin: 0, fontStyle: 'italic' }}>
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

/* ── Auto-scroll infinite carousel ─────────────────────────────────────── */
function ReviewRail({
  reviews,
  onReact,
  onPhotoClick,
  onCreateReview,
}: {
  reviews: Review[];
  onReact: (id: string, r: string) => void;
  onPhotoClick: (src: string) => void;
  onCreateReview: () => void;
}) {
  const trackRef    = useRef<HTMLDivElement>(null);
  const tweenRef    = useRef<gsap.core.Tween | null>(null);
  const [active, setActive] = useState<string | null>(null);

  // Duplicate cards to create seamless loop
  const doubled = [...reviews, ...reviews];

  const startScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const totalW = track.scrollWidth / 2; // half = one full set
    tweenRef.current = gsap.to(track, {
      x: `-${totalW}px`,
      duration: reviews.length * 5, // ~5s per card
      ease: 'none',
      repeat: -1,
      modifiers: {
        x: gsap.utils.unitize((x: string) => parseFloat(x) % totalW, 'px'),
      },
    });
  }, [reviews.length]);

  useEffect(() => {
    // Small delay so DOM has rendered
    const t = setTimeout(startScroll, 80);
    return () => {
      clearTimeout(t);
      tweenRef.current?.kill();
    };
  }, [startScroll]);

  const pause = () => tweenRef.current?.pause();
  const play  = () => tweenRef.current?.play();

  return (
    <div>
      {/* Controls row */}
      <div style={{
        maxWidth: '1240px', margin: '0 auto',
        padding: '0 1.5rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem',
      }}>
        <div>
          <div style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>Lo que dicen</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Pasa el cursor sobre una reseña para leerla con calma.</div>
        </div>
        <Button
          onClick={onCreateReview}
          variant="primary"
          style={{ borderRadius: '50px', padding: '0.6rem 1.4rem' }}
        >
          ✍️ Dejar mi reseña
        </Button>
      </div>

      {/* Carousel viewport — masks overflow both sides */}
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        {/* Left + right gradient fades */}
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '80px', zIndex: 2, pointerEvents: 'none', background: 'linear-gradient(to right, #080808 0%, transparent 100%)' }} />
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '80px', zIndex: 2, pointerEvents: 'none', background: 'linear-gradient(to left, #080808 0%, transparent 100%)' }} />

        {/* Moving track */}
        <div
          ref={trackRef}
          onMouseEnter={pause}
          onMouseLeave={play}
          style={{
            display: 'flex', gap: '20px',
            padding: '0.75rem 0 1.5rem',
            willChange: 'transform',
            cursor: 'grab',
          }}
        >
          {doubled.map((review, idx) => {
            const isActive = active === `${review.id}-${idx}`;
            return (
              <div
                key={`${review.id}-${idx}`}
                onMouseEnter={e => {
                  setActive(`${review.id}-${idx}`);
                  gsap.to(e.currentTarget, {
                    scale: 1.03, y: -6,
                    duration: 0.3, ease: 'back.out(1.4)',
                  });
                }}
                onMouseLeave={e => {
                  setActive(null);
                  gsap.to(e.currentTarget, {
                    scale: 1, y: 0,
                    duration: 0.3, ease: 'power2.inOut',
                  });
                }}
                className="card-premium"
                style={{
                  background: isActive ? 'rgba(255, 69, 0, 0.08)' : undefined,
                  borderColor: isActive ? 'rgba(255, 69, 0, 0.3)' : undefined,
                  padding: '1.6rem',
                  display: 'flex', flexDirection: 'column', gap: '0.9rem',
                  minWidth: '300px', maxWidth: '360px', flexShrink: 0,
                  transition: 'all 0.3s ease',
                  userSelect: 'none',
                }}
              >
                <ReviewCard
                  review={review}
                  onReact={onReact}
                  onPhotoClick={onPhotoClick}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Review Modal Form ───────────────────────────────────────────────────── */
function ReviewModal({ onClose }: { onClose: () => void }) {
  const [formName,   setFormName]   = useState('');
  const [formEmoji,  setFormEmoji]  = useState('😤');
  const [formRating, setFormRating] = useState(5);
  const [formText,   setFormText]   = useState('');
  const [formPhoto,  setFormPhoto]  = useState<string | null>(null);
  const [submitted,  setSubmitted]  = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cardRef      = useRef<HTMLDivElement>(null);
  const overlayRef   = useRef<HTMLDivElement>(null);

  /* ── Lock body scroll ── */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  /* ── Entrance animation ── */
  useEffect(() => {
    gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'power2.out' });
    gsap.fromTo(cardRef.current,
      { opacity: 0, y: 50, scale: 0.93 },
      { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'back.out(1.5)' }
    );
  }, []);

  const handleClose = () => {
    gsap.to(cardRef.current, { opacity: 0, y: 30, scale: 0.95, duration: 0.22, ease: 'power2.in' });
    gsap.to(overlayRef.current, { opacity: 0, duration: 0.22, delay: 0.08, onComplete: onClose });
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    if (file.size > 2 * 1024 * 1024) { alert('La imagen debe ser menor a 2MB'); return; }
    const reader = new FileReader();
    reader.onload = () => setFormPhoto(reader.result as string);
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
    saveReviews([newReview, ...loadReviews()]);
    setSubmitted(true);
    setTimeout(() => handleClose(), 2800);
  };

  return (
    <div
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) handleClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 99995,
        background: 'rgba(0,0,0,0.88)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'clamp(0.75rem, 3vw, 2rem)',
      }}
    >
      <div
        ref={cardRef}
        onClick={e => e.stopPropagation()}
        className="card-premium"
        style={{
          width: '100%', maxWidth: '560px',
          padding: '2rem',
          maxHeight: '92vh', overflowY: 'auto',
          scrollbarWidth: 'thin',
        }}
      >
        {submitted ? (
          /* ── Success state ── */
          <div style={{
            textAlign: 'center', padding: '4rem 2rem',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem',
          }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%',
              background: 'rgba(255,69,0,0.12)', border: '1px solid rgba(255,69,0,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2.2rem',
            }}>🔥</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: '#fff', letterSpacing: '0.04em' }}>
              ¡GRACIAS!
            </div>
            <div style={{ color: '#555', fontSize: '0.88rem', maxWidth: '260px' }}>
              Tu reseña ya aparece en el carrusel. ¡Nos alegra que lo hayas disfrutado!
            </div>
          </div>
        ) : (
          <>
            {/* ── Header strip ── */}
            <div style={{
              padding: '1.75rem 1.75rem 0',
              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem',
            }}>
              <div>
                <div style={{
                  fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.18em',
                  textTransform: 'uppercase', color: '#FF4500', marginBottom: '0.4rem',
                }}>🌶️ Tu opinión importa</div>
                <h3 style={{
                  margin: 0, fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(1.5rem, 4vw, 2rem)', letterSpacing: '0.04em',
                  color: '#fff', lineHeight: 1,
                }}>
                  DEJA TU<br /><span style={{ color: '#FF4500' }}>RESEÑA</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={handleClose}
                onMouseEnter={e => gsap.to(e.currentTarget, { rotate: 90, scale: 1.1, duration: 0.2 })}
                onMouseLeave={e => gsap.to(e.currentTarget, { rotate: 0, scale: 1, duration: 0.2 })}
                style={{
                  width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0,
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#888', fontSize: '0.95rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >✕</button>
            </div>

            {/* ── Divider ── */}
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '1.25rem 0' }} />

            {/* ── Form body ── */}
            <form onSubmit={handleSubmit} style={{
              padding: '0 1.75rem 1.75rem',
              display: 'flex', flexDirection: 'column', gap: '1.4rem',
            }}>

              {/* Avatar emoji picker */}
              <div>
                <label style={labelStyle}>Elige tu avatar</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {EMOJIS.map(em => (
                    <button
                      key={em} type="button"
                      onClick={() => setFormEmoji(em)}
                      style={{
                        fontSize: '1.5rem', width: '50px', height: '50px',
                        borderRadius: '14px',
                        background: formEmoji === em ? 'rgba(255,69,0,0.14)' : 'rgba(255,255,255,0.04)',
                        border: formEmoji === em ? '2px solid rgba(255,69,0,0.5)' : '1px solid rgba(255,255,255,0.08)',
                        cursor: 'pointer', transition: 'all 0.15s ease',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transform: formEmoji === em ? 'scale(1.1)' : 'scale(1)',
                        boxShadow: formEmoji === em ? '0 4px 16px rgba(255,69,0,0.2)' : 'none',
                      }}
                    >{em}</button>
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
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.85rem 1rem',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '14px',
                }}>
                  <FlameRating value={formRating} onChange={setFormRating} />
                  <span style={{ color: '#444', fontSize: '0.8rem', marginLeft: '0.5rem' }}>
                    {['', 'Meh...', 'Estuvo bien', 'Rico 🤌', 'Muy rico', '¡10/10! 🔥'][formRating]}
                  </span>
                </div>
              </div>

              {/* Text */}
              <div>
                <label style={labelStyle}>¿Qué fue lo mejor?</label>
                <textarea
                  required value={formText} onChange={e => setFormText(e.target.value)}
                  rows={4}
                  placeholder="Cuéntanos — las alitas, la entrega, el sabor... 🍗"
                  style={{ ...inputStyle, resize: 'none', lineHeight: 1.7 }}
                />
                <div style={{ textAlign: 'right', fontSize: '0.7rem', color: '#333', marginTop: '4px' }}>
                  {formText.length}/300
                </div>
              </div>

              {/* Photo upload */}
              <div>
                <label style={labelStyle}>📷 Foto (opcional)</label>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoSelect} style={{ display: 'none' }} />
                {formPhoto ? (
                  <div style={{ position: 'relative', borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                    <img src={formPhoto} alt="Preview" style={{ width: '100%', maxHeight: '100px', objectFit: 'cover', display: 'block' }} />
                    <button
                      type="button" onClick={() => setFormPhoto(null)}
                      style={{
                        position: 'absolute', top: '8px', right: '8px',
                        background: 'rgba(0,0,0,0.75)', border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '50%', width: '30px', height: '30px',
                        color: '#fff', fontSize: '0.8rem', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >✕</button>
                  </div>
                ) : (
                  <button
                    type="button" onClick={() => fileInputRef.current?.click()}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,69,0,0.4)';
                      (e.currentTarget as HTMLElement).style.background   = 'rgba(255,69,0,0.05)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)';
                      (e.currentTarget as HTMLElement).style.background   = 'rgba(255,255,255,0.02)';
                    }}
                    style={{
                      width: '100%', padding: '1.5rem',
                      background: 'rgba(255,255,255,0.02)',
                      border: '2px dashed rgba(255,255,255,0.1)',
                      borderRadius: '14px', color: '#555', cursor: 'pointer',
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', gap: '0.4rem',
                      fontSize: '0.82rem', transition: 'all 0.2s ease',
                    }}
                  >
                    <span style={{ fontSize: '1.6rem', opacity: 0.5 }}>📸</span>
                    <span style={{ fontWeight: 600, color: '#aaa' }}>Toca para subir</span>
                    <span style={{ fontSize: '0.7rem', color: '#333' }}>JPG, PNG — máx. 2MB</span>
                  </button>
                )}
              </div>

              {/* Submit */}
              <Button
                type="submit"
                variant="primary"
                fullWidth
                style={{ padding: '1rem', fontSize: '1.1rem' }}
              >
                PUBLICAR RESEÑA 🔥
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Main ReviewSection ───────────────────────────────────────────────────── */
export default function ReviewSection() {
  const [reviews,    setReviews]    = useState<Review[]>([]);
  const [showModal,  setShowModal]  = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const loaded = loadReviews();
    setReviews(loaded);
    saveReviews(loaded); // Persistent cleanup of any junk data
    setReady(true);
  }, []);

  const handleReact = (id: string, reaction: string) => {
    const updated = reviews.map(r => r.id === id ? { ...r, reaction } : r);
    setReviews(updated);
    saveReviews(updated);
  };

  const handleModalClose = () => {
    setShowModal(false);
    // Reload in case a new review was saved
    setReviews(loadReviews());
  };

  return (
    <section id="reviews" style={{ padding: '5rem 0 4rem', scrollMarginTop: '70px', overflow: 'hidden' }}>
      {/* Lightbox */}
      {lightboxSrc && <PhotoLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}

      {/* Modal */}
      {showModal && <ReviewModal onClose={handleModalClose} />}

      <div style={{ textAlign: 'center', marginBottom: '3rem', padding: '0 1.5rem' }}>
        <span style={{
          fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: '#FF4500',
          fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase',
          display: 'block', marginBottom: '0.75rem',
        }}>
          Lo que dicen nuestros clientes
        </span>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(2rem, 5vw, 4rem)',
          color: '#fff', letterSpacing: '0.04em', margin: '0 0 1rem',
        }}>
          RESEÑAS REALES
        </h2>
        <p style={{ color: '#555', fontSize: '0.9rem', maxWidth: '480px', margin: '0 auto' }}>
          Diseñadas para leerse con calma. Nada se pierde al pasar a la siguiente sección.
        </p>
      </div>

      {ready && reviews.length > 0 && (
        <ReviewRail
          reviews={reviews}
          onReact={handleReact}
          onPhotoClick={src => setLightboxSrc(src)}
          onCreateReview={() => setShowModal(true)}
        />
      )}


      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </section>
  );
}

/* ── Shared styles ─────────────────────────────────────────────────────────── */
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
  boxSizing: 'border-box',
};

const railButtonStyle: React.CSSProperties = {
  width: '44px',
  height: '44px',
  borderRadius: '12px',
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.04)',
  color: '#fff',
  fontSize: '1rem',
  fontWeight: 700,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.2s ease',
};
