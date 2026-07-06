"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

import "./hero-shader-video.css";

type HeroShaderVideoBackgroundProps = {
  src: string;
  poster: string;
  alt: string;
};

const VERTEX_SHADER = `
attribute vec2 a_position;
attribute vec2 a_uv;
varying vec2 v_uv;

void main() {
  v_uv = a_uv;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision mediump float;

uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform vec2 u_mediaSize;
uniform float u_time;

varying vec2 v_uv;

// object-fit: cover — scale uniformly, crop overflow on the limiting axis
vec2 coverUV(vec2 uv, vec2 canvasSize, vec2 mediaSize) {
  float ratio = max(canvasSize.x / max(mediaSize.x, 1.0), canvasSize.y / max(mediaSize.y, 1.0));
  vec2 scale = mediaSize * ratio / canvasSize;
  return (uv - 0.5) / scale + 0.5;
}

void main() {
  vec2 uv = coverUV(v_uv, u_resolution, u_mediaSize);

  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    gl_FragColor = vec4(0.04, 0.04, 0.04, 1.0);
    return;
  }

  float aberration = 0.0018;
  vec3 color;
  color.r = texture2D(u_texture, uv + vec2(aberration, 0.0)).r;
  color.g = texture2D(u_texture, uv).g;
  color.b = texture2D(u_texture, uv - vec2(aberration, 0.0)).b;

  color = pow(color, vec3(1.12));
  color *= vec3(0.9, 0.96, 1.0);

  float luma = dot(color, vec3(0.299, 0.587, 0.114));
  color = mix(color, color * vec3(0.72, 1.08, 0.96), smoothstep(0.0, 0.5, 1.0 - luma) * 0.42);

  vec2 vignette = v_uv - 0.5;
  float vignetteStrength = 1.0 - dot(vignette, vignette) * 1.45;
  color *= clamp(vignetteStrength, 0.22, 1.0);

  float grain = fract(sin(dot(v_uv * u_resolution + u_time * 40.0, vec2(12.9898, 78.233))) * 43758.5453);
  color += (grain - 0.5) * 0.055;

  color *= 0.68;

  gl_FragColor = vec4(color, 1.0);
}
`;

function createShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

function createProgram(gl: WebGLRenderingContext) {
  const vertex = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = createShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  if (!vertex || !fragment) return null;

  const program = gl.createProgram();
  if (!program) return null;

  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }

  gl.deleteShader(vertex);
  gl.deleteShader(fragment);

  return program;
}

export function HeroShaderVideoBackground({ src, poster, alt }: HeroShaderVideoBackgroundProps) {
  const reduceMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [usePoster, setUsePoster] = useState(reduceMotion === true);

  useEffect(() => {
    if (reduceMotion) {
      setUsePoster(true);
    }
  }, [reduceMotion]);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas || usePoster) return;

    const video = videoRef.current;
    const image = new Image();
    image.src = poster;

    let media: HTMLVideoElement | HTMLImageElement | null = video;
    let mediaReady = false;
    let raf = 0;
    let gl: WebGLRenderingContext | null = null;
    let program: WebGLProgram | null = null;
    let texture: WebGLTexture | null = null;
    const start = performance.now();

    const bootMedia = () => {
      if (!video) return;

      const playAttempt = video.play();
      if (playAttempt) {
        playAttempt.catch(() => {
          media = image;
          mediaReady = image.complete;
        });
      }
    };

    const onVideoReady = () => {
      media = video;
      mediaReady = true;
    };

    const onVideoError = () => {
      media = image;
      mediaReady = image.complete;
    };

    const initGl = () => {
      gl = canvas.getContext("webgl", { alpha: false, antialias: false });
      if (!gl) return false;

      program = createProgram(gl);
      if (!program) return false;

      const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
      const uvs = new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]);

      const positionBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

      const positionLoc = gl.getAttribLocation(program, "a_position");
      gl.enableVertexAttribArray(positionLoc);
      gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

      const uvBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);

      const uvLoc = gl.getAttribLocation(program, "a_uv");
      gl.enableVertexAttribArray(uvLoc);
      gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);

      texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

      return true;
    };

    const resize = () => {
      const rect = root.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.floor(rect.width * dpr));
      const height = Math.max(1, Math.floor(rect.height * dpr));

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
      }

      if (gl) {
        gl.viewport(0, 0, width, height);
      }
    };

    const draw = (time: number) => {
      if (!gl || !program || !texture || !media || !mediaReady) {
        raf = window.requestAnimationFrame(draw);
        return;
      }

      const width = media instanceof HTMLVideoElement ? media.videoWidth : media.naturalWidth;
      const height = media instanceof HTMLVideoElement ? media.videoHeight : media.naturalHeight;

      if (width < 1 || height < 1) {
        raf = window.requestAnimationFrame(draw);
        return;
      }

      gl.useProgram(program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, media);

      gl.uniform1i(gl.getUniformLocation(program, "u_texture"), 0);
      gl.uniform2f(gl.getUniformLocation(program, "u_resolution"), canvas.width, canvas.height);
      gl.uniform2f(gl.getUniformLocation(program, "u_mediaSize"), width, height);
      gl.uniform1f(gl.getUniformLocation(program, "u_time"), (time - start) / 1000);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      raf = window.requestAnimationFrame(draw);
    };

    if (!initGl()) return undefined;

    resize();

    if (video) {
      video.addEventListener("loadeddata", onVideoReady);
      video.addEventListener("error", onVideoError);
      if (video.readyState >= 2) onVideoReady();
      bootMedia();
    }

    if (image.complete) {
      if (!mediaReady) {
        media = image;
        mediaReady = true;
      }
    } else {
      image.onload = () => {
        if (!mediaReady) {
          media = image;
          mediaReady = true;
        }
      };
    }

    const observer = new ResizeObserver(resize);
    observer.observe(root);
    raf = window.requestAnimationFrame(draw);

    return () => {
      window.cancelAnimationFrame(raf);
      observer.disconnect();
      if (video) {
        video.removeEventListener("loadeddata", onVideoReady);
        video.removeEventListener("error", onVideoError);
        video.pause();
      }
      if (gl && texture) gl.deleteTexture(texture);
      if (gl && program) gl.deleteProgram(program);
    };
  }, [poster, usePoster]);

  if (usePoster) {
    return (
      <div ref={rootRef} className="hero-shader-video" aria-hidden>
        <div
          className="hero-shader-video__poster"
          style={{ backgroundImage: `url(${poster})` }}
          role="img"
          aria-label={alt}
        />
        <div className="hero-shader-video__poster-grade" />
      </div>
    );
  }

  return (
    <div ref={rootRef} className="hero-shader-video" aria-hidden>
      <video
        ref={videoRef}
        className="hero-shader-video__source"
        src={src}
        poster={poster}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
      />
      <canvas ref={canvasRef} className="hero-shader-video__canvas" />
      <span className="sr-only">{alt}</span>
    </div>
  );
}
