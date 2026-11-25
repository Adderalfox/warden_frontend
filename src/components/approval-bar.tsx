"use client";

import { useState } from "react";
import { submitApproval } from "@/lib/api";

export default function ApprovalBar({
  incidentId,
  status,
  prUrl,
}: {
  incidentId: string;
  status: string;
  prUrl: string | null;
}) {
  const [apiKey, setApiKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === "COMPLETED") {
    return (
      <div className="flex items-center justify-between border-t border-warden-border bg-warden-panel px-4 py-3">
        <span className="text-sm text-warden-accent">Remediated.</span>
        {prUrl && (
          <a href={prUrl} target="_blank" rel="noreferrer" className="text-sm underline text-warden-accent">
            View Pull Request →
          </a>
        )}
      </div>
    );
  }

  if (status === "FAILED") {
    return (
      <div className="border-t border-warden-border bg-warden-panel px-4 py-3 text-sm text-warden-danger">
        Incident failed — see Thought Tree for details.
      </div>
    );
  }

  if (status !== "AWAITING_APPROVAL") {
    return (
      <div className="border-t border-warden-border bg-warden-panel px-4 py-3 text-sm text-slate-500">
        Agent working… ({status})
      </div>
    );
  }

  const decide = async (decision: "APPROVE" | "REJECT") => {
    setSubmitting(true);
    setError(null);
    try {
      await submitApproval(incidentId, decision, apiKey);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit decision");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 border-t border-warden-border bg-warden-panel px-4 py-3">
      <input
        type="password"
        placeholder="Approval API key"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        className="w-48 rounded border border-warden-border bg-warden-bg px-2 py-1 text-sm"
      />
      <div className="flex items-center gap-2">
        {error && <span className="text-xs text-warden-danger">{error}</span>}
        <button
          disabled={submitting || !apiKey}
          onClick={() => decide("REJECT")}
          className="rounded border border-warden-danger px-3 py-1.5 text-sm text-warden-danger disabled:opacity-40"
        >
          Reject
        </button>
        <button
          disabled={submitting || !apiKey}
          onClick={() => decide("APPROVE")}
          className="rounded bg-warden-accent px-3 py-1.5 text-sm font-medium text-black disabled:opacity-40"
        >
          Approve & Ship
        </button>
      </div>
    </div>
  );
}
