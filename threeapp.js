import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const boardSize = { width: 50, height: 30, depth: 20 };
const cubeSize = 5;
const gap = 1;
let generations = []; // Array of grids
let cubeReferences = []; // Array of arrays of cube references, parallel to generations
let scene, camera;
const maxGenerations = 10; // Limit to 10 generations

// Generate a random grid
function createRandomGrid(width, height) {
    let grid = [];
    for (let y = 0; y < height; y++) {
        let row = [];
        for (let x = 0; x < width; x++) {
            row.push(Math.random() > 0.5); // Randomly alive or dead
        }
        grid.push(row);
    }
    return grid;
}

// Compute the next generation
function computeNextGeneration(grid) {
    const nextGrid = grid.map(arr => [...arr]);
    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[y].length; x++) {
            const aliveNeighbors = countAliveNeighbors(grid, x, y);
            const isAlive = grid[y][x];
            nextGrid[y][x] = isAlive ? aliveNeighbors === 2 || aliveNeighbors === 3 : aliveNeighbors === 3;
        }
    }
    return nextGrid;
}

// Count the number of alive neighbors
function countAliveNeighbors(grid, x, y) {
    let count = 0;
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < grid[0].length && ny >= 0 && ny < grid.length && grid[ny][nx]) {
                count++;
            }
        }
    }
    return count;
}

// Initialize the scene, camera, and controls
function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);

    // Center camera and controls focus
    const gridCenterX = boardSize.width * cubeSize * 0.5;
    const gridCenterY = -boardSize.height * cubeSize * 0.5;
    camera.position.set(gridCenterX, gridCenterY, 500);
    controls.target.set(gridCenterX, gridCenterY, 0);
    controls.update();

    const initialGrid = createRandomGrid(boardSize.width, boardSize.height);
    generations.push(initialGrid);
    updateVisualization(initialGrid);

    function animate() {
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
    }
    animate();

    // Update the visualization every second
    setInterval(() => {
        const newGrid = computeNextGeneration(generations[generations.length - 1]);
        generations.push(newGrid);

        // Remove the oldest generation if we exceed the max generations
        if (generations.length > maxGenerations) {
            generations.shift();
            const oldestCubes = cubeReferences.shift();
            oldestCubes.forEach(cube => scene.remove(cube)); // Remove cubes from the scene
        }

        updateVisualization(newGrid);
        updateCubesTransparency(); // Update transparency of all cubes
    }, 300);
}

function updateVisualization(grid) {
    const depthOffset = -(generations.length - 1) * (cubeSize + gap);
    const currentCubes = []; // To store references to the current generation's cubes
    function computeColor(x, y) {
        const red = countAliveNeighbors(grid, x, y - 2) + countAliveNeighbors(grid, x, y + 2);
        const green = countAliveNeighbors(grid, x - 2, y) + countAliveNeighbors(grid, x + 2, y);
        const blue = generations.length <= 1 ? 0 : countAliveNeighbors(generations[generations.length - 2], x, y);
        return new THREE.Color(Math.min(1, red / 16), Math.min(1, green / 16), Math.min(1, blue / 16));
    }

    grid.forEach((row, y) => {
        row.forEach((alive, x) => {
            if (alive) {
                const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
                const color = computeColor(x, y);
                const material = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 1 }); // Start fully opaque
                const cube = new THREE.Mesh(geometry, material);
                cube.position.set(x * (cubeSize + gap), -y * (cubeSize + gap), depthOffset);
                scene.add(cube);
                currentCubes.push(cube); // Add the cube to the current generation's references
            }
        });
    });

    cubeReferences.push(currentCubes); // Store the current generation's cubes
}

function updateCubesTransparency() {
    const totalGenerations = cubeReferences.length;
    cubeReferences.forEach((generationCubes, index) => {
        // Calculate opacity to decrease with each older generation
        const opacity = 1 - ((totalGenerations - index - 1) / maxGenerations);
        // Adjust Z position based on generation index to move older generations back
        const zOffset = -(index * (cubeSize + gap));

        generationCubes.forEach(cube => {
            cube.material.opacity = Math.max(opacity, 0.1); // Ensure at least some visibility
            // Update Z position based on the generation index
            // Assuming original Z position needs to be adjusted based on generation
            cube.position.z = zOffset;
        });
    });
}

init();
