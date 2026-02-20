import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import Home from "./app/routes/Home.js";
import Gpa from "./app/routes/Gpa.js";
import Cgpa from "./app/routes/Cgpa.js";
import Navbar from "./app/layout/Navbar.js";
import Footer from "./app/layout/Footer.js";
import { ErrorBoundary } from "./components/ErrorBoundary.js";
import OcrBenchmark from "./components/OcrBenchmark.js";

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <div className="min-h-screen bg-bg text-text font-sans">
          <Navbar />

          <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-10 md:px-6">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/gpa" element={<Gpa />} />
              <Route path="/cgpa" element={<Cgpa />} />
              {/* <Route path="/benchmark" element={<OcrBenchmark />} /> */}

              {/* fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          <Footer />
        </div>
      </BrowserRouter>
    </ErrorBoundary>
  );
}