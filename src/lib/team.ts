import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useTeam() {
  return useQuery({
    queryKey: ["team-list"],
    staleTime: 60000,
    queryFn: async () => {
      const { data } = await supabase.rpc("list_team");
      return (data ?? []) as { user_id: string; email: string | null }[];
    },
  });
}
