import StatusPanel from "./components/StatusPanel";
import WorkupPage from "./workup/WorkupPage";

export default function App() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-2xl font-semibold">MOSAIC</h1>
      <WorkupPage />
      <footer className="mt-10">
        <StatusPanel />
      </footer>
    </main>
  );
}
