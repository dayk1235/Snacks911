import json
import networkx as nx
from pathlib import Path
from graphify.build import build_from_json

def main():
    extraction = json.loads(Path('graphify-out/.graphify_extract.json').read_text())
    G = build_from_json(extraction)
    
    # IDs normalizados (lowercase, sin extensiones usualmente en el prefijo)
    # Buscamos nodos que contengan MetaClient y dbSaveOrder
    source_node = None
    target_node = None
    
    for node in G.nodes():
        if "metaclient" in node.lower():
            source_node = node
        if "dbsaveorder" in node.lower():
            target_node = node
            
    if not source_node or not target_node:
        print(f"Error: No se pudo encontrar uno de los nodos.")
        print(f"Source (MetaClient): {source_node}")
        print(f"Target (dbSaveOrder): {target_node}")
        return

    print(f"Calculando ruta desde: {source_node}")
    print(f"Hasta: {target_node}")
    
    try:
        path = nx.shortest_path(G, source_node, target_node)
        print("\n[RUTA ENCONTRADA]")
        for i, node in enumerate(path):
            print(f"{i+1}. {node}")
            if i < len(path) - 1:
                edge_data = G.get_edge_data(path[i], path[i+1])
                print(f"   |-- ({edge_data.get('relation', 'connected')}) -->")
    except nx.NetworkXNoPath:
        print("\nNo existe un camino directo entre estos dos nodos en el grafo estructural.")
        print("Esto podría indicar un desacoplamiento fuerte o que la conexión es indirecta via eventos.")

if __name__ == "__main__":
    main()
