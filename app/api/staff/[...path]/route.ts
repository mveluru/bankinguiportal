import { proxyToBff } from "@/lib/bff-proxy";

const handle = async (request: Request, { params }: { params: Promise<{ path: string[] }> }) =>
  proxyToBff(request, "staff", (await params).path);

export { handle as GET, handle as POST, handle as PUT, handle as PATCH };
