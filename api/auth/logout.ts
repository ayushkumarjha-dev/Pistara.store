import { handler } from "../../server-lib/http";
import { clearSession } from "../../server-lib/auth";

export default handler({
  methods: ["POST"],
  handler: async ({ res }) => {
    clearSession(res);
    return { ok: true };
  },
});
