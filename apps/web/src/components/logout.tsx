import { post } from "../app/api";
import { useAuth } from "../stores/auth";
export function LogoutBtn() {
  const set = useAuth((s) => s.setToken);
  return (
    <button
      onClick={async () => {
        await post("/v1/auth/logout", {});
        set(null);
        location.href = "/login";
      }}
    >
      Log out
    </button>
  );
}
