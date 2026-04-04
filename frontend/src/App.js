import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import Navigation from "@/components/Navigation";
import TopBar from "@/components/TopBar";
import { AuthGuard } from "@/components/AuthGuard";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import LoginPage from "@/pages/LoginPage";
import LandingPage from "@/pages/LandingPage";
import IngestionModule from "@/pages/IngestionModule";
import AnomalyDetection from "@/pages/AnomalyDetection";
import OwnershipTrace from "@/pages/OwnershipTrace";
import ShipmentTracking from "@/pages/ShipmentTracking";
import ShipmentHistory from "@/pages/ShipmentHistory";
import TrustScore from "@/pages/TrustScore";

function AuthenticatedLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-[#0B0F19]">
      <div
        className="texture-overlay"
        style={{
          backgroundImage: `url(https://static.prod-images.emergentagent.com/jobs/e3fdbb4b-b6d1-4fc1-9658-7b150ea30844/images/e56fa0f726fbdc9f90c1ccf69ef19a7e907ad02d3c43686aa529b2d7619c95c3.png)`,
        }}
      />
      <Navigation />
      <main id="main-content" className="flex-1 lg:ml-56 min-h-screen relative z-10 flex flex-col">
        <TopBar />
        <div className="flex-1">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </div>
      </main>
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          style: { background: '#121620', border: '1px solid #2A3441', color: '#F8FAFC' },
        }}
      />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={
          <AuthGuard>
            <AuthenticatedLayout>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/ingestion" element={<IngestionModule />} />
                <Route path="/anomaly" element={<AnomalyDetection />} />
                <Route path="/ownership" element={<OwnershipTrace />} />
                <Route path="/tracking" element={<ShipmentTracking />} />
                <Route path="/history" element={<ShipmentHistory />} />
                <Route path="/trust-score" element={<TrustScore />} />
              </Routes>
            </AuthenticatedLayout>
          </AuthGuard>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
