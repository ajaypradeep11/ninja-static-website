import { useEffect, useMemo, useRef } from "react";
import { animate, useMotionValue } from "motion/react";
import * as THREE from "three";

const texturesToLoad = [
  ["naturalMap", "neutral.webp"],
  ["angryMap", "angry.webp"],
  ["offlineMap", "offline.webp"],
  ["eyeOpenings", "eye-openings.svg"],
];
const vertexShader = `
  uniform vec2 grab;
  uniform vec2 pull;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec2 distanceFromGrab = (uv - grab) / vec2(0.19, 0.17);
    float falloff = pow(max(0.0, 1.0 - dot(distanceFromGrab, distanceFromGrab)), 2.0);
    vec3 displaced = position;
    displaced.xy += pull * falloff;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`;
const fragmentShader = `
  uniform sampler2D naturalMap;
  uniform sampler2D angryMap;
  uniform sampler2D offlineMap;
  uniform sampler2D eyeOpenings;
  uniform float anger;
  uniform float offline;
  uniform vec2 gaze;
  varying vec2 vUv;

  vec3 linearColor(vec3 color) {
    return mix(color / 12.92, pow((color + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), color));
  }

  float ellipse(vec2 point, vec2 center, vec2 radius) {
    float edge = length((point - center) / radius);
    return 1.0 - smoothstep(0.91, 1.0, edge);
  }

  // A rigid iris/pupil layer moves behind a fixed eyelid mask. No portrait UVs
  // move, and no alternate gaze pictures are blended into the eye.
  vec3 eyeball(vec2 pixel, vec2 center) {
    vec2 offset = gaze * vec2(15.0, -6.0) * (1.0 - anger);
    vec2 iris = (pixel - center - offset) / vec2(33.5, 38.0);
    float radius = length(iris);
    vec3 white = mix(vec3(0.74, 0.75, 0.79), vec3(0.98, 0.99, 1.0), smoothstep(647.0, 673.0, pixel.y));
    vec3 ink = vec3(0.075, 0.12, 0.15);
    vec3 cyan = mix(vec3(0.10, 0.23, 0.29), vec3(0.42, 0.85, 0.92), smoothstep(-0.65, 0.7, iris.y));
    float strands = sin(atan(iris.y, iris.x) * 34.0 + radius * 8.0);
    cyan += strands * 0.035 * smoothstep(0.35, 0.65, radius);
    cyan = mix(cyan, ink, smoothstep(0.80, 0.93, radius));
    cyan = mix(cyan, ink, ellipse(iris, vec2(0.0, -0.05), vec2(0.23, 0.61)));
    cyan = mix(cyan, vec3(0.74, 0.97, 1.0), ellipse(iris, vec2(-0.32, 0.49), vec2(0.13, 0.23)) * 0.75);
    cyan = mix(cyan, vec3(0.82, 0.99, 1.0), ellipse(iris, vec2(0.35, 0.53), vec2(0.12, 0.19)) * 0.85);
    cyan = mix(cyan, vec3(1.0), ellipse(iris, vec2(-0.36, -0.35), vec2(0.30, 0.16)));
    cyan = mix(cyan, vec3(0.98), ellipse(iris, vec2(0.35, -0.27), vec2(0.055, 0.075)));
    return linearColor(mix(white, cyan, 1.0 - smoothstep(0.97, 1.0, radius)));
  }

  void main() {
    vec4 color = texture2D(naturalMap, vUv);
    float opening = texture2D(eyeOpenings, vUv).r;
    if (opening > 0.001) {
      vec2 pixel = vec2(vUv.x, 1.0 - vUv.y) * 1254.0;
      vec2 center = pixel.x < 627.0 ? vec2(523.0, 672.0) : vec2(758.0, 671.0);
      color.rgb = mix(color.rgb, eyeball(pixel, center), opening);
    }
    // The expression stays within the face; the mechanical frame and hair
    // remain anchored to the neutral artwork outside this feathered region.
    float faceMask = 1.0 - smoothstep(0.72, 1.0, length((vUv - vec2(0.5, 0.43)) / vec2(0.24, 0.22)));
    if (offline > 0.001) {
      vec2 pixel = vec2(vUv.x, 1.0 - vUv.y) * 1254.0;
      float eyelids = max(
        ellipse(pixel, vec2(523.0, 675.0), vec2(112.0, 58.0)),
        ellipse(pixel, vec2(758.0, 675.0), vec2(112.0, 58.0))
      );
      // Replace only the eyes so the edited portrait cannot shift her brows,
      // mechanical frame, mouth or hair during the expression change.
      color = mix(color, texture2D(offlineMap, vUv), offline * eyelids);
    }
    if (anger > 0.001) color = mix(color, texture2D(angryMap, vUv), anger * faceMask);
    gl_FragColor = color;
    #include <colorspace_fragment>
  }
`;

// A finely divided, textured surface: deform the face itself instead of moving
// a rectangular image. Artwork remains the fallback if WebGL is unavailable.
export default function TaliaFaceWarp({
  mood,
  angry,
  gazeX,
  gazeY,
  pullX,
  pullY,
  anchorX,
  anchorY,
  enabled,
  visible,
  onReady,
}) {
  const host = useRef(null);
  const schedule = useRef(null);
  const visibility = useRef(visible);
  visibility.current = visible;
  const anger = useMotionValue(0);
  const offline = useMotionValue(0);
  const values = useMemo(
    () => [anger, offline, gazeX, gazeY, pullX, pullY, anchorX, anchorY],
    [anger, offline, gazeX, gazeY, pullX, pullY, anchorX, anchorY],
  );

  useEffect(() => {
    const control = animate(anger, angry || mood === "angry" ? 1 : 0, {
      duration: enabled ? (angry ? 0.1 : 0.18) : 0,
    });
    return () => control.stop();
  }, [angry, mood, enabled, anger]);

  useEffect(() => {
    const control = animate(offline, mood === "offline" && !angry ? 1 : 0, {
      duration: enabled ? 0.2 : 0,
    });
    return () => control.stop();
  }, [angry, mood, enabled, offline]);

  useEffect(() => {
    schedule.current?.();
  }, [visible, enabled]);

  useEffect(() => {
    const container = host.current;
    let renderer, geometry, material, observer;
    let disposed = false,
      loaded = false,
      lost = false,
      ready = false,
      frame = 0;
    const textures = [];
    const cleanups = [];
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.1, 2);
    camera.position.z = 1;
    const setReady = (value) => {
      if (ready !== value) {
        ready = value;
        onReady(value);
      }
    };
    const draw = () => {
      frame = 0;
      if (disposed || lost || !loaded || !visibility.current || document.hidden)
        return;
      const uniforms = material.uniforms;
      uniforms.anger.value = anger.get();
      uniforms.offline.value = offline.get();
      uniforms.gaze.value.set(gazeX.get(), gazeY.get());
      uniforms.grab.value.set(anchorX.get(), anchorY.get());
      uniforms.pull.value.set(pullX.get(), pullY.get());
      try {
        renderer.render(scene, camera);
        if (!lost) setReady(true);
      } catch {
        lost = true;
        setReady(false);
      }
    };
    const requestDraw = () => {
      if (!disposed && !frame) frame = requestAnimationFrame(draw);
    };
    schedule.current = requestDraw;

    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "low-power",
      });
      renderer.setPixelRatio(
        Math.min(Math.max(window.devicePixelRatio || 1, 1.5), 2),
      );
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.debug.onShaderError = () => {
        lost = true;
        setReady(false);
      };
      renderer.setClearColor(0x000000, 0);
      renderer.domElement.setAttribute("aria-hidden", "true");
      container.appendChild(renderer.domElement);
      geometry = new THREE.PlaneGeometry(1, 1, 96, 96);
      material = new THREE.ShaderMaterial({
        transparent: true,
        depthTest: false,
        depthWrite: false,
        uniforms: {
          naturalMap: { value: null },
          angryMap: { value: null },
          offlineMap: { value: null },
          eyeOpenings: { value: null },
          anger: { value: 0 },
          offline: { value: 0 },
          gaze: { value: new THREE.Vector2() },
          grab: { value: new THREE.Vector2(0.37, 0.35) },
          pull: { value: new THREE.Vector2() },
        },
        vertexShader,
        fragmentShader,
      });
      scene.add(new THREE.Mesh(geometry, material));
      const loader = new THREE.TextureLoader();
      Promise.all(
        texturesToLoad.map(
          ([uniform, file]) =>
            new Promise((resolve, reject) => {
              const texture = loader.load(
                `/work/motion-lab/talia/${file}`,
                () => {
                  if (disposed) {
                    texture.dispose();
                    return;
                  }
                  texture.colorSpace =
                    uniform === "eyeOpenings"
                      ? THREE.NoColorSpace
                      : THREE.SRGBColorSpace;
                  texture.generateMipmaps = true;
                  texture.minFilter = THREE.LinearMipmapLinearFilter;
                  resolve(texture);
                },
                undefined,
                reject,
              );
              textures.push(texture);
            }),
        ),
      )
        .then((maps) => {
          if (disposed) return;
          texturesToLoad.forEach(([name], i) => {
            material.uniforms[name].value = maps[i];
          });
          loaded = true;
          requestDraw();
        })
        .catch(() => {
          if (!disposed) setReady(false);
        });

      const resize = () => {
        const width = container.clientWidth;
        const height = container.clientHeight;
        if (width && height) renderer.setSize(width, height, false);
        requestDraw();
      };
      observer = new ResizeObserver(resize);
      observer.observe(container);
      cleanups.push(...values.map((value) => value.on("change", requestDraw)));
      document.addEventListener("visibilitychange", requestDraw);
      cleanups.push(() =>
        document.removeEventListener("visibilitychange", requestDraw),
      );
      const onLost = (event) => {
        event.preventDefault();
        lost = true;
        setReady(false);
      };
      const onRestored = () => {
        lost = false;
        requestDraw();
      };
      renderer.domElement.addEventListener("webglcontextlost", onLost);
      renderer.domElement.addEventListener("webglcontextrestored", onRestored);
      cleanups.push(() => {
        renderer.domElement.removeEventListener("webglcontextlost", onLost);
        renderer.domElement.removeEventListener(
          "webglcontextrestored",
          onRestored,
        );
      });
      resize();
    } catch {
      setReady(false);
    }
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      schedule.current = null;
      observer?.disconnect();
      cleanups.forEach((cleanup) => cleanup());
      textures.forEach((texture) => texture.dispose());
      geometry?.dispose();
      material?.dispose();
      renderer?.dispose();
      renderer?.domElement.remove();
    };
  }, [values, anger, offline, gazeX, gazeY, pullX, pullY, anchorX, anchorY, onReady]);

  return <div ref={host} className="talia-face-warp" aria-hidden="true" />;
}
