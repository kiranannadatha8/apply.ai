import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getDomainMappings,
  setDomainAutoApply,
} from "@/lib/storage/fieldMappingStore";

export function useDomainAutoApply(domain: string | null) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["domain-auto-apply", domain],
    queryFn: async () => {
      if (!domain) return true;
      const mapping = await getDomainMappings(domain);
      return mapping.autoApply;
    },
    enabled: Boolean(domain),
  });

  const mutation = useMutation({
    mutationFn: async (next: boolean) => {
      if (!domain) return next;
      await setDomainAutoApply(domain, next);
      return next;
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["domain-auto-apply", domain],
      });
    },
  });

  return {
    autoApply: query.data ?? true,
    isLoading: query.isLoading,
    toggle: (next: boolean) => mutation.mutate(next),
    isUpdating: mutation.isPending,
  };
}
