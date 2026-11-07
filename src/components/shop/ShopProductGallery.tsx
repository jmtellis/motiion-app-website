"use client";

import Image from "next/image";
import { useId, useState } from "react";

import { productImageViewLabel } from "@/lib/shop/gallery";
import type { ShopImage } from "@/lib/shop/types";

const EAGER_THUMB_COUNT = 4;

export function ShopProductGallery({ images, title }: { images: ShopImage[]; title: string }) {
  const [index, setIndex] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  const groupName = useId();
  const mediaId = useId();
  const selectedIndex = images.length === 0 ? 0 : Math.min(index, images.length - 1);
  const multiple = images.length > 1;

  return (
    <div className="shop-gallery">
      <div className="shop-detail__media" id={mediaId}>
        {images.map((image, imageIndex) => {
          const selected = imageIndex === selectedIndex;
          return (
            <Image
              key={image.src}
              src={image.src}
              alt={selected ? image.alt : ""}
              fill
              sizes="(max-width: 767px) 100vw, 56vw"
              {...(imageIndex === 0 ? { preload: true } : { loading: "eager" as const })}
              className={selected ? "shop-gallery__slide is-selected" : "shop-gallery__slide"}
              aria-hidden={selected ? undefined : true}
            />
          );
        })}
      </div>
      {multiple ? (
        <fieldset className="shop-gallery__views" aria-label={`${title} photos`}>
          <legend>Photos</legend>
          <div className="shop-gallery__options">
            {images.map((image, imageIndex) => {
              const label = productImageViewLabel(imageIndex);
              const checked = imageIndex === selectedIndex;
              return (
                <label key={image.src} className={checked ? "is-selected" : undefined}>
                  <input
                    type="radio"
                    name={groupName}
                    value={String(imageIndex)}
                    checked={checked}
                    aria-controls={mediaId}
                    onChange={() => {
                      setIndex(imageIndex);
                      setAnnouncement(`Showing ${label.toLowerCase()} photo`);
                    }}
                  />
                  <Image
                    src={image.src}
                    alt=""
                    width={32}
                    height={32}
                    className="shop-gallery__thumb"
                    loading={imageIndex < EAGER_THUMB_COUNT ? "eager" : "lazy"}
                  />
                  <span>{label}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ) : null}
      <p className="shop-gallery__status" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}
