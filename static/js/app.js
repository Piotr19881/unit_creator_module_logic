// Klasa do zarządzania modułami na canvas
class ModuleCanvas {    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.scale = 30; // 1m = 30px (oddalony widok)
        this.offsetX = 20;
        this.offsetY = 20;
        this.modules = [];
        this.selectedModule = null;
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        
        this.setupEventListeners();
        this.drawGrid();
    }
      setupEventListeners() {
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        this.canvas.addEventListener('contextmenu', (e) => this.handleRightClick(e));
    }
    
    drawGrid() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Rysuj siatkę (1m x 1m)
        this.ctx.strokeStyle = '#e0e0e0';
        this.ctx.lineWidth = 0.5;
        
        // Linie pionowe
        for (let x = this.offsetX; x < this.canvas.width; x += this.scale) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        // Linie poziome
        for (let y = this.offsetY; y < this.canvas.height; y += this.scale) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
        
        // Osie główne
        this.ctx.strokeStyle = '#b0b0b0';
        this.ctx.lineWidth = 1;
        
        // Oś X
        this.ctx.beginPath();
        this.ctx.moveTo(this.offsetX, 0);
        this.ctx.lineTo(this.offsetX, this.canvas.height);
        this.ctx.stroke();
        
        // Oś Y
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.offsetY);
        this.ctx.lineTo(this.canvas.width, this.offsetY);
        this.ctx.stroke();
    }
      drawModule(module) {
        const x = this.offsetX + (module.x * this.scale);
        const y = this.offsetY + (module.y * this.scale);
        const width = module.width * this.scale;
        const height = module.height * this.scale;
          // Kolor konturu - czarny dla wszystkich modułów
        let strokeColor = '#000000'; // Czarny kontur
        
        // Jeśli moduł jest zaznaczony, użyj kolorowego konturu
        if (this.selectedModule && this.selectedModule.id === module.id) {
            if (this.isDragging && this.checkCollisionLocal(module.x, module.y, module.width, module.height, module.id)) {
                strokeColor = '#ff0000'; // Czerwony dla kolizji
            } else {
                strokeColor = '#ff6600'; // Pomarańczowy dla zaznaczenia
            }
        }
        // Oblicz grubość konturu w pikselach
        const strokeWidthCm = module.stroke_width || 25; // domyślnie 25cm dla domu szkieletowego
        const strokeWidthPx = (strokeWidthCm / 100) * this.scale; // konwersja cm na piksele
        const halfStroke = strokeWidthPx / 2;
        
        // Wymiary całkowite (podane przez użytkownika) - to jest obszar kolizji
        const totalWidth = width;
        const totalHeight = height;
        
        // Wymiary wewnętrzne (pomniejszone o grubość konturu)
        const innerX = x + halfStroke;        const innerY = y + halfStroke;
        const innerWidth = totalWidth - strokeWidthPx;
        const innerHeight = totalHeight - strokeWidthPx;
        
        // Nie rysuj wypełnienia wewnętrznego - pozostaw przezroczyste
        // this.ctx.fillStyle = fillColor + '80'; // Przezroczystość
        // this.ctx.fillRect(innerX, innerY, innerWidth, innerHeight);
          // Rysuj kontur wewnątrz całkowitych wymiarów - czarne ściany
        this.ctx.strokeStyle = strokeColor;
        this.ctx.lineWidth = strokeWidthPx;
        this.ctx.strokeRect(innerX, innerY, innerWidth, innerHeight);
    }
    
    redraw() {
        this.drawGrid();        this.modules.forEach(module => this.drawModule(module));
    }
    
    checkCollisionLocal(x, y, width, height, excludeId = null) {
        return this.modules.some(module => {
            if (excludeId && module.id === excludeId) {
                return false;
            }
            
            // Sprawdź czy prostokąty się nakładają
            return !(x >= module.x + module.width ||
                    x + width <= module.x ||
                    y >= module.y + module.height ||
                    y + height <= module.y);
        });
    }
      addModule(module) {
        // Dodaj moduł bez duplikowania logiki pozycjonowania
        // Pozycja jest już ustalona przez backend
        this.modules.push(module);
        this.redraw();
        return module;
    }
    
    findFreePosition(width, height) {
        // Prosta logika znajdowania wolnego miejsca
        for (let y = 0; y < 10; y++) {
            for (let x = 0; x < 10; x++) {
                if (this.isPositionFree(x, y, width, height)) {
                    return { x, y };
                }
            }
        }
        return { x: 0, y: 0 };
    }
      isPositionFree(x, y, width, height) {
        return !this.checkCollisionLocal(x, y, width, height);
    }
    
    getModuleAt(x, y) {
        const canvasX = (x - this.offsetX) / this.scale;
        const canvasY = (y - this.offsetY) / this.scale;
        
        return this.modules.find(module => {
            return canvasX >= module.x &&
                   canvasX <= module.x + module.width &&
                   canvasY >= module.y &&
                   canvasY <= module.y + module.height;
        });
    }
    
    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const module = this.getModuleAt(x, y);
        if (module) {
            this.selectedModule = module;
            this.isDragging = true;
            this.dragStart = { x, y };
            this.canvas.style.cursor = 'grabbing';
        }
    }
    
    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
          if (this.isDragging && this.selectedModule) {
            const deltaX = (x - this.dragStart.x) / this.scale;
            const deltaY = (y - this.dragStart.y) / this.scale;
            
            const newX = Math.max(0, this.selectedModule.x + deltaX);
            const newY = Math.max(0, this.selectedModule.y + deltaY);
            
            // Sprawdź kolizję przed przeniesieniem
            if (!this.checkCollisionLocal(newX, newY, this.selectedModule.width, this.selectedModule.height, this.selectedModule.id)) {
                this.selectedModule.x = newX;
                this.selectedModule.y = newY;
                this.dragStart = { x, y };
                this.redraw();
            }
        } else {
            // Zmiana kursora
            const module = this.getModuleAt(x, y);
            this.canvas.style.cursor = module ? 'grab' : 'crosshair';
        }
    }
    
    handleMouseUp(e) {
        if (this.isDragging) {
            this.isDragging = false;
            this.canvas.style.cursor = 'crosshair';
        }
    }
      handleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const module = this.getModuleAt(x, y);
        this.selectedModule = module;
        this.redraw();
    }
      handleRightClick(e) {
        e.preventDefault(); // Zapobiega wyświetleniu menu kontekstowego
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const module = this.getModuleAt(x, y);
        console.log('Right click at:', x, y, 'Module found:', module);
        if (module) {
            console.log('Attempting to rotate module:', module.id);
            this.rotateModule(module.id);
        }
    }
      async rotateModule(moduleId) {
        console.log('rotateModule called with ID:', moduleId);
        try {
            const response = await fetch(`/api/modules/${moduleId}/rotate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            console.log('Response status:', response.status);
            
            if (response.ok) {
                const rotatedModule = await response.json();
                console.log('Rotated module received:', rotatedModule);
                
                // Zaktualizuj moduł w lokalnej liście
                const moduleIndex = this.modules.findIndex(m => m.id === moduleId);
                console.log('Module index in canvas:', moduleIndex);
                if (moduleIndex !== -1) {this.modules[moduleIndex] = rotatedModule;
                    this.redraw();
                    
                    // Informuj główną aplikację o zmianie i zsynchronizuj moduły
                    if (window.moduleApp) {
                        // Zsynchronizuj moduły w głównej aplikacji
                        const appModuleIndex = window.moduleApp.modules.findIndex(m => m.id === moduleId);
                        if (appModuleIndex !== -1) {
                            window.moduleApp.modules[appModuleIndex] = rotatedModule;
                        }
                        
                        window.moduleApp.updateModulesList();
                        window.moduleApp.updateStats();
                        window.moduleApp.showMessage('Moduł został obrócony o 90°', 'success');
                    }
                }
            } else {
                const error = await response.json();
                if (window.moduleApp) {
                    window.moduleApp.showMessage(error.error || 'Błąd podczas obrotu modułu', 'error');
                }
            }
        } catch (error) {
            console.error('Error rotating module:', error);
            if (window.moduleApp) {
                window.moduleApp.showMessage('Błąd połączenia z serwerem', 'error');
            }
        }
    }
    
    clearModules() {
        this.modules = [];
        this.selectedModule = null;
        this.redraw();
    }
    
    resetView() {
        this.scale = 30;
        this.redraw();
        document.getElementById('scaleValue').textContent = this.scale;
    }
    
    zoomIn() {
        if (this.scale < 80) {
            this.scale += 10;
            this.redraw();
            document.getElementById('scaleValue').textContent = this.scale;
        }
    }
    
    zoomOut() {
        if (this.scale > 20) {
            this.scale -= 10;
            this.redraw();
            document.getElementById('scaleValue').textContent = this.scale;
        }
    }
}

// Klasa głównej aplikacji
class ModularHouseApp {
    constructor() {
        this.canvas = new ModuleCanvas('moduleCanvas');
        this.modules = [];
        
        // Ustaw globalną referencję dla dostępu z canvas
        window.moduleApp = this;
        
        this.setupEventListeners();
        this.loadModules();
    }
    
    setupEventListeners() {
        // Formularz dodawania modułu
        document.getElementById('moduleForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addModule();
        });
        
        // Przycisk czyszczenia
        document.getElementById('clearModules').addEventListener('click', () => {
            this.clearModules();
        });
          // Reset widoku
        document.getElementById('resetView').addEventListener('click', () => {
            this.canvas.resetView();
        });
        
        // Zoom in
        document.getElementById('zoomIn').addEventListener('click', () => {
            this.canvas.zoomIn();
        });
        
        // Zoom out
        document.getElementById('zoomOut').addEventListener('click', () => {
            this.canvas.zoomOut();
        });
        
        // Walidacja w czasie rzeczywistym
        document.getElementById('moduleWidth').addEventListener('input', () => {
            this.validateDimensions();
        });
        
        document.getElementById('moduleHeight').addEventListener('input', () => {
            this.validateDimensions();
        });
    }
    
    async addModule() {
        const formData = {
            name: document.getElementById('moduleName').value || 'Nowy moduł',
            width: parseFloat(document.getElementById('moduleWidth').value),
            height: parseFloat(document.getElementById('moduleHeight').value),
            type: document.getElementById('moduleType').value
        };
        
        // Walidacja po stronie klienta
        if (!this.validateModuleData(formData)) {
            return;
        }
        
        try {
            const response = await fetch('/api/modules', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });
            
            if (response.ok) {
                const module = await response.json();
                this.modules.push(module);
                this.canvas.addModule(module);
                this.updateModulesList();
                this.updateStats();
                this.clearForm();
                this.showMessage('Moduł został dodany pomyślnie!', 'success');
            } else {
                const error = await response.json();
                this.showMessage(error.error || 'Błąd podczas dodawania modułu', 'error');
            }
        } catch (error) {
            this.showMessage('Błąd połączenia z serwerem', 'error');
            console.error('Error:', error);
        }
    }
    
    validateModuleData(data) {
        if (isNaN(data.width) || isNaN(data.height)) {
            this.showMessage('Wprowadź prawidłowe wymiary', 'error');
            return false;
        }
        
        if (data.width < 2 || data.width > 4.5) {
            this.showMessage('Szerokość musi być w zakresie 2.0 - 4.5 m', 'error');
            return false;
        }
        
        if (data.height < 3 || data.height > 13.5) {
            this.showMessage('Długość musi być w zakresie 3.0 - 13.5 m', 'error');
            return false;
        }
        
        return true;
    }
    
    validateDimensions() {
        const width = parseFloat(document.getElementById('moduleWidth').value);
        const height = parseFloat(document.getElementById('moduleHeight').value);
        
        const widthValid = !isNaN(width) && width >= 2 && width <= 4.5;
        const heightValid = !isNaN(height) && height >= 3 && height <= 13.5;
        
        // Wizualne oznaczenie poprawności
        document.getElementById('moduleWidth').style.borderColor = 
            isNaN(width) ? '#e2e8f0' : (widthValid ? '#48bb78' : '#e53e3e');
        document.getElementById('moduleHeight').style.borderColor = 
            isNaN(height) ? '#e2e8f0' : (heightValid ? '#48bb78' : '#e53e3e');
    }
    
    async clearModules() {
        if (this.modules.length === 0) {
            this.showMessage('Brak modułów do usunięcia', 'info');
            return;
        }
        
        if (!confirm('Czy na pewno chcesz usunąć wszystkie moduły?')) {
            return;
        }
        
        try {
            const response = await fetch('/api/modules/clear', {
                method: 'DELETE'
            });
            
            if (response.ok) {
                this.modules = [];
                this.canvas.clearModules();
                this.updateModulesList();
                this.updateStats();
                this.showMessage('Wszystkie moduły zostały usunięte', 'success');
            } else {
                this.showMessage('Błąd podczas usuwania modułów', 'error');
            }
        } catch (error) {
            this.showMessage('Błąd połączenia z serwerem', 'error');
            console.error('Error:', error);
        }
    }
    
    async loadModules() {
        try {
            const response = await fetch('/api/modules');
            if (response.ok) {
                this.modules = await response.json();
                this.modules.forEach(module => this.canvas.addModule(module));
                this.updateModulesList();
                this.updateStats();
            }
        } catch (error) {
            console.error('Error loading modules:', error);
        }
    }
    
    updateModulesList() {
        const modulesList = document.getElementById('modulesList');
        
        if (this.modules.length === 0) {
            modulesList.innerHTML = '<p class="empty-message">Brak modułów. Dodaj pierwszy moduł powyżej.</p>';
            return;
        }
          modulesList.innerHTML = this.modules.map(module => {
            const strokeWidthM = (module.stroke_width || 25) / 100; // grubość w metrach
            const usableWidth = (module.width - strokeWidthM).toFixed(2);
            const usableHeight = (module.height - strokeWidthM).toFixed(2);
            const usableArea = (usableWidth * usableHeight).toFixed(1);
            
            return `
                <div class="module-item">
                    <h4>${module.name}</h4>
                    <div class="details">
                        Całkowite: ${module.width}m × ${module.height}m
                        <br>Użyteczne: ${usableWidth}m × ${usableHeight}m (${usableArea}m²)
                        <br>Typ: ${this.getTypeLabel(module.type)}
                    </div>
                </div>
            `;
        }).join('');
    }
      getTypeLabel(type) {
        const labels = {
            'dom_szkieletowy': 'Dom szkieletowy (25cm)',
            'pawilon_inne': 'Pawilon i inne (12cm)',
            'standard': 'Standardowy',
            'corner': 'Narożny',
            'entrance': 'Wejściowy'
        };
        return labels[type] || type;
    }
      updateStats() {
        document.getElementById('moduleCount').textContent = this.modules.length;
        
        const totalUsableArea = this.modules.reduce((sum, module) => {
            const strokeWidthM = (module.stroke_width || 25) / 100;
            const usableWidth = module.width - strokeWidthM;
            const usableHeight = module.height - strokeWidthM;
            return sum + (usableWidth * usableHeight);
        }, 0);
        
        document.getElementById('totalArea').textContent = totalUsableArea.toFixed(1) + ' m² (użyteczne)';
    }
    
    clearForm() {
        document.getElementById('moduleForm').reset();
        this.validateDimensions();
    }
    
    showMessage(message, type = 'info') {
        const messageContainer = document.getElementById('messageContainer');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;
        
        messageContainer.appendChild(messageDiv);
        
        // Automatyczne usunięcie po 5 sekundach
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }
}

// Inicjalizacja aplikacji po załadowaniu DOM
document.addEventListener('DOMContentLoaded', () => {
    new ModularHouseApp();
});
