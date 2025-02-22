import json

def ordenar_preguntas_y_evaluaciones(filename):
    # Leer el archivo JSON
    with open(filename, 'r', encoding='utf-8') as file:
        data = json.load(file)
    
    # Inicializar nuevo ID y número de evaluación
    new_id = 1
    new_evaluacion = 1
    
    # Recorrer cada evaluación y asignar un nuevo número
    for evaluacion in data["theme"]:
        evaluacion["evaluacion"] = new_evaluacion
        new_evaluacion += 1
        
        # Reasignar IDs de las preguntas
        for pregunta in evaluacion["preguntas"]:
            pregunta["id"] = new_id
            new_id += 1
    
    # Guardar el contenido modificado en un nuevo archivo
    with open(filename, 'w', encoding='utf-8') as file:
        json.dump(data, file, indent=4, ensure_ascii=False)
    
    print(f"Archivo ordenado guardado como ordenado_{filename}")

# Usar la función
filename = "questionary5.json"  # Cambia esto por la ruta real a tu archivo JSON
ordenar_preguntas_y_evaluaciones(filename)