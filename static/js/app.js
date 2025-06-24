// Klasa do zarządzania modułami na canvas
class ModuleCanvas {    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.scale = 50; // 1m = 50px (zwiększona skala dla lepszej precyzji snappingu)
        this.offsetX = 20;
        this.offsetY = 20;
        this.modules = [];
        this.selectedModule = null;
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        this.lastValidPosition = null; // Ostatnia poprawna pozycja (bez kolizji)
          // Parametry snappingu
        this.snapDistance = 40; // 40 pikseli = 0.8m tolerancji wykrywania (zwiększone dla mocniejszego snap)
        this.snapPoints = []; // Punkty przyciągania wszystkich modułów
        this.snapIndicators = []; // Wizualne wskaźniki aktywnego snappingu
        this.isSnapping = false;
        
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
    }    drawModule(module) {
        const x = this.offsetX + module.x * this.scale;
        const y = this.offsetY + module.y * this.scale;
        const widthPx = module.width * this.scale;
        const heightPx = module.height * this.scale;
        
        // Parametry konturu
        const strokeWidthPx = (module.stroke_width / 100) * this.scale;
        const halfStroke = strokeWidthPx / 2;
        const innerX = x + halfStroke;
        const innerY = y + halfStroke;
        const innerWidth = widthPx - strokeWidthPx;
        const innerHeight = heightPx - strokeWidthPx;
        
        // Parametry linii wewnętrznych
        const thinWidth = strokeWidthPx / 5;
        const offset = thinWidth * 2;
        
        // Funkcja pomocnicza - znajdź sąsiada według id
        const findNeighbor = id => this.modules.find(m => m.id === id) || null;
        
        // Rysuj krawędź funkcją wspólną
        const drawEdge = (fromX, fromY, toX, toY, width, color) => {
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = width;
            this.ctx.beginPath();
            this.ctx.moveTo(fromX, fromY);
            this.ctx.lineTo(toX, toY);
            this.ctx.stroke();
        };
        
        // Zakresy modułu
        const left = innerX;
        const right = innerX + innerWidth;
        const top = innerY;
        const bottom = innerY + innerHeight;
        
        // Rysuj cztery krawędzie z podziałem na fragmenty
        ['top','right','bottom','left'].forEach(side => {
            const nid = module.connections[side];
            const neighbor = findNeighbor(nid);
            // pełny zakres tej krawędzi
            let start, end, fx, fy, dx, dy;
            if (side === 'top' || side === 'bottom') {
                fx = left; dy = side === 'top' ? top : bottom;
                dx = side === 'top' ? fx + innerWidth : fx;
                fy = dy;
                start = left; end = right;
                if (neighbor) {
                    const nx = this.offsetX + neighbor.x * this.scale + halfStroke;
                    const nw = neighbor.width * this.scale - strokeWidthPx;
                    const nbStart = nx;
                    const nbEnd = nx + nw;
                    const cStart = Math.max(start, nbStart);
                    const cEnd = Math.min(end, nbEnd);
                    // rysuj zewnętrzne fragmenty
                    if (cStart > start) drawEdge(start, fy, cStart, fy, strokeWidthPx, '#000');
                    if (cEnd < end) drawEdge(cEnd, fy, end, fy, strokeWidthPx, '#000');
                    // rysuj dwie cienkie linie wewnętrzne
                    drawEdge(cStart, fy - offset, cEnd, fy - offset, thinWidth, '#444');
                    drawEdge(cStart, fy + offset, cEnd, fy + offset, thinWidth, '#444');
                } else {
                    drawEdge(start, fy, end, fy, strokeWidthPx, '#000');
                }
            } else {
                fy = top; dx = side === 'right' ? right : left;
                fy = side === 'right' ? top : top;
                fx = dx; dy = bottom;
                start = top; end = bottom;
                if (neighbor) {
                    const ny = this.offsetY + neighbor.y * this.scale + halfStroke;
                    const nh = neighbor.height * this.scale - strokeWidthPx;
                    const nbStart = ny;
                    const nbEnd = ny + nh;
                    const cStart = Math.max(start, nbStart);
                    const cEnd = Math.min(end, nbEnd);
                    // zewnętrzne
                    if (cStart > start) drawEdge(fx, start, fx, cStart, strokeWidthPx, '#000');
                    if (cEnd < end) drawEdge(fx, cEnd, fx, end, strokeWidthPx, '#000');
                    // cienkie
                    drawEdge(fx - offset, cStart, fx - offset, cEnd, thinWidth, '#444');
                    drawEdge(fx + offset, cStart, fx + offset, cEnd, thinWidth, '#444');
                } else {
                    drawEdge(fx, start, fx, end, strokeWidthPx, '#000');
                }
            }
        });
    }

    // 🧲 MECHANIZM SNAPPINGU - FUNKCJE GŁÓWNE
    
    getSnapPoints(module) {
        const x = this.offsetX + (module.x * this.scale);
        const y = this.offsetY + (module.y * this.scale);
        const widthPx = module.width * this.scale;
        const heightPx = module.height * this.scale;
        
        const points = [];
        // 9 punktów na każdym module:
        points.push({ x: x, y: y, type: 'corner', name: 'lewy górny' }); // lewy górny
        points.push({ x: x + widthPx, y: y, type: 'corner', name: 'prawy górny' }); // prawy górny
        points.push({ x: x, y: y + heightPx, type: 'corner', name: 'lewy dolny' }); // lewy dolny
        points.push({ x: x + widthPx, y: y + heightPx, type: 'corner', name: 'prawy dolny' }); // prawy dolny
        points.push({ x: x + widthPx/2, y: y, type: 'edge', name: 'środek góry' }); // środek góry
        points.push({ x: x + widthPx/2, y: y + heightPx, type: 'edge', name: 'środek dołu' }); // środek dołu
        points.push({ x: x, y: y + heightPx/2, type: 'edge', name: 'środek lewa' }); // środek lewa
        points.push({ x: x + widthPx, y: y + heightPx/2, type: 'edge', name: 'środek prawa' }); // środek prawa
        points.push({ x: x + widthPx/2, y: y + heightPx/2, type: 'center', name: 'centrum' }); // centrum
        return points;
    }
    
    findNearestSnapPoint(mouseX, mouseY) {
        let closestPoint = null;
        let minDistance = this.snapDistance;
        
        // Przeszukuje wszystkie punkty snap z innych modułów
        for (const snapPoint of this.snapPoints) {
            const distance = Math.sqrt(
                Math.pow(mouseX - snapPoint.x, 2) + 
                Math.pow(mouseY - snapPoint.y, 2)
            );
            
            if (distance < minDistance) {
                minDistance = distance;
                closestPoint = snapPoint;
            }
        }
          return closestPoint;
    }

    // 🎯 ULEPSZONA LOGIKA SNAPPINGU - sprawdza kolizje i różne typy połączeń
    findBestSnapPosition(mouseX, mouseY) {
        let bestSnap = null;
        let minDistance = this.snapDistance;
        
        // Pobierz punkty snap z przeciąganego modułu
        const draggedModulePoints = this.getSnapPoints(this.selectedModule);
        
        // Sprawdź każdy punkt z przeciąganego modułu z każdym punktem docelowym
        for (const dragPoint of draggedModulePoints) {
            for (const targetPoint of this.snapPoints) {
                // Oblicz offset między punktami
                const offsetX = targetPoint.x - dragPoint.x;
                const offsetY = targetPoint.y - dragPoint.y;
                
                // Oblicz nową pozycję modułu (lewy górny róg)
                const newModuleX = this.selectedModule.x + (offsetX / this.scale);
                const newModuleY = this.selectedModule.y + (offsetY / this.scale);
                
                // Sprawdź czy nowa pozycja mieści się w canvas
                const maxX = (this.canvas.width - this.offsetX) / this.scale - this.selectedModule.width;
                const maxY = (this.canvas.height - this.offsetY) / this.scale - this.selectedModule.height;
                
                if (newModuleX < 0 || newModuleY < 0 || newModuleX > maxX || newModuleY > maxY) {
                    continue; // Poza granicami canvas
                }
                
                // Sprawdź czy po snapie nie będzie kolizji
                const hasCollision = this.checkCollisionLocal(
                    newModuleX, newModuleY, 
                    this.selectedModule.width, this.selectedModule.height, 
                    this.selectedModule.id
                );
                
                if (hasCollision) {
                    continue; // Pomij snap powodujący kolizję
                }
                
                // Oblicz odległość kursora myszy od punktu docelowego
                const distance = Math.sqrt(
                    Math.pow(mouseX - targetPoint.x, 2) + 
                    Math.pow(mouseY - targetPoint.y, 2)
                );
                
                // Preferuj połączenia ściana-ściana i narożnik-narożnik
                let priority = distance;
                if (this.isWallToWallConnection(dragPoint, targetPoint)) {
                    priority *= 0.7; // 30% bonusu dla połączeń ściana-ściana
                } else if (this.isCornerToCornerConnection(dragPoint, targetPoint)) {
                    priority *= 0.8; // 20% bonusu dla połączeń narożnik-narożnik
                }
                
                if (priority < minDistance) {
                    minDistance = priority;
                    bestSnap = {
                        targetPoint: targetPoint,
                        dragPoint: dragPoint,
                        newPosition: { x: newModuleX, y: newModuleY },
                        distance: distance,
                        type: this.getConnectionType(dragPoint, targetPoint)
                    };
                }
            }
        }
        
        return bestSnap;
    }
    
    // Sprawdza czy to połączenie ściana-ściana
    isWallToWallConnection(point1, point2) {
        return (point1.type === 'edge' && point2.type === 'edge');
    }
    
    // Sprawdza czy to połączenie narożnik-narożnik  
    isCornerToCornerConnection(point1, point2) {
        return (point1.type === 'corner' && point2.type === 'corner');
    }
    
    // Określa typ połączenia
    getConnectionType(dragPoint, targetPoint) {
        if (this.isWallToWallConnection(dragPoint, targetPoint)) {
            return 'wall-to-wall';
        } else if (this.isCornerToCornerConnection(dragPoint, targetPoint)) {
            return 'corner-to-corner';
        } else if (dragPoint.type === 'center' || targetPoint.type === 'center') {
            return 'center-snap';
        } else {
            return 'mixed';
        }
    }
    
    updateSnapPoints() {
        this.snapPoints = [];
        
        this.modules.forEach(module => {
            if (!this.selectedModule || module.id !== this.selectedModule.id) {
                // Dodaj punkty snap ze wszystkich modułów OPRÓCZ przeciąganego
                const moduleSnapPoints = this.getSnapPoints(module);
                this.snapPoints.push(...moduleSnapPoints);
            }
        });
    }
    
    drawSnapIndicators() {
        this.snapIndicators.forEach(indicator => {
            this.ctx.save();
            
            // Czerwony krzyżyk z okręgiem
            this.ctx.strokeStyle = '#FF3333';
            this.ctx.lineWidth = 3;
            
            // Krzyżyk (12px x 12px)
            this.ctx.beginPath();
            this.ctx.moveTo(indicator.x - 6, indicator.y);
            this.ctx.lineTo(indicator.x + 6, indicator.y);
            this.ctx.moveTo(indicator.x, indicator.y - 6);
            this.ctx.lineTo(indicator.x, indicator.y + 6);
            this.ctx.stroke();
            
            // Okrąg (promień 8px)
            this.ctx.beginPath();
            this.ctx.arc(indicator.x, indicator.y, 8, 0, 2 * Math.PI);
            this.ctx.stroke();
              // Tekst pokazujący typ połączenia
            this.ctx.fillStyle = '#FF3333';
            this.ctx.font = 'bold 12px Arial';
            this.ctx.textAlign = 'center';
            
            let snapText = 'SNAP!';
            if (window.moduleApp && window.moduleApp.lastSnapInfo) {
                const type = window.moduleApp.lastSnapInfo.type;
                const typeTexts = {
                    'wall-to-wall': 'ŚCIANA→ŚCIANA',
                    'corner-to-corner': 'NAROŻNIK→NAROŻNIK',
                    'center-snap': 'CENTROWANIE',
                    'mixed': 'SNAP!'
                };
                snapText = typeTexts[type] || 'SNAP!';
            }
            
            this.ctx.fillText(snapText, indicator.x, indicator.y - 15);
            
            this.ctx.restore();
        });
        
        // Rysuj wszystkie dostępne punkty snap podczas przeciągania
        if (this.isDragging && this.selectedModule) {
            this.snapPoints.forEach(point => {
                this.ctx.save();
                this.ctx.fillStyle = '#FFA500';
                this.ctx.beginPath();
                this.ctx.arc(point.x, point.y, 3, 0, 2 * Math.PI);
                this.ctx.fill();
                this.ctx.restore();
            });
        }
    }
      drawEdges() {
       const scale = this.scale;
       // Helper do rysowania pojedynczych linii
       const drawLine = (x1,y1,x2,y2,width,color='#000') => {
           this.ctx.strokeStyle = color;
           this.ctx.lineWidth = width;
           this.ctx.beginPath(); this.ctx.moveTo(x1,y1); this.ctx.lineTo(x2,y2); this.ctx.stroke();
       };
       // Dla każdego modułu rysujemy jego krawędzie z segmentacją
       this.modules.forEach(module => {
           const strokeWidthPx = (module.stroke_width/100)*scale;
           const halfStroke = strokeWidthPx/2;
           const innerX = this.offsetX + module.x*scale + halfStroke;
           const innerY = this.offsetY + module.y*scale + halfStroke;
           const innerW = module.width*scale - strokeWidthPx;
           const innerH = module.height*scale - strokeWidthPx;
           const thinWidth = strokeWidthPx/5;
           const offset = thinWidth*2;
           // Definicje czterech krawędzi
           const sides = [
               { name:'top',    start:{x:innerX,y:innerY},            end:{x:innerX+innerW,y:innerY},            dir:'h' },
               { name:'bottom', start:{x:innerX,y:innerY+innerH},      end:{x:innerX+innerW,y:innerY+innerH},      dir:'h' },
               { name:'left',   start:{x:innerX,y:innerY},            end:{x:innerX,y:innerY+innerH},            dir:'v' },
               { name:'right',  start:{x:innerX+innerW,y:innerY},      end:{x:innerX+innerW,y:innerY+innerH},      dir:'v' }
           ];
           sides.forEach(side => {
               // Znajdź wszystkie fragmenty wspólne z sąsiadami
               const shared = [];
               this.modules.forEach(nei => {
                   if (nei.id===module.id) return;
                   // pozycja sąsiada
                   const nx = this.offsetX+nei.x*scale+halfStroke;
                   const ny = this.offsetY+nei.y*scale+halfStroke;
                   const nw = nei.width*scale-strokeWidthPx;
                   const nh = nei.height*scale-strokeWidthPx;
                   // test kolokacji krawędzi
                   if (side.name==='top' && Math.abs(module.y - (nei.y+nei.height))<1e-6) {
                       // górna krawędź modułu dotyka dolnej sąsiada
                       const s = Math.max(side.start.x, nx);
                       const e = Math.min(side.end.x, nx+nw);
                       if (e>s) shared.push({start:s,end:e});
                   }
                   if (side.name==='bottom' && Math.abs(module.y+module.height - nei.y)<1e-6) {
                       const s = Math.max(side.start.x, nx);
                       const e = Math.min(side.end.x, nx+nw);
                       if (e>s) shared.push({start:s,end:e});
                   }
                   if (side.name==='left' && Math.abs(module.x - (nei.x+nei.width))<1e-6) {
                       const s = Math.max(side.start.y, ny);
                       const e = Math.min(side.end.y, ny+nh);
                       if (e>s) shared.push({start:s,end:e});
                   }
                   if (side.name==='right' && Math.abs(module.x+module.width - nei.x)<1e-6) {
                       const s = Math.max(side.start.y, ny);
                       const e = Math.min(side.end.y, ny+nh);
                       if (e>s) shared.push({start:s,end:e});
                   }
               });
               // scalanie fragmentów wspólnych
               shared.sort((a,b)=>a.start-b.start);
               const merged = [];
               shared.forEach(iv => {
                   if (!merged.length || iv.start>merged[merged.length-1].end) merged.push(iv);
                   else merged[merged.length-1].end = Math.max(merged[merged.length-1].end, iv.end);
               });
               // rysuj segmenty
               let pos = side.start[side.dir==='h'?'x':'y'];
               merged.forEach(iv => {
                   // fragment zewnętrzny przed
                   if (iv.start>pos) {
                       if (side.dir==='h') drawLine(pos, side.start.y, iv.start, side.start.y, strokeWidthPx);
                       else drawLine(side.start.x, pos, side.start.x, iv.start, strokeWidthPx);
                   }
                   // fragment wewnętrzny (dwie cienkie)
                   if (side.dir==='h') {
                       drawLine(iv.start, side.start.y-offset, iv.end, side.start.y-offset, thinWidth);
                       drawLine(iv.start, side.start.y+offset, iv.end, side.start.y+offset, thinWidth);
                   } else {
                       drawLine(side.start.x-offset, iv.start, side.start.x-offset, iv.end, thinWidth);
                       drawLine(side.start.x+offset, iv.start, side.start.x+offset, iv.end, thinWidth);
                   }
                   pos = iv.end;
               });
               // fragment zewnętrzny po
               const endPos = side.end[side.dir==='h'?'x':'y'];
               if (pos<endPos) {
                   if (side.dir==='h') drawLine(pos, side.start.y, endPos, side.start.y, strokeWidthPx);
                   else drawLine(side.start.x, pos, side.start.x, endPos, strokeWidthPx);
               }
           });
       });
   }

    redraw() {
        this.drawGrid();        
        this.drawEdges();
        this.drawSnapIndicators(); // Dodaj rysowanie wskaźników snappingu
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
    }    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const module = this.getModuleAt(x, y);
        if (module) {
            this.selectedModule = module;
            this.isDragging = true;
            
            // Zapisz aktualną pozycję jako ostatnią poprawną (na wypadek cofania)
            this.lastValidPosition = {
                x: module.x,
                y: module.y
            };
            
            // Oblicz offset dla precyzyjnego przeciągania
            const moduleCanvasX = this.offsetX + (module.x * this.scale);
            const moduleCanvasY = this.offsetY + (module.y * this.scale);
            this.dragOffsetX = x - moduleCanvasX;
            this.dragOffsetY = y - moduleCanvasY;
            
            this.dragStart = { x, y };
            this.canvas.style.cursor = 'grabbing';
            
            // Aktualizuj punkty snap (bez aktualnie przeciąganego modułu)
            this.updateSnapPoints();
        }
    }handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
          if (this.isDragging && this.selectedModule) {
            // Oblicz docelową pozycję lewego górnego rogu modułu (bez snappingu)
            let newCanvasX = mouseX - this.dragOffsetX;
            let newCanvasY = mouseY - this.dragOffsetY;
            
            // Konwertuj pozycję canvas na pozycję w metrach
            let newX = (newCanvasX - this.offsetX) / this.scale;
            let newY = (newCanvasY - this.offsetY) / this.scale;
            
            // Sprawdź czy znajduje się w granicach canvas
            const maxX = (this.canvas.width - this.offsetX) / this.scale - this.selectedModule.width;
            const maxY = (this.canvas.height - this.offsetY) / this.scale - this.selectedModule.height;
            
            newX = Math.max(0, Math.min(newX, maxX));
            newY = Math.max(0, Math.min(newY, maxY));            // Sprawdź ulepszone snapping
            const bestSnap = this.findBestSnapPosition(mouseX, mouseY);
            
            if (bestSnap) {
                // SNAP AKTYWNY - użyj pozycji z najlepszego snap'u
                newX = bestSnap.newPosition.x;
                newY = bestSnap.newPosition.y;
                this.snapIndicators = [bestSnap.targetPoint];
                this.canvas.style.cursor = 'crosshair';
                this.isSnapping = true;
                
                // Zapisz informacje o snapie do pokazania w komunikacie
                if (window.moduleApp) {
                    window.moduleApp.lastSnapInfo = {
                        type: bestSnap.type,
                        dragPoint: bestSnap.dragPoint.name,
                        targetPoint: bestSnap.targetPoint.name
                    };
                }
                
                console.log(`SNAP! ${bestSnap.type} - ${bestSnap.dragPoint.name} → ${bestSnap.targetPoint.name}`);
            } else {
                // Jeśli nie ma snap'u, użyj normalnej pozycji
                this.snapIndicators = [];
                this.canvas.style.cursor = 'grabbing';
                this.isSnapping = false;
                if (window.moduleApp) {
                    window.moduleApp.lastSnapInfo = null;
                }
            }
            
            // ZAWSZE pozwól na ruch podczas przeciągania - kolizje sprawdzane tylko wizualnie
            this.selectedModule.x = newX;
            this.selectedModule.y = newY;
            
            this.redraw();
        } else {
            // Zmiana kursora
            const module = this.getModuleAt(mouseX, mouseY);
            this.canvas.style.cursor = module ? 'grab' : 'crosshair';
        }
    }    handleMouseUp(e) {
        if (this.isDragging) {
            // Sprawdź czy moduł jest w kolizji po puszczeniu
            const hasCollision = this.checkCollisionLocal(
                this.selectedModule.x, 
                this.selectedModule.y, 
                this.selectedModule.width, 
                this.selectedModule.height, 
                this.selectedModule.id
            );
              if (hasCollision && !this.isSnapping) {
                // Jeśli jest kolizja i nie ma snappingu, przywróć poprzednią pozycję
                if (this.lastValidPosition) {
                    this.selectedModule.x = this.lastValidPosition.x;
                    this.selectedModule.y = this.lastValidPosition.y;
                    if (window.moduleApp) {
                        window.moduleApp.showMessage('Nie można umieścić modułu w tym miejscu - kolizja!', 'error');
                    }
                }
            } else {
                // Zapisz aktualną pozycję jako ostatnią poprawną
                this.lastValidPosition = {
                    x: this.selectedModule.x,
                    y: this.selectedModule.y
                };
                
                // Jeśli snap był aktywny, pokaż komunikat o udanym połączeniu
                if (this.isSnapping && this.snapIndicators.length > 0) {
                    if (window.moduleApp && window.moduleApp.lastSnapInfo) {
                        const snapInfo = window.moduleApp.lastSnapInfo;
                        const typeNames = {
                            'wall-to-wall': 'Połączenie ściana-ściana',
                            'corner-to-corner': 'Połączenie narożnik-narożnik',
                            'center-snap': 'Centrowanie modułu',
                            'mixed': 'Przyciągnięcie do punktu'
                        };
                        const typeName = typeNames[snapInfo.type] || 'Przyciągnięcie';
                        window.moduleApp.showMessage(`${typeName}: ${snapInfo.dragPoint} → ${snapInfo.targetPoint}`, 'success');
                        window.moduleApp.lastSnapInfo = null; // Wyczyść
                    } else {
                        window.moduleApp.showMessage('Moduł został pomyślnie przyciągnięty!', 'success');
                    }
                }
            }
            
            this.isDragging = false;
            this.canvas.style.cursor = 'crosshair';
            
            // Wyczyść wskaźniki snap
            this.snapIndicators = [];
            this.isSnapping = false;
            this.redraw();
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
        this.scale = 50; // Zmieniona domyślna skala na 50
        this.redraw();
        document.getElementById('scaleValue').textContent = this.scale;
    }
      zoomIn() {
        if (this.scale < 100) { // Zwiększona maksymalna skala
            this.scale += 10;
            this.redraw();
            document.getElementById('scaleValue').textContent = this.scale;
        }
    }
    
    zoomOut() {
        if (this.scale > 30) { // Zwiększona minimalna skala
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
