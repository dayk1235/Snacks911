'use client';

import { motion } from 'framer-motion';

const REVIEWS = [
  { text: "10/10", author: "Carlos M.", emoji: "🔥" },
  { text: "Llegó caliente", author: "Ana P.", emoji: "🛵" },
  { text: "Volveré a pedir", author: "Luis R.", emoji: "😋" }
];

export default function QuickReviews() {
  return (
    <section className="py-20 px-6 bg-black">
      <div className="max-w-[1400px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {REVIEWS.map((review, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.2 }}
              viewport={{ once: true }}
              className="flex flex-col items-center text-center gap-4"
            >
              <span className="text-4xl">{review.emoji}</span>
              <h3 className="text-[2.5rem] font-black uppercase tracking-tighter text-white leading-none">
                "{review.text}"
              </h3>
              <p className="text-white/30 text-[0.7rem] uppercase tracking-[0.3em] font-black">
                {review.author} — CLIENTE VERIFICADO
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
