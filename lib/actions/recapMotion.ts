"use server";

import { revalidatePath } from "next/cache";
import {
  requestDailyRecapVideo,
  requestWeeklyRecapVideo,
} from "@/lib/motion/learnerRecapJobs";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function getUserClient() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function requestDailyRecapVideoAction(formData: FormData) {
  void formData;
  const { supabase, user } = await getUserClient();
  if (!user) return;

  const recap = await requestDailyRecapVideo({ supabase, userId: user.id });
  if (!recap) return;

  revalidatePath("/motion");
}

export async function requestWeeklyRecapVideoAction(formData: FormData) {
  void formData;
  const { supabase, user } = await getUserClient();
  if (!user) return;

  const recap = await requestWeeklyRecapVideo({ supabase, userId: user.id });
  if (!recap) return;

  revalidatePath("/motion");
}
