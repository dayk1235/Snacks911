// Importamos los componentes necesarios
import { motion } from 'framer-motion';
import { Card, CardGroup } from '../components/Card';

// Definimos la función que renderiza la página
export default function Page() {
  return (
    <div>
      {/* Agregamos el título */}
      <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>
        DESIGN SKILL
      </h1>

      {/* Agregamos las tarjetas flotantes */}
      <CardGroup>
        {[
          {
            id: 1,
            title: 'Alitas',
            description: 'Disfruta de nuestros platos favoritos'
          },
          {
            id: 2,
            title: 'Boneless',
            description: 'Nuestros platos más populares'
          },
          {
            id: 3,
            title: 'Papas',
            description: 'La mejor opción para tus papas favoritas'
          }
        ].map((card) => (
          <motion.div
            key={card.id}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{
              duration: 0.5,
              ease: 'easeInOut'
            }}
          >
            <Card title={card.title} description={card.description} />
          </motion.div>
        ))}
      </CardGroup>
    </div>
  );
}
