import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { useMotionEnabled } from "./runtime.jsx";

// One lifecycle for all specimens: bounded GPU work, reactive accessibility,
// demand rendering while paused, and deterministic cleanup on navigation.
export default function Scene({
  build,
  settings = {},
  label = "Interactive 3D artwork",
  className = "",
}) {
  const host = useRef(null);
  const enabled = useMotionEnabled();
  const state = useRef({ settings, enabled });
  const renderOnce = useRef(null);
  const [status, setStatus] = useState("loading");
  state.current = { settings, enabled };
  useEffect(() => {
    renderOnce.current?.();
  }, [settings, enabled]);
  useEffect(() => {
    const container = host.current;
    let renderer,
      environment,
      generator,
      model,
      raf = 0,
      disposed = false;
    let visible = true,
      time = 0,
      last = 0;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 0, 7);
    const pointer = { x: 0, y: 0 };
    const cleanups = [];
    const frame = (stamp = performance.now()) => {
      if (disposed || !renderer) return;
      const active = state.current.enabled && visible && !document.hidden;
      const delta = last && active ? Math.min((stamp - last) / 1000, 0.05) : 0;
      last = stamp;
      time += delta;
      try {
        model?.update?.({
          time,
          delta,
          pointer: state.current.enabled ? pointer : { x: 0, y: 0 },
          settings: state.current.settings,
          reducedMotion: !state.current.enabled,
        });
        renderer.render(scene, camera);
      } catch (error) {
        console.error("Motion Lab scene render failed", error);
        setStatus("fallback");
        return;
      }
      if (active) raf = requestAnimationFrame(frame);
    };
    const wake = () => {
      cancelAnimationFrame(raf);
      last = 0;
      frame();
    };
    renderOnce.current = wake;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "low-power",
      });
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      container.appendChild(renderer.domElement);
      const room = new RoomEnvironment();
      generator = new THREE.PMREMGenerator(renderer);
      environment = generator.fromScene(room, 0.04);
      scene.environment = environment.texture;
      room.dispose();
      scene.add(new THREE.HemisphereLight(0xeef4ff, 0x747086, 2));
      const key = new THREE.DirectionalLight(0xffffff, 3);
      key.position.set(4, 6, 5);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0xbacfff, 2);
      rim.position.set(-4, 2, -2);
      scene.add(rim);
      model = build({ THREE, scene, camera, renderer });
      const resize = () => {
        const { width, height } = container.getBoundingClientRect();
        if (!width || !height) return;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        wake();
      };
      const observer = new ResizeObserver(resize);
      observer.observe(container);
      cleanups.push(() => observer.disconnect());
      const intersection = new IntersectionObserver(
        ([entry]) => {
          visible = entry.isIntersecting;
          wake();
        },
        { rootMargin: "80px" },
      );
      intersection.observe(container);
      cleanups.push(() => intersection.disconnect());
      const move = (e) => {
        const rect = container.getBoundingClientRect();
        pointer.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        pointer.y = -((e.clientY - rect.top) / rect.height - 0.5) * 2;
      };
      const leave = () => {
        pointer.x = 0;
        pointer.y = 0;
      };
      container.addEventListener("pointermove", move, { passive: true });
      container.addEventListener("pointerleave", leave);
      cleanups.push(() => {
        container.removeEventListener("pointermove", move);
        container.removeEventListener("pointerleave", leave);
      });
      document.addEventListener("visibilitychange", wake);
      cleanups.push(() =>
        document.removeEventListener("visibilitychange", wake),
      );
      const lost = (e) => {
        e.preventDefault();
        cancelAnimationFrame(raf);
        setStatus("fallback");
      };
      const restored = () => {
        setStatus("ready");
        wake();
      };
      renderer.domElement.addEventListener("webglcontextlost", lost);
      renderer.domElement.addEventListener("webglcontextrestored", restored);
      cleanups.push(() => {
        renderer.domElement.removeEventListener("webglcontextlost", lost);
        renderer.domElement.removeEventListener(
          "webglcontextrestored",
          restored,
        );
      });
      resize();
      setStatus("ready");
    } catch (error) {
      console.warn("Motion Lab 3D unavailable; using static artwork.", error);
      setStatus("fallback");
    }
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      renderOnce.current = null;
      cleanups.forEach((fn) => fn());
      model?.dispose?.();
      const resources = new Set();
      scene.traverse((obj) => {
        if (obj.geometry) resources.add(obj.geometry);
        const materials = Array.isArray(obj.material)
          ? obj.material
          : [obj.material];
        materials.filter(Boolean).forEach((mat) => {
          Object.values(mat).forEach((value) => {
            if (value?.isTexture && value !== environment?.texture)
              resources.add(value);
          });
          resources.add(mat);
        });
      });
      resources.forEach((resource) => resource.dispose());
      environment?.dispose();
      generator?.dispose();
      renderer?.dispose();
      renderer?.domElement.remove();
    };
  }, [build]);
  return (
    <div
      ref={host}
      className={`motion-scene ${className}`}
      data-status={status}
      role="img"
      aria-label={label}
    >
      <div className="motion-scene-fallback" aria-hidden="true">
        <span />
      </div>
    </div>
  );
}
