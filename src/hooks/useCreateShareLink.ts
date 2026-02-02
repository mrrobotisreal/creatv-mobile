import { useMutation } from "@tanstack/react-query";

import { createShareLink } from "../lib/sharingApi";
import type { CreateShareLinkRequest, CreateShareLinkResponse } from "../types/share_links";

export function useCreateShareLink() {
  return useMutation<CreateShareLinkResponse, Error, CreateShareLinkRequest>({
    mutationFn: (req) => createShareLink(req),
  });
}
