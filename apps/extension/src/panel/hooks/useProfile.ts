import { useQuery } from "@tanstack/react-query";
import { loadNormalizedProfile, type NormalizedProfile } from "@/lib/autofill/profile";

export function useProfile() {
  const query = useQuery({
    queryKey: ["profile"],
    queryFn: loadNormalizedProfile,
    staleTime: 1000 * 60 * 5,
  });

  return {
    profile: query.data ?? null,
    status: query.status,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

export type { NormalizedProfile };
