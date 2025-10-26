import { post } from "../../app/api";
import { useAuth } from "../../stores/auth";

export async function uploadAndParse(file: File) {
  const token = useAuth.getState().accessToken!;
  const { uploadUrl, key } = await post<{ uploadUrl: string; key: string }>(
    "/v1/profile/resumes/presign",
    { mime: file.type },
    token,
  );
  await fetch(uploadUrl, {
    method: "PUT",
    headers: { "content-type": file.type },
    body: file,
  });
  await post("/v1/profile/resumes/parse", { key, mime: file.type }, token);
  return { key };
}
