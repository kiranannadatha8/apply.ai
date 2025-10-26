import { LoginForm } from "@/features/auth/login-form";
import { OTPForm } from "@/features/auth/otp-form";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/stores/auth";

export const LoginPage = () => {
  const [stage, setStage] = useState<"login" | "otp">("login");
  const [email, setEmail] = useState<string>("");
  const setToken = useAuth((s) => s.setToken);
  const navigate = useNavigate();

  function redirectAfterAuth(data: any) {
    console.log(data);
    setToken(data.accessToken);
    navigate("/onboarding", { replace: true });
  }

  if (stage === "login") {
    return (
      <div className="bg-background flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
        <div className="w-full max-w-sm">
          <LoginForm
            onRequested={(em) => {
              setEmail(em);
              console.log(em);
              setStage("otp");
            }}
          />
        </div>
      </div>
    );
  }

  if (stage === "otp") {
    return (
      <div className="bg-background flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
        <div className="w-full max-w-sm">
          <OTPForm
            email={email}
            onAuthed={(authedUser) => {
              redirectAfterAuth(authedUser);
            }}
          />
        </div>
      </div>
    );
  }
};
