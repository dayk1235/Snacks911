'use client';

import Image from 'next/image';
import { memo, useRef, useState } from 'react';
import { PremiumButton, GlassCard } from '../ui/DesignSystem';
import type { Product } from '@/data/products';
import { products, getProductImage } from '@/data/products';
import { Flame, Star, TrendingUp, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  onCustomize?: (product: Product) => void;
}

const EMOTION_LABELS: Record<string, string[]> = {
  proteina: ['Jugosas y Crujientes', 'Sabor Explosivo'],
  papas: ['Crujientes al punto', 'El dip perfecto'],
  combos: ['🚨 El más completo', 'Ahorro garantizado'],
};

function ProductCardComponent({ product, onAddToCart, onCustomize }: ProductCardProps) {
  const [added, setAdded] = useState(false);
  const [hovered, setHovered] = useState(false);
  
  const isCombo = product.category === 'combos';
  const emotionLabel = EMOTION_LABELS[product.category]?.[0] ?? '';

  const handleAdd = () => {
    if (added) return;
    if (onCustomize) {
      onCustomize(product);
      return;
    }
    onAddToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const isBestSeller = product.popular || product.badges?.some(b => 
    typeof b === 'string' && (b.includes('Más pedido') || b.includes('Top Seller'))
  );
  
  const savings = product.originalPrice ? product.originalPrice - product.price : 0;

  return (
    <GlassCard className={cn(
      "group relative flex flex-col h-full",
      isCombo && "border-accent/30 bg-accent/5"
    )}>
      {/* Badge Overlay */}
      <AnimatePresence>
        {(isBestSeller || savings > 0) && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="absolute top-3 left-3 z-20 flex flex-col gap-2"
          >
            {isBestSeller && (
              <div className="flex items-center gap-1 bg-accent-gold px-2 py-1 rounded-full text-[10px] font-black text-black uppercase tracking-tighter">
                <Star size={10} fill="currentColor" /> Popular
              </div>
            )}
            {savings > 0 && (
              <div className="bg-status-success px-2 py-1 rounded-full text-[10px] font-black text-white uppercase tracking-tighter">
                Ahorra ${savings}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Container */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={getProductImage(product)}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 50vw, 33vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-bg-deep via-transparent to-transparent opacity-80" />
        
        {/* Spicy Indicator */}
        {product.spicy !== undefined && product.spicy > 0 && (
          <div className="absolute bottom-3 right-3 flex gap-1 px-2 py-1 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
            {Array.from({ length: 3 }).map((_, i) => (
              <Flame 
                key={i} 
                size={12} 
                className={i < (product.spicy || 0) ? "text-accent fill-accent" : "text-white/20"} 
              />
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1 gap-1">
        <div className="flex justify-between items-start">
          <h3 className="font-display text-xl leading-none text-white group-hover:text-accent transition-colors">
            {product.name}
          </h3>
          <span className="text-accent font-black text-lg font-display tracking-tight">
            ${product.price}
          </span>
        </div>
        
        <p className="text-xs text-foreground-muted line-clamp-2 leading-relaxed h-8">
          {product.description}
        </p>

        {/* Emotion Label */}
        <div className="mt-auto pt-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-accent/80 uppercase tracking-widest">
            <TrendingUp size={12} /> {emotionLabel}
          </div>
          
          <PremiumButton 
            onClick={handleAdd}
            className="h-10 w-10 !p-0 rounded-full"
            variant={added ? 'glass' : 'primary'}
          >
            {added ? '✓' : <Plus size={20} />}
          </PremiumButton>
        </div>
      </div>
    </GlassCard>
  );
}

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

const ProductCard = memo(ProductCardComponent);

export default ProductCard;
