import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import Home from "./app/routes/Home";
import Gpa from "./app/routes/Gpa";
import Cgpa from "./app/routes/Cgpa";
import Navbar from "./app/layout/Navbar";
import Footer from "./app/layout/Footer";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-bg text-text font-sans">
        <Navbar />

        <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-10 md:px-6">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/gpa" element={<Gpa />} />
            <Route path="/cgpa" element={<Cgpa />} />

            {/* fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <Footer />
      </div>
    </BrowserRouter>
  );
}