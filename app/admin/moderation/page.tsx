import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import { ModerationDashboard } from "./moderation-dashboard";
import "./moderation.css";

export default async function ModerationPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/community");
  const { data: allowed } = await supabase.rpc("is_moderator");
  if (!allowed) redirect("/community");
  return <ModerationDashboard email={auth.user.email || "Moderator"} />;
}
