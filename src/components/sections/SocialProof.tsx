export default function SocialProof() {
  return (
    <section className="bg-gray-900 text-white py-16">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold mb-2">🔥 Lo que dicen</h2>
        <p className="text-gray-400 mb-12">+1,200 pedidos este mes</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-800 rounded-xl p-6">
            <p className="text-gray-300 mb-4">"Los mejores snacks de la zona, siempre llegan calientitos y ricos."</p>
            <p className="font-semibold text-white">- Ana G.</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-6">
            <p className="text-gray-300 mb-4">"El combo 911 es increíble, vale cada peso. Lo pedimos todas las semanas."</p>
            <p className="font-semibold text-white">- Carlos M.</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-6">
            <p className="text-gray-300 mb-4">"El servicio es súper rápido, pedí a las 8pm y a las 8:30 ya tenía mi comida."</p>
            <p className="font-semibold text-white">- Sofía L.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
