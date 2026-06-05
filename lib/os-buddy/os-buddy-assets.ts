import type { OSBuddyAnimationState, OSBuddyPetId } from "./os-buddy-types";

export function osBuddySpriteSrc(petId: OSBuddyPetId, animation: OSBuddyAnimationState): string {
  return `/os-buddy/pets/${petId}/${animation}.gif`;
}

export const OS_BUDDY_CLEAN_DESK_ASSETS = {
  messy: "/assets/os-buddy/clean-desk/desk-messy.png",
  clean: "/assets/os-buddy/clean-desk/desk-clean.png",
};

