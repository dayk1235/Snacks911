import json
import networkx as nx
from pathlib import Path
from graphify.build import build_from_json

def main():
    extraction = json.loads(Path('graphify-out/.graphify_extract.json').read_text())
    G = build_from_json(extraction)
    
    # 1. Definir Origen y Destino
    # Origen: WhatsApp Client / Bot Engine
    # Destino: Finalize Order (donde se genera la URL de venta)
    source = "src_core_botengine_ts"
    target = "core_responseengine_finalizeorder"
    
    if source not in G or target not in G:
        print(f"Buscando IDs alternativos...")
        for node in G.nodes():
            if "botengine" in node.lower(): source = node
            if "finalizeorder" in node.lower(): target = node

    print(f"Trazando ruta de conversión: {source} -> {target}")
    
    try:
        path = nx.shortest_path(G, source, target)
        print("\n[FLUJO DE CONVERSIÓN DETECTADO]")
        for i, node in enumerate(path):
            print(f"{i+1}. {node}")
            if i < len(path) - 1:
                edge_data = G.get_edge_data(path[i], path[i+1])
                print(f"   |-- ({edge_data.get('relation', 'connected')}) -->")
                
        print("\n[ACTORES CLAVE EN ESTA RUTA]")
        # Analizamos los vecinos de los nodos en la ruta para ver qué más influye
        for node in path:
            neighbors = list(G.neighbors(node))
            if "context" in str(neighbors).lower():
                print(f"• {node}: Está fuertemente influenciado por el Contexto del usuario.")
            if "db" in str(neighbors).lower():
                print(f"• {node}: Requiere persistencia en Base de Datos para continuar.")

    except nx.NetworkXNoPath:
        print("\nNo se encontró un camino directo. Esto sugiere que el flujo se rompe o es asíncrono.")

if __name__ == "__main__":
    main()
