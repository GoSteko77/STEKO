import { WEB_BASE_URL } from "@/constants/config";

export function redirectSystemPath({ path, initial }: { path: string; initial: boolean }) {
  return WEB_BASE_URL + "/";
}
