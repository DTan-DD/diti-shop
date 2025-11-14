// hooks/useUpdateProfile.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateUserProfile } from "@/lib/actions/user.actions";

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    // mutationFn: updateUserAddress, // ✅ Directly use server action
    mutationFn: updateUserProfile, // ✅ Directly use server action
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", "profile"] });
    },
  });
}
