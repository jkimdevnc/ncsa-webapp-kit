import { useQuery } from "@tanstack/react-query";

import { fetchReadyz } from "../api/readyz";

const REFRESH_MS = 10_000;

function Row({ label, value, good }: { label: string; value: string; good: boolean }) {
  return (
    <div className="flex justify-between py-1">
      <dt>{label}</dt>
      <dd aria-label={label} className={good ? "text-green-700" : "text-red-700"}>
        {value}
      </dd>
    </div>
  );
}

export default function StatusPanel() {
  const { data, isPending, isError } = useQuery({
    queryKey: ["readyz"],
    queryFn: fetchReadyz,
    refetchInterval: REFRESH_MS,
    retry: false,
  });

  return (
    <section aria-labelledby="status-heading" className="rounded border border-gray-300 p-4">
      <h2 id="status-heading" className="mb-2 text-lg font-medium">
        Status
      </h2>
      {isPending ? (
        <p>Checking…</p>
      ) : isError ? (
        <dl>
          <Row label="API" value="unreachable" good={false} />
        </dl>
      ) : (
        <>
          <dl>
            <Row label="API" value={data.status === "ready" ? "ok" : "not ready"} good={data.status === "ready"} />
            <Row label="Redis" value={data.redis} good={data.redis === "ok"} />
            <Row label="Model" value={data.model} good={data.model === "loaded"} />
          </dl>
          <p className="mt-2 text-sm text-gray-600">
            Model {data.model_id} {data.model_version} · API {data.version}
          </p>
        </>
      )}
    </section>
  );
}
