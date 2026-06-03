"use client";

import {
  animate,
  easeIn,
  mix,
  motion,
  progress,
  useMotionValue,
  useReducedMotion,
  useTransform,
  wrap,
} from "motion/react";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

const PORTRAIT_RATIO = 3 / 4;
const MAX_STACK_IMAGES = 10;

type CardStackImage = { src: string; ratio: number };

interface CardStackProps {
  images: CardStackImage[];
  maxRotate?: number;
}

/** motion.dev card stack — https://motion.dev/tutorials/react-card-stack */
function CardStack({ images, maxRotate = 5 }: CardStackProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const ref = useRef<HTMLUListElement>(null);
  const [width, setWidth] = useState(400);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const update = () => setWidth(element.offsetWidth);
    update();

    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setCurrentIndex(0);
  }, [images]);

  return (
    <ul className="headshot-card-stack" ref={ref}>
      {images.map((image, index) => (
        <StackImage
          {...image}
          minDistance={width * 0.5}
          maxRotate={maxRotate}
          key={`${image.src}-${index}`}
          index={index}
          currentIndex={currentIndex}
          totalImages={images.length}
          setNextImage={() => {
            setCurrentIndex(wrap(0, images.length, currentIndex + 1));
          }}
        />
      ))}
    </ul>
  );
}

interface StackImageProps {
  src: string;
  ratio: number;
  index: number;
  totalImages: number;
  currentIndex: number;
  maxRotate: number;
  minDistance?: number;
  minSpeed?: number;
  setNextImage: () => void;
}

function StackImage({
  src,
  ratio,
  index,
  currentIndex,
  totalImages,
  maxRotate,
  setNextImage,
  minDistance = 400,
  minSpeed = 50,
}: StackImageProps) {
  const baseRotation = mix(0, maxRotate, Math.sin(index));
  const x = useMotionValue(0);
  const rotate = useTransform(x, [0, 400], [baseRotation, baseRotation + 10], { clamp: false });
  const zIndex = totalImages - wrap(totalImages, 0, index - currentIndex + 1);

  const onDragEnd = () => {
    const distance = Math.abs(x.get());
    const speed = Math.abs(x.getVelocity());

    if (distance > minDistance || speed > minSpeed) {
      setNextImage();
      animate(x, 0, { type: "spring", stiffness: 600, damping: 50 });
    } else {
      animate(x, 0, { type: "spring", stiffness: 300, damping: 50 });
    }
  };

  const opacity = progress(totalImages * 0.25, totalImages * 0.75, zIndex);
  const progressInStack = progress(0, totalImages - 1, zIndex);
  const scale = mix(0.5, 1, easeIn(progressInStack));
  const isTop = index === currentIndex;

  return (
    <motion.li
      className="headshot-card-stack__item relative"
      style={{
        width: ratio > 1 ? "100%" : "auto",
        height: ratio <= 1 ? "100%" : "auto",
        aspectRatio: ratio,
        zIndex,
        rotate,
        x,
      }}
      initial={{ opacity: 0, scale: 0.3 }}
      animate={{ opacity, scale }}
      whileTap={isTop ? { scale: 0.98 } : {}}
      transition={{ type: "spring", stiffness: 600, damping: 30 }}
      drag={isTop ? "x" : false}
      onDragEnd={onDragEnd}
    >
      <Image
        src={src}
        fill
        alt=""
        className="object-cover select-none"
        sizes="(max-width: 1024px) 90vw, 560px"
        unoptimized
        onPointerDown={(event) => event.preventDefault()}
      />
    </motion.li>
  );
}

const stackShellClass =
  "relative mx-auto w-full max-w-[min(400px,90vw)] aspect-square max-h-[min(400px,70vw)]";

export function HeadshotCardStack({
  images,
  fallbackSrc,
  fallbackAlt = "Professional dance talent portrait",
}: {
  images: string[];
  fallbackSrc?: string;
  fallbackAlt?: string;
}) {
  const reduceMotion = useReducedMotion();

  const stackImages = useMemo((): CardStackImage[] => {
    const unique = [...new Set(images.filter(Boolean))].slice(0, MAX_STACK_IMAGES);
    const sources = unique.length ? unique : fallbackSrc ? [fallbackSrc] : [];
    return sources.map((src) => ({ src, ratio: PORTRAIT_RATIO }));
  }, [images, fallbackSrc]);

  if (!stackImages.length) return null;

  if (reduceMotion || stackImages.length === 1) {
    const top = stackImages[0];
    return (
      <div className={stackShellClass}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={top.src}
          alt={fallbackAlt}
          className="headshot-card-stack__item-static h-full w-full rounded-[10px] object-cover"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div className={stackShellClass}>
      <CardStack images={stackImages} maxRotate={5} />
    </div>
  );
}
