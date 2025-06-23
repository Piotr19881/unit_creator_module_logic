from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import json

app = Flask(__name__)
CORS(app)

class ModuleLogic:
    def __init__(self):
        self.modules = []
        self.connections = []
    
    def validate_dimensions(self, width, height):
        """Sprawdza czy wymiary mieszczą się w dozwolonym zakresie"""
        min_width, max_width = 2.0, 4.5
        min_height, max_height = 3.0, 13.5
        return (min_width <= width <= max_width and 
                min_height <= height <= max_height)
    
    def check_collision(self, x, y, width, height, exclude_id=None):
        """Sprawdza czy nowy moduł koliduje z istniejącymi"""
        for module in self.modules:
            if exclude_id and module['id'] == exclude_id:
                continue
                
            # Sprawdź czy prostokąty się nakładają
            if not (x >= module['x'] + module['width'] or
                   x + width <= module['x'] or
                   y >= module['y'] + module['height'] or
                   y + height <= module['y']):
                return True, f"Kolizja z modułem {module['name']}"
        return False, ""
    
    def find_free_position(self, width, height):
        """Znajduje wolne miejsce dla nowego modułu (w metrach)"""
        start_x, start_y = 0.5, 0.5  # Pozycje w metrach
        step = 0.5  # Krok 0.5 metra
        
        for y in range(int(start_y * 2), 40, int(step * 2)):  # Do 20 metrów
            for x in range(int(start_x * 2), 40, int(step * 2)):  # Do 20 metrów
                actual_x = x / 2.0  # Konwersja z powrotem do metrów
                actual_y = y / 2.0
                collision, _ = self.check_collision(actual_x, actual_y, width, height)
                if not collision:
                    return actual_x, actual_y
        
        return start_x, start_y
    
    def add_module(self, module_data):
        """Dodaje nowy moduł"""
        width = module_data['width']
        height = module_data['height']
        module_type = module_data.get('type', 'dom_szkieletowy')
        
        if not self.validate_dimensions(width, height):
            return False, "Wymiary poza dozwolonym zakresem"
        
        x, y = self.find_free_position(width, height)
        
        module_id = len(self.modules) + 1
        module = {
            'id': module_id,
            'width': width,
            'height': height,
            'x': x,
            'y': y,
            'name': module_data.get('name', f'Moduł {module_id}'),
            'type': module_type,
            'stroke_width': 25 if module_type == 'dom_szkieletowy' else 12,  # grubość konturu w cm
            'rotation': 0  # obrót w stopniach (0, 90, 180, 270)
        }
        
        self.modules.append(module)
        return True, module
    
    def get_modules(self):
        """Zwraca listę wszystkich modułów"""
        return self.modules
    
    def clear_modules(self):
        """Czyści wszystkie moduły"""
        self.modules = []
        self.connections = []
    
    def rotate_module(self, module_id):
        """Obraca moduł o 90 stopni"""
        print(f"DEBUG: Próba obrotu modułu ID: {module_id}")
        
        for module in self.modules:
            if module['id'] == module_id:
                print(f"DEBUG: Znaleziono moduł {module_id}: x={module['x']}, y={module['y']}, w={module['width']}, h={module['height']}")
                
                # Obrót o 90 stopni - zamiana wymiarów
                old_width = module['width']
                old_height = module['height']
                old_x = module['x']
                old_y = module['y']
                  # Oblicz nową pozycję tak, żeby środek modułu pozostał w tym samym miejscu
                center_x = old_x + old_width / 2
                center_y = old_y + old_height / 2
                
                new_x = center_x - old_height / 2  # nowa szerokość to stara wysokość
                new_y = center_y - old_width / 2   # nowa wysokość to stara szerokość
                
                print(f"DEBUG: Po obrocie: new_x={new_x}, new_y={new_y}, new_w={old_height}, new_h={old_width}")
                
                # Sprawdź czy moduł nie wyjdzie poza granice obszaru roboczego
                max_area_width = 20  # 20 metrów
                max_area_height = 20  # 20 metrów
                
                # Dostosuj pozycję jeśli wychodzi poza obszar
                if new_x < 0:
                    new_x = 0
                if new_y < 0:
                    new_y = 0
                if (new_x + old_height) > max_area_width:
                    new_x = max_area_width - old_height
                if (new_y + old_width) > max_area_height:
                    new_y = max_area_height - old_width
                
                # Sprawdź czy po dostosowaniu pozycji moduł nadal mieści się w obszarze
                if new_x < 0 or new_y < 0 or (new_x + old_height) > max_area_width or (new_y + old_width) > max_area_height:
                    print(f"DEBUG: Moduł jest za duży po obrocie: new_x={new_x}, new_y={new_y}, right_edge={new_x + old_height}, bottom_edge={new_y + old_width}")
                    return False, "Nie można obrócić modułu: nie mieści się w obszarze roboczym"
                
                # Sprawdź czy po obrocie moduł zmieści się w nowej pozycji (kolizje z innymi modułami)
                collision, collision_msg = self.check_collision(
                    new_x, new_y, old_height, old_width, module_id
                )
                
                if collision:
                    print(f"DEBUG: Kolizja po obrocie: {collision_msg}")
                    return False, f"Nie można obrócić modułu: {collision_msg}"
                
                print(f"DEBUG: Obrót możliwy, wykonuję zmianę")
                
                # Wykonaj obrót
                module['width'] = old_height
                module['height'] = old_width
                module['x'] = new_x
                module['y'] = new_y
                module['rotation'] = (module.get('rotation', 0) + 90) % 360
                
                print(f"DEBUG: Moduł po obrocie: {module}")
                return True, module
        
        print(f"DEBUG: Moduł {module_id} nie znaleziony")
        return False, "Moduł nie znaleziony"

# Globalna instancja logiki modułów
module_logic = ModuleLogic()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/modules', methods=['GET'])
def get_modules():
    """API endpoint do pobierania listy modułów"""
    return jsonify(module_logic.get_modules())

@app.route('/api/modules', methods=['POST'])
def add_module():
    """API endpoint do dodawania nowego modułu"""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'Brak danych'}), 400
    
    try:
        success, result = module_logic.add_module(data)
        if success:
            return jsonify(result), 201
        else:
            return jsonify({'error': result}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/modules/clear', methods=['DELETE'])
def clear_modules():
    """API endpoint do usuwania wszystkich modułów"""
    module_logic.clear_modules()
    return jsonify({'message': 'Wszystkie moduły zostały usunięte'}), 200

@app.route('/api/modules/<int:module_id>/rotate', methods=['POST'])
def rotate_module(module_id):
    """API endpoint do obrotu modułu o 90 stopni"""
    try:
        success, result = module_logic.rotate_module(module_id)
        if success:
            return jsonify(result), 200
        else:
            return jsonify({'error': result}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/validate', methods=['POST'])
def validate_dimensions():
    """API endpoint do walidacji wymiarów"""
    data = request.get_json()
    
    if not data or 'width' not in data or 'height' not in data:
        return jsonify({'error': 'Brak wymaganych wymiarów'}), 400
    
    try:
        width = float(data['width'])
        height = float(data['height'])
        is_valid = module_logic.validate_dimensions(width, height)
        
        return jsonify({
            'valid': is_valid,
            'width': width,
            'height': height,
            'message': 'Wymiary poprawne' if is_valid else 'Wymiary poza dozwolonym zakresem (2-4,5m x 3-13,5m)'
        })
    except ValueError:
        return jsonify({'error': 'Niepoprawny format wymiarów'}), 400

@app.route('/api/check-collision', methods=['POST'])
def check_collision():
    """API endpoint do sprawdzania kolizji"""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'Brak danych'}), 400
    
    try:
        x = float(data['x'])
        y = float(data['y'])
        width = float(data['width'])
        height = float(data['height'])
        exclude_id = data.get('exclude_id')
        
        collision, message = module_logic.check_collision(x, y, width, height, exclude_id)
        
        return jsonify({
            'collision': collision,
            'message': message
        })
    except (ValueError, KeyError) as e:
        return jsonify({'error': 'Niepoprawne dane wejściowe'}), 400

if __name__ == '__main__':
    app.run(debug=True)
