import { auth } from "@/auth";
import UserButtonClient from "./user-button-client";

interface UserButtonProps {
  onSelect?: () => void;
}

export default async function UserButton({ onSelect }: UserButtonProps) {
  // Pre-fetch session ở server
  const session = await auth();

  // Pass session như prop hoặc dùng SessionProvider
  return <UserButtonClient onSelect={onSelect} session={session} />;
}
