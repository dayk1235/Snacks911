import json
from pathlib import Path
from graphify.build import build_from_json
from graphify.cluster import cluster, score_all
from graphify.export import to_json

def main():
    # 1. Cargar AST original
    ast = json.loads(Path('graphify-out/.graphify_ast.json').read_text())
    
    # 2. Crear Semántico basado en nuestros hallazgos "Deep"
    sem_nodes = [
        {"id": "concept_self_healing", "label": "Sistema de Auto-Recuperación", "type": "concept", "source_file": "src/core/selfHealingEngine.ts", "description": "Gestión de salud y modos de emergencia"},
        {"id": "concept_sales_psychology", "label": "Psicología de Ventas", "type": "concept", "source_file": "src/core/antojo.ts", "description": "Estrategias de Antojo, FOMO y Anclaje"},
        {"id": "concept_safety_layer", "label": "Capa de Seguridad Blindada", "type": "concept", "source_file": "src/core/allergyFilter.ts", "description": "Validación estricta de alergias y restricciones"}
    ]
    
    sem_edges = [
        {"source": "src_core_selfhealingengine_ts", "target": "concept_self_healing", "relation": "implements"},
        {"source": "concept_self_healing", "target": "src_core_botengine_ts", "relation": "protects"},
        {"source": "src_core_antojo_ts", "target": "concept_sales_psychology", "relation": "defines"},
        {"source": "src_core_salesthermostat_ts", "target": "concept_sales_psychology", "relation": "modulates"},
        {"source": "concept_sales_psychology", "target": "src_core_responseengine_ts", "relation": "drives"},
        {"source": "src_core_allergyfilter_ts", "target": "concept_safety_layer", "relation": "defines"},
        {"source": "concept_safety_layer", "target": "src_core_botengine_ts", "relation": "sanitizes"}
    ]
    
    # 3. Fusionar
    seen = {n['id'] for n in ast['nodes']}
    merged_nodes = list(ast['nodes'])
    for n in sem_nodes:
        if n['id'] not in seen:
            merged_nodes.append(n)
            seen.add(n['id'])
            
    merged_edges = ast['edges'] + sem_edges
    merged = {
        'nodes': merged_nodes,
        'edges': merged_edges,
        'input_tokens': 0,
        'output_tokens': 0
    }
    
    # 4. Re-generar Grafo y Exportar JSON
    print("Re-calculando comunidades...")
    G = build_from_json(merged)
    communities = cluster(G)
    to_json(G, communities, 'graphify-out/graph.json')
    print("¡JSON actualizado!")

if __name__ == '__main__':
    main()
