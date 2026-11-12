import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { analyze, AnalyzeError, fetchRunLog, MODEL_INPUTS } from "../api/analyses";

// "cranial_index" → "Cranial index". Outputs are shown generically, so another model needs no UI change.
function outputLabel(key: string): string {
  const words = key.replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function Outputs({ outputs }: { outputs: Record<string, unknown> }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4">
      {Object.entries(outputs).map(([key, value]) => (
        <div key={key} className="contents">
          <dt className="text-gray-600">{outputLabel(key)}</dt>
          <dd className="font-medium">{String(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function AnalyzePanel({
  workupId,
  values,
  ready,
}: {
  workupId: string;
  values: Record<string, string>;
  // Every model input is filled and no field shows an error.
  ready: boolean;
}) {
  const queryClient = useQueryClient();
  const runLog = useQuery({ queryKey: ["runLog", workupId], queryFn: () => fetchRunLog(workupId), retry: false });
  const run = useMutation({
    mutationFn: () => analyze(workupId, Object.fromEntries(MODEL_INPUTS.map((code) => [code, Number(values[code])]))),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["runLog", workupId] }),
  });

  return (
    <div className="mb-6">
      <button
        type="button"
        className="rounded bg-blue-900 px-4 py-2 text-white disabled:bg-gray-400"
        disabled={!ready || run.isPending}
        onClick={() => run.mutate()}
      >
        {run.isPending ? "Analyzing…" : "Analyze"}
      </button>

      {run.isError && (
        <div role="alert" className="mt-3 text-red-700">
          {(run.error instanceof AnalyzeError ? run.error.messages : [run.error.message]).map((m) => (
            <p key={m}>{m}</p>
          ))}
        </div>
      )}

      {run.isSuccess && run.data.result && (
        <section aria-label="Result" className="mt-4 rounded border border-gray-300 p-4">
          <h2 className="mb-2 text-lg font-medium">Result</h2>
          <Outputs outputs={run.data.result} />
        </section>
      )}

      <section aria-labelledby="run-log-heading" className="mt-6">
        <h2 id="run-log-heading" className="mb-2 text-lg font-medium">
          Run log
        </h2>
        {runLog.isError ? (
          <p className="text-red-700">Couldn't load the run log.</p>
        ) : runLog.data?.length ? (
          <ol aria-label="Run log" className="space-y-2">
            {runLog.data.map((record) => (
              <li key={record.id} className="rounded border border-gray-200 p-2 text-sm">
                <p className="text-gray-600">
                  {new Date(record.created_at).toLocaleString()} · {record.model_id} {record.model_version}
                </p>
                <Outputs outputs={record.outputs} />
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-gray-600">No runs yet.</p>
        )}
      </section>
    </div>
  );
}
