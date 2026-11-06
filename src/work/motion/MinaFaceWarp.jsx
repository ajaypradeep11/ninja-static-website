import { useEffect, useMemo, useRef } from "react";
import { animate, useMotionValue } from "motion/react";
import * as THREE from "three";

const names = ["neutral", "blue", "wink", "pout"];
const texturesToLoad = [
  ["naturalMap", "neutral.webp"],
  ["blueMap", "blue.webp"],
  ["winkMap", "wink.webp"],
  ["poutMap", "pout.webp"],
  ["angryMap", "angry.webp"],
  ["eyeOpenings", "eye-openings.svg"],
];
const vertexShader = `
  uniform vec2 grab;
  uniform vec2 pull;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec2 distanceFromGrab = (uv - grab) / vec2(0.22, 0.19);
    float falloff = pow(max(0.0, 1.0 - dot(distanceFromGrab, distanceFromGrab)), 2.0);
    vec3 displaced = position;
    displaced.xy += pull * falloff;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`;
const fragmentShader = `
  uniform sampler2D naturalMap;
  uniform sampler2D blueMap;
  uniform sampler2D winkMap;
  uniform sampler2D poutMap;
  uniform sampler2D angryMap;
  uniform sampler2D eyeOpenings;
  uniform float anger;
  uniform vec4 weights;
  uniform vec2 gaze;
  varying vec2 vUv;

  vec2 portraitUv(vec2 pixel) {
    return vec2(pixel.x, 1254.0 - pixel.y) / 1254.0;
  }

  vec3 eyeball(vec2 pixel, vec2 center) {
    // A continuous, stationary white layer sampled from either side of the
    // original iris avoids leaving its circular footprint behind during gaze.
    vec2 whiteSample = center + vec2(0.0, 8.0);
    vec3 leftWhite = texture2D(naturalMap, portraitUv(whiteSample - vec2(38.0, 0.0))).rgb;
    vec3 rightWhite = texture2D(naturalMap, portraitUv(whiteSample + vec2(38.0, 0.0))).rgb;
    vec3 white = mix(leftWhite, rightWhite, clamp((pixel.x - center.x + 45.0) / 90.0, 0.0, 1.0));
    float sideShadow = 1.0 - 0.18 * pow(clamp(abs(pixel.x - center.x) / 58.0, 0.0, 1.0), 2.0);
    white *= mix(0.48, 1.08, smoothstep(center.y - 24.0, center.y + 15.0, pixel.y)) * sideShadow;

    vec2 offset = gaze * vec2(14.0, -6.0) * (1.0 - anger);
    vec2 source = pixel - offset;
    float radius = length(source - center);
    vec2 sourceUv = portraitUv(source);
    vec3 iris = texture2D(naturalMap, sourceUv).rgb;
    // Complete the tiny upper arc hidden by the original eyelid from the lower
    // iris texture; skin and lashes never move with a downward glance.
    float covered = (1.0 - smoothstep(0.05, 0.95, texture2D(eyeOpenings, sourceUv).r)) * step(source.y, center.y);
    vec2 reflected = vec2(source.x, center.y + abs(source.y - center.y));
    iris = mix(iris, texture2D(naturalMap, portraitUv(reflected)).rgb * 0.7, covered);
    return mix(white, iris, 1.0 - smoothstep(30.0, 31.5, radius));
  }

  void main() {
    vec4 color = vec4(0.0);
    if (weights.x > 0.001) color += texture2D(naturalMap, vUv) * weights.x;
    if (weights.y > 0.001) color += texture2D(blueMap, vUv) * weights.y;
    if (weights.z > 0.001) color += texture2D(winkMap, vUv) * weights.z;
    if (weights.w > 0.001) color += texture2D(poutMap, vUv) * weights.w;
    float opening = texture2D(eyeOpenings, vUv).r;
    float gazeWeight = weights.x + weights.y;
    if (opening > 0.001 && gazeWeight > 0.001) {
      vec2 pixel = vec2(vUv.x, 1.0 - vUv.y) * 1254.0;
      vec2 center = pixel.x < 627.0 ? vec2(502.0, 598.0) : vec2(776.0, 596.0);
      color.rgb = mix(color.rgb, eyeball(pixel, center), opening * gazeWeight);
    }
    // Keep the selected hair color and silhouette while the face reacts.
    float faceMask = 1.0 - smoothstep(0.74, 1.0, length((vUv - vec2(0.5, 0.48)) / vec2(0.24, 0.31)));
    if (anger > 0.001) color = mix(color, texture2D(angryMap, vUv), anger * faceMask);
    gl_FragColor = color;
    #include <colorspace_fragment>
  }
`;

// A finely divided, textured surface: deform the face itself instead of moving
// a rectangular image. Artwork remains the fallback if WebGL is unavailable.
export default function MinaFaceWarp({
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
  const natural = useMotionValue(1);
  const blue = useMotionValue(0);
  const wink = useMotionValue(0);
  const pout = useMotionValue(0);
  const anger = useMotionValue(0);
  const weights = useMemo(
    () => [natural, blue, wink, pout],
    [natural, blue, wink, pout],
  );
  const values = useMemo(
    () => [...weights, anger, gazeX, gazeY, pullX, pullY, anchorX, anchorY],
    [weights, anger, gazeX, gazeY, pullX, pullY, anchorX, anchorY],
  );

  useEffect(() => {
    const controls = weights.map((weight, i) =>
      animate(weight, names[i] === mood ? 1 : 0, {
        duration: enabled ? 0.16 : 0,
      }),
    );
    return () => controls.forEach((control) => control.stop());
  }, [mood, enabled, weights]);

  useEffect(() => {
    const control = animate(anger, angry ? 1 : 0, {
      duration: enabled ? (angry ? 0.1 : 0.18) : 0,
    });
    return () => control.stop();
  }, [angry, enabled, anger]);

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
      uniforms.weights.value.set(...weights.map((value) => value.get()));
      uniforms.anger.value = anger.get();
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
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
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
          blueMap: { value: null },
          winkMap: { value: null },
          poutMap: { value: null },
          angryMap: { value: null },
          eyeOpenings: { value: null },
          anger: { value: 0 },
          weights: { value: new THREE.Vector4(1, 0, 0, 0) },
          gaze: { value: new THREE.Vector2() },
          grab: { value: new THREE.Vector2(0.34, 0.36) },
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
                `/work/motion-lab/mina/${file}`,
                () => {
                  if (disposed) {
                    texture.dispose();
                    return;
                  }
                  texture.colorSpace =
                    uniform === "eyeOpenings"
                      ? THREE.NoColorSpace
                      : THREE.SRGBColorSpace;
                  texture.generateMipmaps = false;
                  texture.minFilter = THREE.LinearFilter;
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
        const { width, height } = container.getBoundingClientRect();
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
  }, [
    values,
    weights,
    anger,
    gazeX,
    gazeY,
    pullX,
    pullY,
    anchorX,
    anchorY,
    onReady,
  ]);

  return <div ref={host} className="mina-face-warp" aria-hidden="true" />;
}
