import { useQuery } from "@tanstack/react-query";

import { MODEL_INPUTS } from "../api/analyses";
import { fetchDictionary } from "../api/dictionary";
import AnalyzePanel from "./AnalyzePanel";
import { useWorkup } from "./useWorkup";
import { valueError, type Variable } from "./validation";

function MeasurementRow({
  variable,
  text,
  onChange,
}: {
  variable: Variable;
  text: string;
  onChange: (text: string) => void;
}) {
  const error = valueError(text, variable);
  const inputId = `value-${variable.code}`;
  const errorId = `error-${variable.code}`;

  return (
    <div className="py-2">
      <div className="flex items-center gap-4">
        <label htmlFor={inputId} className="flex-1">
          {variable.name} <span className="ml-1 font-mono text-xs text-gray-500">{variable.code}</span>
        </label>
        <div
          className={`flex w-48 items-center rounded border px-2 py-1 ${error ? "border-red-600" : "border-gray-300"}`}
        >
          <input
            id={inputId}
            inputMode="decimal"
            autoComplete="off"
            className="w-full outline-none"
            placeholder="—"
            value={text}
            onChange={(e) => onChange(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
          />
          <span className="ml-2 shrink-0 text-sm text-gray-500">
            {variable.unit} · {variable.precision}
          </span>
        </div>
      </div>
      {error && (
        <p id={errorId} className="mt-1 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

// Variables grouped by region and group, e.g. "Cranium · Metric", in dictionary order.
function sections(variables: Variable[]): [string, Variable[]][] {
  const groups = new Map<string, Variable[]>();
  for (const v of variables) {
    const title = `${v.region} · ${v.group}`;
    groups.set(title, [...(groups.get(title) ?? []), v]);
  }
  return [...groups];
}

export default function WorkupPage() {
  const { workup, setName, setValue } = useWorkup();
  // Loaded once per page load, so typing never calls the API.
  const dictionary = useQuery({
    queryKey: ["dictionary"],
    queryFn: fetchDictionary,
    staleTime: Infinity,
    retry: false,
  });

  return (
    <div>
      <label htmlFor="workup-name" className="block text-sm text-gray-600">
        Workup name
      </label>
      <input
        id="workup-name"
        className="mb-6 w-full rounded border border-gray-300 px-2 py-1 text-xl font-semibold"
        value={workup.name}
        onChange={(e) => setName(e.target.value)}
      />
      {dictionary.isPending ? (
        <p>Loading the variables…</p>
      ) : dictionary.isError ? (
        <p role="alert" className="text-red-700">
          Couldn't load the variables. Is the API running?
        </p>
      ) : (
        <>
          {sections(dictionary.data.variables).map(([title, variables]) => (
            <section key={title} aria-label={title} className="mb-6">
              <h2 className="mb-2 text-xl font-semibold">{title}</h2>
              {variables.map((v) => (
                <MeasurementRow
                  key={v.code}
                  variable={v}
                  text={workup.values[v.code] ?? ""}
                  onChange={(text) => setValue(v.code, text)}
                />
              ))}
            </section>
          ))}
          <AnalyzePanel
            workupId={workup.id}
            values={workup.values}
            ready={
              MODEL_INPUTS.every((code) => (workup.values[code] ?? "").trim() !== "") &&
              dictionary.data.variables.every((v) => valueError(workup.values[v.code] ?? "", v) === null)
            }
          />
        </>
      )}
    </div>
  );
}
