import React, { useState, useEffect } from "react";
import { performOcrPipeline, type OcrResult } from "../utils/ocrPipeline";
import type { Course } from "../utils/types";

export default function OcrBenchmark() {
    const [auth, setAuth] = useState(false);
    const [password, setPassword] = useState("");

    const [courses, setCourses] = useState<Course[]>([]);
    const [semester, setSemester] = useState(1);
    const [loadingCourses, setLoadingCourses] = useState(false);

    // Benchmarking state
    const [images, setImages] = useState<File[]>([]);
    const [results, setResults] = useState<Record<string, OcrResult & { status: string; time?: number }>>({});
    const [isRunning, setIsRunning] = useState(false);

    // Load courses when semester changes
    useEffect(() => {
        async function load() {
            setLoadingCourses(true);
            try {
                const res = await fetch(`/api/courses?semester=${semester}`);
                const data = await res.json();
                setCourses(data.courses || []);
            } catch (e) {
                console.error(e);
            } finally {
                setLoadingCourses(false);
            }
        }
        load();
    }, [semester]);

    // Training state
    const [trainType, setTrainType] = useState<"course" | "grade">("course");
    const [trainOriginal, setTrainOriginal] = useState("");
    const [trainCorrect, setTrainCorrect] = useState("");
    const [trainingQueue, setTrainingQueue] = useState<Array<{ original: string, correction: string, type: "course" | "grade" }>>([]);
    const [trainingStatus, setTrainingStatus] = useState("");

    const addToQueue = () => {
        if (!trainOriginal || !trainCorrect) return;
        setTrainingQueue(prev => [...prev, { original: trainOriginal, correction: trainCorrect, type: trainType }]);
        setTrainOriginal("");
        setTrainCorrect("");
    };

    const removeFromQueue = (index: number) => {
        setTrainingQueue(prev => prev.filter((_, i) => i !== index));
    };

    const handleSaveQueue = async () => {
        if (trainingQueue.length === 0) return;
        setTrainingStatus("Saving...");
        try {
            // Send as batch with type property inside each item
            const res = await fetch('/api/train-ocr', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ batch: trainingQueue })
            });
            if (res.ok) {
                setTrainingStatus("Saved! Reloading...");
                setTrainingQueue([]);
                // Reload page to pick up new JSON
                setTimeout(() => window.location.reload(), 1000);
            } else {
                setTrainingStatus("Error saving.");
            }
        } catch (e) {
            console.error(e);
            setTrainingStatus("Error.");
        }
    };


    const runBenchmark = async () => {
        setIsRunning(true);
        const codes = courses.map(c => c.courseCode);

        // Process sequentially to avoid browser lag
        for (const file of images) {
            setResults(prev => ({
                ...prev,
                [file.name]: { ...prev[file.name], status: "Running...", matches: 0, extracted: {}, rawText: "" }
            }));

            const start = performance.now();
            const res = await performOcrPipeline(file, codes);
            const end = performance.now();

            setResults(prev => ({
                ...prev,
                [file.name]: {
                    ...res,
                    status: res.error ? "Failed" : "Done",
                    time: Math.round(end - start)
                }
            }));
        }
        setIsRunning(false);
    };

    if (!auth) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                <div className="w-full max-w-sm rounded-2xl bg-[#111] p-6 text-center ring-1 ring-white/10">
                    <h2 className="text-xl font-bold text-white">Admin Access</h2>
                    <p className="mb-4 text-sm text-gray-400">Enter password to access OCR Benchmark</p>
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        if (password === "walterwhite") setAuth(true);
                        else alert("Wrong password");
                    }}>
                        <input
                            type="password"
                            className="w-full rounded-lg bg-white/5 border-white/10 px-4 py-2 text-white"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="Password"
                        />
                        <button className="mt-4 w-full rounded-lg bg-blue-600 py-2 text-sm font-bold text-white">
                            Unlock
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black p-8 text-white">
            <div className="mx-auto max-w-6xl">
                <header className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-blue-400">OCR Benchmark Tool</h1>
                        <p className="text-gray-400">Validate OCR accuracy against multiple images</p>
                    </div>
                    <button onClick={() => setAuth(false)} className="text-sm text-red-400">Logout</button>
                </header>

                {/* Controls */}
                <div className="mb-8 grid gap-6 rounded-2xl border border-white/10 bg-white/5 p-6 md:grid-cols-2">
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-gray-300">Target Semester</label>
                        <select
                            value={semester}
                            onChange={e => setSemester(Number(e.target.value))}
                            className="w-full rounded-lg bg-black border-white/10 px-4 py-2"
                        >
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                        </select>
                        <p className="mt-2 text-xs text-gray-500">
                            Loaded {courses.length} courses for Sem {semester}. (OCR looks for these codes)
                        </p>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-gray-300">Upload Screenshots</label>
                        <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={e => {
                                if (e.target.files) setImages(Array.from(e.target.files));
                            }}
                            className="block w-full text-sm text-gray-400 file:mr-4 file:rounded-full file:border-0 file:bg-blue-600/20 file:px-4 file:py-2 file:text-blue-400"
                        />
                    </div>
                </div>

                {/* Action Bar */}
                <div className="mb-8 flex items-center justify-between">
                    <div className="text-lg font-semibold">
                        Queue: {images.length} images
                    </div>
                    <button
                        onClick={runBenchmark}
                        disabled={isRunning || images.length === 0 || courses.length === 0}
                        className={`rounded-xl px-8 py-3 font-bold ${isRunning ? 'bg-gray-700 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500'}`}
                    >
                        {isRunning ? "Running..." : "Start Benchmark"}
                    </button>
                </div>

                {/* Results */}
                <div className="rounded-2xl border border-white/10 bg-black overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-white/5 text-xs uppercase text-gray-400">
                            <tr>
                                <th className="px-6 py-4">Image</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Time</th>
                                <th className="px-6 py-4">Matches</th>
                                <th className="px-6 py-4">Missed</th>
                                <th className="px-6 py-4 bg-white/5 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-sm">
                            {images.map(img => {
                                const res = results[img.name];
                                const missedCount = courses.length - (res?.matches || 0);

                                return (
                                    <React.Fragment key={img.name}>
                                        <tr className="hover:bg-white/5">
                                            <td className="px-6 py-4 font-medium">{img.name}</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${res?.status === "Done" ? "bg-green-500/10 text-green-400" :
                                                    res?.status === "Running..." ? "bg-blue-500/10 text-blue-400" :
                                                        "bg-gray-500/10 text-gray-400"
                                                    }`}>
                                                    {res?.status || "Pending"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-gray-400">{res?.time ? `${res.time}ms` : "-"}</td>
                                            <td className="px-6 py-4 font-mono font-bold text-blue-400">
                                                {res ? `${res.matches} / ${courses.length}` : "-"}
                                            </td>
                                            <td className="px-6 py-4 text-red-400 font-mono">
                                                {res ? missedCount : "-"}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {res?.debugImageUrl && (
                                                    <a href={res.debugImageUrl} target="_blank" className="text-xs text-blue-400 underline">View Debug IMG</a>
                                                )}
                                            </td>
                                        </tr>
                                        {/* Raw Text Row (if done) */}
                                        {res?.status === "Done" && (
                                            <tr className="bg-white/5">
                                                <td colSpan={6} className="px-6 py-4">
                                                    <details>
                                                        <summary className="cursor-pointer text-xs text-gray-500 hover:text-white">View Extracted Raw Text</summary>
                                                        <pre className="mt-2 text-[10px] text-gray-400 whitespace-pre-wrap font-mono">
                                                            {res.rawText}
                                                        </pre>
                                                        {/* Show failed courses breakdown if useful */}
                                                        {missedCount > 0 && (
                                                            <div className="mt-2 text-xs text-red-400">
                                                                Missing: {courses.filter(c => !res.extracted[c.courseCode]).map(c => c.courseCode).join(", ")}
                                                            </div>
                                                        )}
                                                    </details>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                            {images.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        No images queued.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Training Section */}
                <div className="mt-12 rounded-2xl border border-white/10 bg-white/5 p-6">
                    <h3 className="mb-4 text-xl font-bold text-yellow-400">🎓 Train OCR</h3>
                    <p className="mb-4 text-sm text-gray-400">
                        Found a mistake? Teach the system. Add correction rules to the queue, then save them all at once.
                    </p>

                    {/* Input Form */}
                    <div className="flex flex-col gap-4 md:flex-row md:items-end">
                        <div className="flex-1">
                            <label className="mb-1 block text-xs text-gray-500">Bad Text (exactly as seen in Raw Text)</label>
                            <input
                                className="w-full rounded-lg bg-black border border-white/10 px-4 py-2 text-white"
                                value={trainOriginal}
                                onChange={e => setTrainOriginal(e.target.value)}
                                placeholder="e.g. 23C54401"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="mb-1 block text-xs text-gray-500">Correct Course Code</label>
                            <input
                                className="w-full rounded-lg bg-black border border-white/10 px-4 py-2 text-white"
                                value={trainCorrect}
                                onChange={e => setTrainCorrect(e.target.value)}
                                placeholder="e.g. 23CS4401"
                            />
                        </div>
                        <button
                            onClick={addToQueue}
                            disabled={!trainOriginal || !trainCorrect}
                            className="rounded-lg bg-blue-600 px-6 py-2 font-bold text-white hover:bg-blue-500 disabled:opacity-50"
                        >
                            Add Rule
                        </button>
                    </div>

                    {/* Queue Display */}
                    {trainingQueue.length > 0 && (
                        <div className="mt-6">
                            <h4 className="mb-2 text-sm font-semibold text-gray-300">Pending Rules ({trainingQueue.length})</h4>
                            <div className="mb-4 flex flex-col gap-2">
                                {trainingQueue.map((item, i) => (
                                    <div key={i} className="flex items-center justify-between rounded-lg bg-black/40 px-4 py-2 border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${item.type === "grade" ? "bg-green-500/20 text-green-400" : "bg-blue-500/20 text-blue-400"}`}>
                                                {item.type || "course"}
                                            </span>
                                            <span className="text-sm font-mono text-gray-400">
                                                "{item.original}" <span className="text-gray-600">→</span> <span className="text-green-400">{item.correction}</span>
                                            </span>
                                        </div>
                                        <button onClick={() => removeFromQueue(i)} className="text-xs text-red-500 hover:text-red-400">Remove</button>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={handleSaveQueue}
                                disabled={!!trainingStatus}
                                className="w-full rounded-lg bg-green-600 px-6 py-3 font-bold text-white hover:bg-green-500 shadow-glow disabled:opacity-50"
                            >
                                {trainingStatus || `Save & Apply ${trainingQueue.length} Rules`}
                            </button>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
