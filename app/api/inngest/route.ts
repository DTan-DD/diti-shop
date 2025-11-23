import { serve } from "inngest/next";
import { autoCancelOrder } from "@/inngest/orderTimeout";
import { inngest } from "@/inngest/client";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [autoCancelOrder],
});
