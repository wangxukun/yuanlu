const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
export async function fetchOnlineUsers() {
  const res = await fetch(`${baseUrl}/api/auth/online-users`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  const data = await res.json();
  const numberOfOnlineUsers = data.count;
  const onlineUsers = data.users;
  if (!res.ok) {
    return null;
  }
  return {
    numberOfOnlineUsers,
    onlineUsers,
  };
}
