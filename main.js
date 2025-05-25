// ====== DIESE ZEILE SOLLTE IN DER KONSOLE ZUERST ERSCHEINEN ======
console.log("main.js wird ausgeführt - Version: " + new Date().toLocaleTimeString());
// ================================================================

// --- WICHTIG: ALLE IMPORT-STATEMENTS MÜSSEN HIER ENTFERNT WERDEN! ---
// Da wir Three.js jetzt als klassisches Skript laden, ist THREE global verfügbar.


// --- Konfiguration ---
const MODEL_PATH = './mandala_01.fbx'; // Pfad zu deinem 3D-Modell (JETZT .fbx)
// ACHTUNG: Passe diese Namen an die tatsächlichen Namen der Körper/Komponenten an,
// die du in Fusion 360 vergeben hast und die im FBX erhalten bleiben!
const FRONT_MESH_NAME = 'Mandala_Schicht_A'; // Beispielname aus Fusion 360
const BACK_MESH_NAME = 'Mandala_Schicht_B';   // Beispielname aus Fusion 360

const COLORS = [
    { name: 'Weiß', hex: '#FFFFFF' },
    { name: 'Schwarz', hex: '#000000' },
    { name: 'Hellrosa', hex: '#F0D9E7' }, // Passend zum Bild
    { name: 'Dunkelgrau', hex: '#333333' },
    { name: 'Blau', hex: '#007bff' },
    { name: 'Grün', hex: '#28a745' },
    { name: 'Rot', hex: '#dc3545' },
    { name: 'Gelb', hex: '#ffc107' },
    { name: 'Cyan', hex: '#17a2b8' },
    { name: 'Magenta', hex: '#e83e8c' },
    { name: 'Orange', hex: '#fd7e14' },
    { name: 'Violett', hex: '#6f42c1' },
    { name: 'Türkis', hex: '#20c997' },
    { name: 'Braun', hex: '#795548' },
    { name: 'Grau', hex: '#6c757d' },
    { name: 'Lila', hex: '#9c27b0' },
    { name: 'Himmelblau', hex: '#87CEEB' },
    { name: 'Mintgrün', hex: '#98FB98' },
    { name: 'Koralle', hex: '#FF7F50' },
    { name: 'Gold', hex: '#FFD700' }
];

// --- Globale Variablen für Three.js ---
let scene, camera, renderer, controls;
let currentModel; // Das aktuell geladene 3D-Modell
let frontMesh, backMesh; // Referenzen zu den einzelnen Meshes für die Farbanpassung

// --- Initialisierung der Szene ---
function init() {
    // 1. Szene erstellen
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0); // Hintergrundfarbe der Szene

    // 2. Kamera erstellen
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 2); // Kamera-Position (anpassen, falls Modell zu klein/groß)

    // 3. Renderer erstellen
    renderer = new THREE.WebGLRenderer({ antialiasing: true }); // Antialiasing für glattere Kanten
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement); // Canvas zum HTML-Body hinzufügen

    // 4. Beleuchtung hinzufügen
    // FBX-Modelle können manchmal eigene Beleuchtungsinformationen enthalten,
    // aber wir fügen Standardlichter hinzu, um sicherzustellen, dass alles gut beleuchtet ist.
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7); // Sanfte Umgebungsbeleuchtung
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5); // Gerichtetes Licht von vorne
    directionalLight.position.set(0, 0, 1).normalize();
    scene.add(directionalLight);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.3); // Gerichtetes Licht von hinten/oben
    directionalLight2.position.set(0, 1, -1).normalize();
    scene.add(directionalLight2);


    // 5. OrbitControls hinzufügen (ermöglicht das Drehen/Zoomen mit der Maus)
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // Für eine "weichere" Bewegung
    controls.dampingFactor = 0.25;
    controls.screenSpacePanning = false; // Verhindert Panning in der Ebene
    controls.minDistance = 0.5; // Minimaler Zoom-Abstand
    controls.maxDistance = 5;  // Maximaler Zoom-Abstand

    // 6. Fenstergrößenänderungen behandeln
    window.addEventListener('resize', onWindowResize, false);

    // Initiales Laden des Modells
    loadModel(MODEL_PATH);

    // UI-Elemente initialisieren
    createColorOptions();
    // Muster-Buttons werden später dynamisch erstellt, wenn wir mehrere Modelle haben
}

// --- Modell laden Funktion (ANGEPASST FÜR FBX) ---
function loadModel(path) {
    const loader = new THREE.FBXLoader();

    // Entferne das vorherige Modell, falls vorhanden
    if (currentModel) {
        scene.remove(currentModel);
        currentModel.traverse((object) => {
            if (object.isMesh) {
                if (object.geometry) object.geometry.dispose();
                // Bei FBX kann das Material anders sein, auch wenn es ein Standardmaterial ist,
                // wir müssen sicherstellen, dass wir es richtig entsorgen.
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        material.dispose();
                    }
                }
            }
        });
        currentModel = null;
        frontMesh = null;
        backMesh = null;
    }

    loader.load(
        path,
        (fbx) => {
            currentModel = fbx; // Das geladene FBX-Objekt ist die Szene
            scene.add(currentModel);

            // Skalierung anpassen, falls das Modell zu groß oder zu klein ist
            // Berechne die Bounding Box des Modells
            const box = new THREE.Box3().setFromObject(currentModel);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 1.0 / maxDim; // Skaliere das Modell so, dass die größte Dimension 1.0 beträgt
            currentModel.scale.set(scale, scale, scale);

            // Positionieren des Modells im Zentrum
            box.setFromObject(currentModel); // Bounding Box neu berechnen nach Skalierung
            box.getCenter(currentModel.position).negate(); // Modell zentrieren

            // Finde die Meshes für Vorder- und Rückseite
            // Bei FBX-Modellen können die Namen der Kinder komplexer sein,
            // oft sind es "Null"-Objekte, die die Meshes enthalten, oder die Meshes selbst.
            currentModel.traverse((child) => {
                if (child.isMesh) {
                    console.log("Gefundenes Mesh (FBX):", child.name); // HILFREICH ZUM DEBUGGEN DER NAMEN!
                    // Ersetze das vorhandene Material durch ein MeshStandardMaterial
                    // oder erstelle eines, wenn es keins hat.
                    child.material = new THREE.MeshStandardMaterial({
                        color: child.material ? child.material.color : 0xcccccc // Behalte die ursprüngliche Farbe bei, falls vorhanden
                    });

                    // Nutze includes() um zu prüfen, ob der Name einen Teil des definierten Strings enthält
                    if (child.name.includes(FRONT_MESH_NAME)) {
                        frontMesh = child;
                    } else if (child.name.includes(BACK_MESH_NAME)) {
                        backMesh = child;
                    }
                }
            });

            if (!frontMesh || !backMesh) {
                console.warn("Konnte nicht beide Meshes ('" + FRONT_MESH_NAME + "' und '" + BACK_MESH_NAME + "') im FBX-Modell finden. Bitte die Namen in main.js überprüfen oder die Konsolen-Ausgabe 'Gefundenes Mesh (FBX):' prüfen.");
                // Wenn wir die Meshes nicht finden, können wir die Farbänderung nicht durchführen.
                // Hier könnten wir auch ein Fallback-Material setzen.
            } else {
                // Setze initiale Farben für die gefundenen Meshes
                setColorForPart('front', COLORS[2].hex); // Z.B. Hellrosa als Standard
                setColorForPart('back', COLORS[3].hex);  // Z.B. Dunkelgrau als Standard
                updateColorSelection(COLORS[2].hex, 'front');
                updateColorSelection(COLORS[3].hex, 'back');
            }
        },
        (xhr) => {
            // Optional: Fortschritt beim Laden anzeigen
            console.log((xhr.loaded / xhr.total * 100) + '% geladen');
        },
        (error) => {
            console.error('Fehler beim Laden des FBX-Modells:', error);
        }
    );
}

// --- Farbanpassungsfunktion ---
function setColorForPart(part, hexColor) {
    const color = new THREE.Color(hexColor);
    let targetMesh;

    if (part === 'front' && frontMesh) {
        targetMesh = frontMesh;
    } else if (part === 'back' && backMesh) {
        targetMesh = backMesh;
    } else {
        console.warn(`Mesh für Teil '${part}' nicht gefunden oder zugewiesen.`);
        return;
    }

    // Bei FBX-Modellen ist es üblich, dass die Meshes ein MeshStandardMaterial haben.
    // Wenn dein Modell komplexe Materialien hat, musst du hier evtl. anpassen.
    if (targetMesh.material) {
        if (Array.isArray(targetMesh.material)) {
            // Wenn das Material ein Array ist (Multi-Material), ändere alle Farben
            targetMesh.material.forEach(material => {
                // Stellen Sie sicher, dass es ein Farbmaterial ist (z.B. MeshStandardMaterial)
                if (material.color) {
                    material.color.set(color);
                    material.needsUpdate = true;
                }
            });
        } else {
            // Einzelnes Material
            if (targetMesh.material.color) {
                targetMesh.material.color.set(color);
                targetMesh.material.needsUpdate = true; // Wichtig, damit die Änderung sichtbar wird
            }
        }
    } else {
        console.warn(`Mesh '${targetMesh.name}' hat kein änderbares Material.`);
    }
}

// --- UI-Funktionen ---
function createColorOptions() {
    const colorOptionsFrontDiv = document.getElementById('colorOptionsFront');
    const colorOptionsBackDiv = document.getElementById('colorOptionsBack');

    COLORS.forEach(color => {
        // Für Vorderseite
        const optionFront = document.createElement('div');
        optionFront.className = 'color-option';
        optionFront.style.backgroundColor = color.hex;
        optionFront.dataset.hex = color.hex;
        optionFront.title = color.name;
        optionFront.addEventListener('click', () => {
            setColorForPart('front', color.hex);
            updateColorSelection(color.hex, 'front');
        });
        colorOptionsFrontDiv.appendChild(optionFront);

        // Für Rückseite
        const optionBack = document.createElement('div');
        optionBack.className = 'color-option';
        optionBack.style.backgroundColor = color.hex;
        optionBack.dataset.hex = color.hex;
        optionBack.title = color.name;
        optionBack.addEventListener('click', () => {
            setColorForPart('back', color.hex);
            updateColorSelection(color.hex, 'back');
        });
        colorOptionsBackDiv.appendChild(optionBack);
    });
}

function updateColorSelection(selectedHex, part) {
    const container = part === 'front' ? document.getElementById('colorOptionsFront') : document.getElementById('colorOptionsBack');
    const options = container.querySelectorAll('.color-option');
    options.forEach(option => {
        if (option.dataset.hex.toLowerCase() === selectedHex.toLowerCase()) { // Case-insensitive Vergleich
            option.classList.add('selected');
        } else {
            option.classList.remove('selected');
        }
    });
}


// --- Animation Loop ---
function animate() {
    requestAnimationFrame(animate); // Fordert den nächsten Frame an

    controls.update(); // Aktualisiert die OrbitControls
    renderer.render(scene, camera); // Rendert die Szene
}

// --- Fenstergrößenänderung ---
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Startet die Anwendung, wenn ALLE Ressourcen (einschließlich Bilder, Skripte) geladen sind
// WICHTIG: window.onload oder DOMContentLoaded, da wir jetzt keine Module mehr verwenden.
window.onload = () => {
    init();
    animate();
};