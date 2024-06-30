import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Pathfinding, PathfindingHelper } from 'three-pathfinding';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';

// SCENE
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa8def0);

// CAMERA
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.y = 10;
camera.position.z = 10;
camera.position.x = 33;

// RENDERER
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true

// ORBIT CAMERA CONTROLS
const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.mouseButtons = {
    MIDDLE: THREE.MOUSE.ROTATE,
    RIGHT: THREE.MOUSE.PAN
}
orbitControls.enableDamping = true
orbitControls.enablePan = true
orbitControls.minDistance = 5
orbitControls.maxDistance = 60
orbitControls.maxPolarAngle = Math.PI / 2 - 0.05 // prevent camera below ground
orbitControls.minPolarAngle = Math.PI / 4        // prevent top down view
orbitControls.update();

// LIGHTS
const dLight = new THREE.DirectionalLight('white', 0.8);
dLight.position.x = 20;
dLight.position.y = 30;
dLight.castShadow = true;
dLight.shadow.mapSize.width = 4096;
dLight.shadow.mapSize.height = 4096;
const d = 35;
dLight.shadow.camera.left = - d;
dLight.shadow.camera.right = d;
dLight.shadow.camera.top = d;
dLight.shadow.camera.bottom = - d;
scene.add(dLight);

const aLight = new THREE.AmbientLight('white', 0.5);
scene.add(aLight);

// ATTACH RENDERER
document.body.appendChild(renderer.domElement);

// RESIZE HANDLER
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onWindowResize);

// AGENT 1
const agentHeight = 1.0;
const agentRadius = 0.25;
const agent1 = new THREE.Mesh(new THREE.CylinderGeometry(agentRadius, agentRadius, agentHeight), new THREE.MeshPhongMaterial({ color: 'green' }));
agent1.position.y = agentHeight / 2;
agent1.position.z = 8;
agent1.position.x = 0;
agent1.position.y = 14;
scene.add(agent1);

// AGENT 2
const agent2 = new THREE.Mesh(new THREE.CylinderGeometry(agentRadius, agentRadius, agentHeight), new THREE.MeshPhongMaterial({ color: 'blue' }));
agent2.position.y = agentHeight / 2;
agent2.position.z = 18; // Different Z position for distinction
agent2.position.x = 17; // Different X position for distinction
agent2.position.y = 1.5;
scene.add(agent2);

// AGENT 3
const agent3 = new THREE.Mesh(new THREE.CylinderGeometry(agentRadius, agentRadius, agentHeight), new THREE.MeshPhongMaterial({ color: 'red' }));
agent3.position.y = agentHeight / 2;
agent3.position.z = -10; // Different Z position for distinction
agent3.position.x = 10; // Different X position for distinction
agent3.position.y = 1.5;
scene.add(agent3);

function createAndAttachTransformControls(agent, camera, renderer, scene) {
    const transformControls = new TransformControls(camera, renderer.domElement);
    transformControls.attach(agent);
    scene.add(transformControls);
    return transformControls;
}

// Usage
createAndAttachTransformControls(agent1, camera, renderer, scene);
createAndAttachTransformControls(agent2, camera, renderer, scene);
createAndAttachTransformControls(agent3, camera, renderer, scene);

// LOAD LEVEL
const loader = new GLTFLoader();
loader.load('./glb/demo-level.glb', (gltf) => {
    scene.add(gltf.scene);
});

// INITIALIZE THREE-PATHFINDING
const pathfinding = new Pathfinding();
const pathfindingHelper1 = new PathfindingHelper(); // First instance
const pathfindingHelper2 = new PathfindingHelper(); // Second instance
scene.add(pathfindingHelper1);
scene.add(pathfindingHelper2); // Add the second instance to the scene as well
const ZONE = 'level1';
const SPEED = 5;
let navmesh;
let groupID;
let navpath;
loader.load('./glb/demo-level-navmesh.glb', (gltf) => {
    gltf.scene.traverse((node) => {
        if (!navmesh && node.isObject3D && node.children && node.children.length > 0) {
            navmesh = node.children[0];
            pathfinding.setZoneData(ZONE, Pathfinding.createZone(navmesh.geometry));
        }
    });
});

// RAYCASTING
const raycaster = new THREE.Raycaster();
const clickMouse = new THREE.Vector2();

function intersect(pos) {
    raycaster.setFromCamera(pos, camera);
    return raycaster.intersectObjects(scene.children);

}
/* window.addEventListener('click', event => {
    // THREE RAYCASTER
    clickMouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    clickMouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    const found = intersect(clickMouse);
    if (found.length > 0) {
        let target = found[0].point;
        const agentpos = agent1.position;
        // console.log(`agentpos: ${JSON.stringify(agentpos)}`);
        // console.log(`target: ${JSON.stringify(target)}`);

        groupID = pathfinding.getGroup(ZONE, agent1.position);
        // find closest node to agent, just in case agent is out of bounds
        const closest = pathfinding.getClosestNode(agentpos, ZONE, groupID);
        navpath = pathfinding.findPath(closest.centroid, target, ZONE, groupID);
        if (navpath) {
            // console.log(`navpath: ${JSON.stringify(navpath)}`);
            pathfindinghelper.reset();
            pathfindinghelper.setPlayerPosition(agentpos);
            pathfindinghelper.setTargetPosition(target);
            pathfindinghelper.setPath(navpath);
        }
    }
}) */

function calculateAndShowPaths() {
    // Ensure navmesh is loaded
    if (!navmesh) {
        console.error('Navmesh not loaded yet.');
        return;
    }

    // Calculate path from agent1 to agent2
    let groupIDAgent1 = pathfinding.getGroup(ZONE, agent1.position);
    let closestNodeAgent1 = pathfinding.getClosestNode(agent1.position, ZONE, groupIDAgent1);
    let groupIDAgent2 = pathfinding.getGroup(ZONE, agent2.position);
    let closestNodeAgent2 = pathfinding.getClosestNode(agent2.position, ZONE, groupIDAgent2);
    let pathAgent1ToAgent2 = pathfinding.findPath(closestNodeAgent1.centroid, agent2.position, ZONE, groupIDAgent1);

    // Check if a path was found from agent1 to agent2
    if (!pathAgent1ToAgent2 || pathAgent1ToAgent2.length === 0) {
        console.warn('No path found from agent1 to agent2.');
    } else {
        // Use PathfindingHelper1 to show the path from agent1 to agent2
        pathfindingHelper1.reset(); // Clear previous paths for pathfindingHelper1
        pathfindingHelper1.setPlayerPosition(agent1.position);
        pathfindingHelper1.setTargetPosition(agent2.position);
        pathfindingHelper1.setPath(pathAgent1ToAgent2);
    }

    // Calculate path from agent2 to agent3 immediately after
    let groupIDAgent3 = pathfinding.getGroup(ZONE, agent3.position);
    let closestNodeAgent3 = pathfinding.getClosestNode(agent3.position, ZONE, groupIDAgent3);
    let pathAgent2ToAgent3 = pathfinding.findPath(closestNodeAgent2.centroid, agent3.position, ZONE, groupIDAgent3);

    // Check if a path was found from agent2 to agent3
    if (!pathAgent2ToAgent3 || pathAgent2ToAgent3.length === 0) {
        console.warn('No path found from agent2 to agent3.');
    } else {
        // Use PathfindingHelper2 to show the path from agent2 to agent3
        pathfindingHelper2.reset(); // Clear previous paths for pathfindingHelper2
        pathfindingHelper2.setPlayerPosition(agent2.position);
        pathfindingHelper2.setTargetPosition(agent3.position);
        pathfindingHelper2.setPath(pathAgent2ToAgent3);
    }
}

// let lastPosition = new THREE.Vector3(); // Initialize with a vector to store the last position

// MOVEMENT ALONG PATH
/* function move(delta) {
    if (!navpath || navpath.length <= 0) return

    let targetPosition = navpath[0];
    const distance = targetPosition.clone().sub(agent1.position);

    if (distance.lengthSq() > 0.05 * 0.05) {
        distance.normalize();
        // Move player to target
        agent1.position.add(distance.multiplyScalar(delta * SPEED));
    } else {
        // Remove node from the path we calculated
        navpath.shift();
    }

    agent1.updateMatrixWorld(); // Ensure the world matrix is updated
    const worldPosition = new THREE.Vector3();
    agent1.getWorldPosition(worldPosition);

    // Check if the position has changed
    if (!lastPosition.equals(worldPosition)) {
        console.log(worldPosition); // Log the new position
        lastPosition.copy(worldPosition); // Update the lastPosition for the next comparison
    }
} */

// ANIMATE
const clock = new THREE.Clock();
let animate = () => {
    // move(clock.getDelta());
    calculateAndShowPaths();
    orbitControls.update()
    renderer.render(scene, camera);
    requestAnimationFrame(animate);

    /*     agent1.updateMatrixWorld(); // Ensure the world matrix is updated
        const worldPosition = new THREE.Vector3();
        agent1.getWorldPosition(worldPosition);
        console.log(worldPosition); */
};
animate();