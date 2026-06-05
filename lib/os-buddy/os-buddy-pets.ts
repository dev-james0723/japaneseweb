import type { OSBuddyPetId } from "./os-buddy-types";

export type OSBuddyPet = {
  id: OSBuddyPetId;
  name: string;
  description: string;
};

export const OS_BUDDY_PETS: OSBuddyPet[] = [
  {
    id: "xiaoba",
    name: "小八",
    description: "陪你開機、複習、採句同輸出嘅像素學習夥伴。",
  },
  {
    id: "doge",
    name: "Doge",
    description: "更活潑嘅學習夥伴，適合需要多一點能量嘅日文日。",
  },
];

export function getOSBuddyPet(id: OSBuddyPetId): OSBuddyPet {
  return OS_BUDDY_PETS.find((pet) => pet.id === id) ?? OS_BUDDY_PETS[0];
}

