"use client";

import Image from "next/image";
import { useState } from "react";
import { motion } from "motion/react";
import { animationForMood } from "@/lib/os-buddy/os-buddy-animation-map";
import { osBuddySpriteSrc } from "@/lib/os-buddy/os-buddy-assets";
import type { OSBuddyMood, OSBuddyPetId } from "@/lib/os-buddy/os-buddy-types";

export function OSBuddySprite({
  petId,
  mood,
  name,
  birthday = false,
  secret = false,
  size = 74,
}: {
  petId: OSBuddyPetId;
  mood: OSBuddyMood;
  name: string;
  birthday?: boolean;
  secret?: boolean;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const animation = animationForMood(mood);

  return (
    <motion.div
      className={[
        "os-buddy-sprite",
        birthday ? "os-buddy-sprite--birthday" : "",
        secret ? "os-buddy--secret" : "",
      ].join(" ")}
      animate={mood === "celebrating" || mood === "success" ? { y: [0, -7, 0] } : { y: 0 }}
      transition={{ duration: 0.72, repeat: mood === "celebrating" ? 2 : 0 }}
      aria-hidden="true"
      style={{ width: size, height: size }}
    >
      {failed ? (
        <div className="os-buddy-sprite-fallback" title={name}>
          {petId === "doge" ? "犬" : "日"}
        </div>
      ) : (
        <Image
          src={osBuddySpriteSrc(petId, animation)}
          alt=""
          width={96}
          height={96}
          unoptimized
          priority={false}
          className="os-buddy-sprite-img"
          onError={() => setFailed(true)}
        />
      )}
    </motion.div>
  );
}

