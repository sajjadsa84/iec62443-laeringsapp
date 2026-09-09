import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, useNavigate, useParams } from "react-router-dom";
import { ProgressPath } from "./components/ProgressPath";
import { Button } from "./components/Button";
import { ContentItemView } from "./components/ContentItemView";
import { AVAILABLE_MODULES } from "./modules";
import { getProgress, saveProgress, markModuleComplete } from "./lib/progressStore";
import { loadModule } from "./lib/loadModule";
import { getModuleRunState, saveModuleRunState, clearModuleRunState } from "./lib/moduleRunState";
import { SecureThePlantGame } from "./game/SecureThePlantGame";
import type { LearningModule, UserProgress } from "./types";

function Home() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState<UserProgress>(() => getProgress());

  useEffect(() => {
    setProgress(getProgress());
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-wide text-accent-from">
        Capgemini · IEC 62443
      </p>
      <h1 className="mt-2 text-4xl font-bold text-text">Læringssti</h1>
      <p className="mt-2 text-textMuted">
        Jobb deg gjennom modulene i rekkefølge. Fremgangen din lagres automatisk.
      </p>

      <div className="mt-12">
        <ProgressPath
          modules={AVAILABLE_MODULES}
          progress={progress}
          onSelectModule={(moduleId) => navigate(`/module/${moduleId}`)}
        />
      </div>

      <div className="mt-16 border-t border-textMuted/10 pt-6">
        <p className="text-xs text-textMuted">
          Under utvikling:{" "}
          <button
            type="button"
            onClick={() => navigate("/game")}
            className="font-semibold text-accent2 underline underline-offset-2"
          >
            Secure the Plant (prototype)
          </button>
        </p>
      </div>
    </div>
  );
}

function ModuleView() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();

  const [module, setModule] = useState<LearningModule | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [scoredCount, setScoredCount] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (!moduleId) return;

    loadModule(moduleId)
      .then((loaded) => {
        setModule(loaded);

        const saved = getModuleRunState(moduleId);
        if (saved && saved.index < loaded.items.length) {
          setIndex(saved.index);
          setCorrectCount(saved.correctCount);
          setScoredCount(saved.scoredCount);
        }

        const progress = getProgress();
        saveProgress({ ...progress, currentModuleId: moduleId });
      })
      .catch((err: Error) => setError(err.message));
  }, [moduleId]);

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <p className="text-warn">{error}</p>
        <Button className="mt-6" onClick={() => navigate("/")}>
          Tilbake til forsiden
        </Button>
      </div>
    );
  }

  if (!module) {
    return <div className="mx-auto max-w-2xl px-6 py-16 text-textMuted">Laster modul...</div>;
  }

  if (finished) {
    const score = scoredCount > 0 ? Math.round((correctCount / scoredCount) * 100) : 100;
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent-from">
          Modul fullført
        </p>
        <h1 className="mt-2 text-3xl font-bold text-text">{module.title}</h1>
        <p className="mt-4 text-5xl font-bold text-accent-from">{score}%</p>
        <p className="mt-2 text-textMuted">
          {correctCount} av {scoredCount} poenggivende spørsmål riktig
        </p>
        <Button
          className="mt-8"
          onClick={() => {
            markModuleComplete(module.moduleId, score);
            navigate("/");
          }}
        >
          Fullfør og gå til forsiden
        </Button>
      </div>
    );
  }

  const item = module.items[index];
  const isWide = item.type === "topology";

  return (
    <div className={isWide ? "mx-auto max-w-5xl px-6 py-10" : "mx-auto max-w-2xl px-6 py-16"}>
      <div className="mb-6 flex items-center justify-between text-sm text-textMuted">
        <span>{module.title}</span>
        <span>
          {index + 1} / {module.items.length}
        </span>
      </div>
      <div className="rounded-2xl border border-accent-from/20 bg-panel p-6">
        <ContentItemView
          key={item.id}
          item={item}
          onComplete={(result) => {
            const nextCorrectCount = correctCount + (result.scored && result.correct ? 1 : 0);
            const nextScoredCount = scoredCount + (result.scored ? 1 : 0);
            const nextIndex = index + 1;
            const isLastItem = nextIndex >= module.items.length;

            setCorrectCount(nextCorrectCount);
            setScoredCount(nextScoredCount);

            if (isLastItem) {
              setFinished(true);
              clearModuleRunState(module.moduleId);
            } else {
              setIndex(nextIndex);
              saveModuleRunState(module.moduleId, {
                index: nextIndex,
                correctCount: nextCorrectCount,
                scoredCount: nextScoredCount,
              });
            }
          }}
        />
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/module/:moduleId" element={<ModuleView />} />
        <Route path="/game" element={<SecureThePlantGame />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
