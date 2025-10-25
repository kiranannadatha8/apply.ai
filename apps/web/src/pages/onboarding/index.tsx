import { useState } from "react";
import { post, get } from "../../app/api";
import { uploadAndParse } from "./useResumeUpload";

type Step = 1 | 2 | 3;
export default function OnboardingPage() {
  const [step, setStep] = useState<Step>(1);
  // TODO: obtain access token from storage/context after login

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Onboarding</h1>
      <ol className="flex gap-4 mb-6">
        <li className={step >= 1 ? "font-bold" : ""}>1. Upload Resume</li>
        <li className={step >= 2 ? "font-bold" : ""}>2. Parse</li>
        <li className={step >= 3 ? "font-bold" : ""}>3. Review & Save</li>
      </ol>
      {step === 1 && <UploadResume onNext={() => setStep(2)} />}
      {step === 2 && <ParsePreview onNext={() => setStep(3)} />}
      {step === 3 && <ReviewAndSave />}
    </div>
  );
}

function UploadResume({ onNext }: { onNext: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  return (
    <div>
      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      <button
        disabled={!file}
        onClick={async () => {
          if (file) {
            await uploadAndParse(file);
            onNext();
          }
        }}
      >
        Continue
      </button>
    </div>
  );
}

function ParsePreview({ onNext }: { onNext: () => void }) {
  return (
    <div>
      <p className="text-sm text-gray-500">Parsing your resume…</p>
      <button className="btn mt-4" onClick={onNext}>
        Continue
      </button>
    </div>
  );
}

function ReviewAndSave() {
  return (
    <form className="grid gap-3">
      <label>
        Full Name
        <input className="border p-2 w-full" />
      </label>
      <label>
        Email
        <input className="border p-2 w-full" />
      </label>
      <label>
        Skills
        <textarea className="border p-2 w-full" />
      </label>
      <button className="btn">Save Profile</button>
    </form>
  );
}
