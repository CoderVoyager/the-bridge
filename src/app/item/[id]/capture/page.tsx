"use client";

import { useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

// --- Step definitions ---
const STEPS = [
  {
    title: "Front of the item",
    instruction: "Hold the item upright and take a clear photo of the front.",
    caption: "e.g. full front view, well-lit, no obstructions",
    icon: "📷",
  },
  {
    title: "Label / Serial / Model",
    instruction:
      "Find the brand label, serial number, or model tag and photograph it clearly.",
    caption: "e.g. close-up of the tag — text should be readable",
    icon: "🏷️",
  },
  {
    title: "Wear or Damage",
    instruction:
      "Show the most worn or damaged area. If pristine, just take a close-up of any corner or edge.",
    caption: "e.g. scuff marks, scratches, dents, or 'looks great!'",
    icon: "🔍",
  },
];

const MIN_DIMENSION = 300; // px — reject if short side < this
const BLUR_VARIANCE_THRESHOLD = 120; // low variance = likely blurry

export default function CapturePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(0);
  const [photos, setPhotos] = useState<string[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Quality checks ---
  const checkImageQuality = useCallback(
    (img: HTMLImageElement): string | null => {
      const shortSide = Math.min(img.naturalWidth, img.naturalHeight);
      if (shortSide < MIN_DIMENSION) {
        return `Image is too small (${img.naturalWidth}×${img.naturalHeight}). Minimum ${MIN_DIMENSION}px on the short side. Please retake.`;
      }

      // Basic blur detection via grayscale pixel variance
      const canvas = document.createElement("canvas");
      const size = 100; // downscale for speed
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, size, size);
        const imageData = ctx.getImageData(0, 0, size, size);
        const data = imageData.data;

        // Compute grayscale variance
        let sum = 0;
        let sumSq = 0;
        const pixelCount = size * size;
        for (let i = 0; i < data.length; i += 4) {
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          sum += gray;
          sumSq += gray * gray;
        }
        const mean = sum / pixelCount;
        const variance = sumSq / pixelCount - mean * mean;

        if (variance < BLUR_VARIANCE_THRESHOLD) {
          return "Image appears blurry or too uniform. Please retake with better focus.";
        }
      }

      return null; // passes
    },
    []
  );

  // --- Handle file selection ---
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setError(null);
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        const img = new Image();
        img.onload = () => {
          const qualityError = checkImageQuality(img);
          if (qualityError) {
            setError(qualityError);
            setPreview(null);
            // Reset input so user can pick again
            if (fileInputRef.current) fileInputRef.current.value = "";
          } else {
            setPreview(base64);
          }
        };
        img.src = base64;
      };
      reader.readAsDataURL(file);
    },
    [checkImageQuality]
  );

  // --- Accept current photo and advance ---
  const acceptPhoto = useCallback(() => {
    if (!preview) return;
    setPhotos((prev) => [...prev, preview]);
    setPreview(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";

    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    }
  }, [preview, currentStep]);

  // --- Retake ---
  const retakePhoto = useCallback(() => {
    setPreview(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  // --- Submit all photos ---
  const handleFinish = useCallback(async () => {
    if (photos.length < STEPS.length) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/items/${id}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photos }),
      });
      if (!res.ok) throw new Error("Failed to save photos");
      
      // Check if this is a Bridge Return item
      const itemRes = await fetch(`/api/items/${id}/return`);
      if (itemRes.ok) {
        // Returnable item — run AI assessment to get real grade
        // (replaces the preliminary "like_new" assumption)
        try {
          await fetch(`/api/items/${id}/assess`, { method: "POST" });
        } catch {
          // Non-critical: if grading fails, preliminary assessment remains
        }
        router.push(`/item/${id}/return`);
      } else {
        // Non-returnable item — goes to result page (which triggers assess)
        router.push(`/item/${id}/result`);
      }
    } catch {
      setError("Failed to save photos. Please try again.");
      setSubmitting(false);
    }
  }, [photos, id, router]);

  const step = STEPS[currentStep];
  const isLastStep = currentStep === STEPS.length - 1;
  const allCaptured = photos.length === STEPS.length;

  return (
    <div className="mx-auto max-w-lg">
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-[var(--text-secondary)]">
          <span>
            Step {currentStep + 1} of {STEPS.length}
          </span>
          <Link
            href="/"
            className="text-xs hover:text-[var(--text-primary)] transition-colors"
          >
            ✕ Cancel
          </Link>
        </div>
        <div className="mt-2 h-1.5 w-full rounded-full bg-neutral-800">
          <div
            className="h-1.5 rounded-full bg-amber-500 transition-all duration-300"
            style={{
              width: `${((allCaptured ? STEPS.length : currentStep + (preview ? 0.5 : 0)) / STEPS.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Step card */}
      {!allCaptured && (
        <div className="rounded-2xl border border-neutral-800 bg-[var(--bg-card)] p-6">
          <div className="mb-4 text-center">
            <span className="text-4xl">{step.icon}</span>
            <h2 className="mt-3 text-xl font-bold">{step.title}</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {step.instruction}
            </p>
            <p className="mt-1 text-xs italic text-neutral-500">{step.caption}</p>
          </div>

          {/* Preview area */}
          {preview ? (
            <div className="flex flex-col items-center gap-4">
              <div className="relative overflow-hidden rounded-xl border border-neutral-700">
                <img
                  src={preview}
                  alt={`Step ${currentStep + 1} preview`}
                  className="max-h-64 w-full object-contain"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={retakePhoto}
                  className="rounded-xl border border-neutral-700 px-4 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:border-amber-500/40 hover:text-[var(--text-primary)]"
                >
                  🔄 Retake
                </button>
                <button
                  onClick={acceptPhoto}
                  className="rounded-xl bg-amber-500 px-5 py-2 text-sm font-semibold text-neutral-900 transition-colors hover:bg-amber-400"
                >
                  ✓ Accept{isLastStep ? "" : " & Next"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <label className="flex w-full cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-neutral-700 p-8 transition-colors hover:border-amber-500/50">
                <span className="text-3xl">📸</span>
                <span className="text-sm text-[var(--text-secondary)]">
                  Tap to take a photo or choose a file
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-center text-sm text-red-400">
              ⚠️ {error}
            </div>
          )}
        </div>
      )}

      {/* Thumbnails of completed steps */}
      {photos.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
            Captured
          </p>
          <div className="flex gap-3">
            {photos.map((photo, i) => (
              <div
                key={i}
                className="relative h-16 w-16 overflow-hidden rounded-lg border border-neutral-700"
              >
                <img
                  src={photo}
                  alt={`Shot ${i + 1}`}
                  className="h-full w-full object-cover"
                />
                <span className="absolute bottom-0.5 right-0.5 rounded bg-amber-500/90 px-1 text-[10px] font-bold text-neutral-900">
                  {i + 1}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Finish button */}
      {allCaptured && (
        <div className="mt-8 flex flex-col items-center gap-3">
          <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-6 text-center">
            <span className="text-3xl">✅</span>
            <p className="mt-2 font-semibold text-green-400">
              All {STEPS.length} photos captured!
            </p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Ready to analyze your item.
            </p>
          </div>
          <button
            onClick={handleFinish}
            disabled={submitting}
            className="w-full rounded-xl bg-amber-500 px-6 py-3 text-sm font-semibold text-neutral-900 transition-colors hover:bg-amber-400 disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Finish & Get Assessment →"}
          </button>
        </div>
      )}
    </div>
  );
}
