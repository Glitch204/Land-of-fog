import { useEffect, useRef, useCallback, useState } from "react";
import * as THREE from "three";
import { upsertSandboxPosition, fetchSandboxPositions } from "./api.js";

function makeClientId() {
  return `p-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function nameToColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return new THREE.Color(`hsl(${hue}, 45%, 55%)`);
}

function makeNameSprite(text) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = 256;
  canvas.height = 64;
  ctx.font = "600 30px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(10,10,12,0.6)";
  ctx.beginPath();
  ctx.roundRect(8, 10, 240, 44, 10);
  ctx.fill();
  ctx.fillStyle = "#eae7e0";
  ctx.fillText(text, 128, 38);
  const tex = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
  sprite.scale.set(1.5, 0.38, 1);
  sprite.renderOrder = 999;
  return sprite;
}

function buildAvatar(color, name) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.28, 0.9, 10),
    new THREE.MeshStandardMaterial({ color, roughness: 0.8 })
  );
  body.position.y = 0.55;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 14, 14),
    new THREE.MeshStandardMaterial({ color, roughness: 0.8 })
  );
  head.position.y = 1.12;
  const tag = makeNameSprite(name);
  tag.position.y = 1.5;
  group.add(body, head, tag);
  return group;
}

function buildDeadTree() {
  const group = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x2a2724, roughness: 1 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, 2.6, 6), trunkMat);
  trunk.position.y = 1.3;
  group.add(trunk);
  for (let i = 0; i < 4; i++) {
    const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.08, 1.1, 5), trunkMat);
    branch.position.set(
      (Math.random() - 0.5) * 0.6,
      1.8 + Math.random() * 0.8,
      (Math.random() - 0.5) * 0.6
    );
    branch.rotation.z = (Math.random() - 0.5) * 1.4;
    branch.rotation.x = (Math.random() - 0.5) * 1.4;
    group.add(branch);
  }
  return group;
}

function buildRock() {
  const rock = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.35 + Math.random() * 0.4, 0),
    new THREE.MeshStandardMaterial({ color: 0x2e2e30, roughness: 1, flatShading: true })
  );
  rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
  rock.position.y = 0.2;
  return rock;
}

export default function Game3D({ displayName }) {
  const mountRef = useRef(null);
  const clientIdRef = useRef(makeClientId());
  const [playerCount, setPlayerCount] = useState(1);
  const stateRef = useRef({
    yaw: Math.PI,
    pos: { x: 0, z: 0 },
    joystick: { active: false, dx: 0, dy: 0 },
    look: { dragging: false, lastX: 0, lastY: 0 },
  });
  const othersRef = useRef({});

  useEffect(() => {
    const mount = mountRef.current;
    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0c0e);
    scene.fog = new THREE.FogExp2(0x0e0f11, 0.045);

    const camera = new THREE.PerspectiveCamera(62, width / height, 0.1, 200);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "low-power" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0x3a3f48, 0.55));
    const moon = new THREE.DirectionalLight(0x8fa0b5, 0.5);
    moon.position.set(20, 30, -10);
    scene.add(moon);
    const playerLight = new THREE.PointLight(0xcbb894, 0.5, 6);

    const groundMat = new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 1 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), groundMat);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    const grid = new THREE.GridHelper(400, 80, 0x22262c, 0x1a1d21);
    grid.position.y = 0.01;
    scene.add(grid);

    const landmarkGroup = new THREE.Group();
    for (let i = 0; i < 60; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 4 + Math.random() * 70;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const item = Math.random() > 0.5 ? buildDeadTree() : buildRock();
      item.position.x = x;
      item.position.z = z;
      landmarkGroup.add(item);
    }
    scene.add(landmarkGroup);

    const selfColor = nameToColor(displayName || "you");
    const selfAvatar = buildAvatar(selfColor, displayName || "you");
    scene.add(selfAvatar);
    playerLight.position.y = 1.4;
    selfAvatar.add(playerLight);

    const st = stateRef.current;

    function onPointerDown(e) {
      st.look.dragging = true;
      st.look.lastX = e.clientX;
      st.look.lastY = e.clientY;
    }
    function onPointerMove(e) {
      if (!st.look.dragging) return;
      const dx = e.clientX - st.look.lastX;
      st.yaw -= dx * 0.005;
      st.look.lastX = e.clientX;
      st.look.lastY = e.clientY;
    }
    function onPointerUp() {
      st.look.dragging = false;
    }
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    function onResize() {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener("resize", onResize);

    let alive = true;
    async function pushPosition() {
      try {
        await upsertSandboxPosition(clientIdRef.current, displayName, st.pos.x, st.pos.z);
      } catch {
        /* ignore */
      }
    }
    async function pullPositions() {
      try {
        const rows = await fetchSandboxPositions();
        const seen = new Set();
        rows.forEach((row) => {
          if (row.client_id === clientIdRef.current) return;
          seen.add(row.client_id);
          if (!othersRef.current[row.client_id]) {
            const color = nameToColor(row.name || "?");
            const mesh = buildAvatar(color, row.name || "?");
            scene.add(mesh);
            othersRef.current[row.client_id] = { mesh, targetX: row.x, targetZ: row.z };
          } else {
            othersRef.current[row.client_id].targetX = row.x;
            othersRef.current[row.client_id].targetZ = row.z;
          }
        });
        Object.keys(othersRef.current).forEach((id) => {
          if (!seen.has(id)) {
            scene.remove(othersRef.current[id].mesh);
            delete othersRef.current[id];
          }
        });
        setPlayerCount(seen.size + 1);
      } catch {
        /* ignore */
      }
    }
    pushPosition();
    pullPositions();
    const pushInterval = setInterval(pushPosition, 700);
    const pullInterval = setInterval(pullPositions, 1500);

    const clock = new THREE.Clock();
    function animate() {
      if (!alive) return;
      requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.1);

      const speed = 4.0;
      const { dx, dy, active } = st.joystick;
      if (active && (Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05)) {
        const forward = -dy;
        const strafe = dx;
        const sinY = Math.sin(st.yaw);
        const cosY = Math.cos(st.yaw);
        const moveX = strafe * cosY + forward * sinY;
        const moveZ = -strafe * sinY + forward * cosY;
        st.pos.x += moveX * speed * dt;
        st.pos.z += moveZ * speed * dt;
        selfAvatar.rotation.y = Math.atan2(moveX, moveZ);
      }
      selfAvatar.position.set(st.pos.x, 0, st.pos.z);

      Object.values(othersRef.current).forEach((o) => {
        o.mesh.position.x += (o.targetX - o.mesh.position.x) * 0.12;
        o.mesh.position.z += (o.targetZ - o.mesh.position.z) * 0.12;
      });

      const camDist = 4.5;
      const camHeight = 2.3;
      camera.position.x = st.pos.x + Math.sin(st.yaw) * camDist;
      camera.position.z = st.pos.z + Math.cos(st.yaw) * camDist;
      camera.position.y = camHeight;
      camera.lookAt(st.pos.x, 0.9, st.pos.z);

      renderer.render(scene, camera);
    }
    animate();

    return () => {
      alive = false;
      clearInterval(pushInterval);
      clearInterval(pullInterval);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      mount.removeChild(renderer.domElement);
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayName]);

  const joystickBaseRef = useRef(null);
  const joystickActive = useRef(false);

  const handleJoyStart = useCallback((e) => {
    e.preventDefault();
    joystickActive.current = true;
    stateRef.current.joystick.active = true;
  }, []);

  const handleJoyMove = useCallback((e) => {
    if (!joystickActive.current || !joystickBaseRef.current) return;
    e.preventDefault();
    const rect = joystickBaseRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const touch = e.touches ? e.touches[0] : e;
    let dx = (touch.clientX - cx) / (rect.width / 2);
    let dy = (touch.clientY - cy) / (rect.height / 2);
    const mag = Math.min(1, Math.hypot(dx, dy));
    const ang = Math.atan2(dy, dx);
    dx = Math.cos(ang) * mag;
    dy = Math.sin(ang) * mag;
    stateRef.current.joystick.dx = dx;
    stateRef.current.joystick.dy = dy;
  }, []);

  const handleJoyEnd = useCallback((e) => {
    if (e) e.preventDefault();
    joystickActive.current = false;
    stateRef.current.joystick.active = false;
    stateRef.current.joystick.dx = 0;
    stateRef.current.joystick.dy = 0;
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh", overflow: "hidden" }}>
      <div ref={mountRef} style={{ width: "100%", height: "100%", touchAction: "none" }} />

      <div style={styles.playerCount}>{playerCount} in the fog</div>

      <div
        ref={joystickBaseRef}
        onTouchStart={handleJoyStart}
        onTouchMove={handleJoyMove}
        onTouchEnd={handleJoyEnd}
        onMouseDown={handleJoyStart}
        onMouseMove={(e) => joystickActive.current && handleJoyMove(e)}
        onMouseUp={handleJoyEnd}
        onMouseLeave={handleJoyEnd}
        style={styles.joystickBase}
      >
        <div style={styles.joystickNub} />
      </div>

      <div style={styles.hint}>Drag anywhere to look around</div>
    </div>
  );
}

const styles = {
  playerCount: {
    position: "absolute",
    top: "16px",
    left: "16px",
    background: "rgba(20,20,22,0.6)",
    color: "#c9c4ba",
    padding: "6px 12px",
    borderRadius: "8px",
    fontSize: "0.75rem",
    fontFamily: "'Inter', sans-serif",
  },
  joystickBase: {
    position: "absolute",
    left: "24px",
    bottom: "28px",
    width: "100px",
    height: "100px",
    borderRadius: "50%",
    background: "rgba(20,20,22,0.55)",
    border: "1px solid rgba(255,255,255,0.15)",
    touchAction: "none",
  },
  joystickNub: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: "42px",
    height: "42px",
    marginLeft: "-21px",
    marginTop: "-21px",
    borderRadius: "50%",
    background: "rgba(156,132,101,0.85)",
    pointerEvents: "none",
  },
  hint: {
    position: "absolute",
    bottom: "36px",
    right: "20px",
    fontSize: "0.68rem",
    color: "rgba(255,255,255,0.35)",
    maxWidth: "100px",
    textAlign: "right",
    fontFamily: "'Inter', sans-serif",
  },
};
