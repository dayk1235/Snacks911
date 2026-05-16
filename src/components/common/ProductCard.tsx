'use client';

import Image from 'next/image';
import { memo, useState } from 'react';
import { motion } from 'framer-motion';
import type { Product } from '@/data/products';
import { getProductImage } from '@/data/products';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  onCustomize?: (product: Product) => void;
}

function ProductCardComponent({ product, onAddToCart, onCustomize }: ProductCardProps) {
  const [added, setAdded] = useState(false);
  
  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (added) return;
    onAddToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const isPopular = product.popular || product.badges?.some(b => 
    typeof b === 'string' && (b.includes('Más pedido') || b.includes('Top Seller'))
  );

  return (
    <div 
      className="glass product-card group p-5 cursor-pointer"
      onClick={() => onCustomize?.(product)}
    >
      {isPopular && (
        <span className="badge-popular absolute top-[15px] left-[15px] bg-[var(--bg)] border border-[var(--accent)] text-[var(--accent)] px-3 py-1 rounded-lg text-[0.7rem] font-black z-[5] uppercase">
          🔥 POPULAR
        </span>
      )}
      
      {product.category === 'combos' && (
        <span className="hot-badge absolute top-[15px] right-[15px] bg-[var(--accent)] text-[var(--bg)] px-2.5 py-1 rounded text-[0.65rem] font-black z-[5] shadow-[0_0_15px_var(--accent)]">
          HOT
        </span>
      )}

      <div className="img-wrap overflow-hidden rounded-[20px] mb-5 relative">
        <div className="relative aspect-square">
          <Image
            src={getProductImage(product)}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, 33vw"
            className="object-cover transition-transform duration-[800ms] ease-[cubic-bezier(0.2,1,0.3,1)] group-hover:scale-125"
          />
        </div>
      </div>

      <h4 className="text-base font-black mb-1.5 text-[var(--fg)]">{product.name}</h4>
      <p className="text-[var(--muted)] text-[0.8rem] mb-4 line-clamp-2 leading-relaxed">
        {product.description}
      </p>

      <div className="flex justify-between items-center mt-auto">
        <span className="price font-mono font-black text-[var(--accent)] text-xl tracking-tight">
          ${product.price.toFixed(2)}
        </span>
        <motion.button
          className={`btn ${added ? 'btn-ghost' : 'btn-primary'} btn-sm`}
          onClick={handleAdd}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 500, damping: 25, mass: 0.6 }}
        >
          {added ? '✓ AÑADIDO' : '+ RESCUE'}
        </motion.button>
      </div>

      <style jsx>{`
        .product-card {
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s ease;
        }
        .product-card:hover {
          transform: translateY(-6px) scale(1.03);
        }
      `}</style>
    </div>
  );
}

const ProductCard = memo(ProductCardComponent);
export default ProductCard;
