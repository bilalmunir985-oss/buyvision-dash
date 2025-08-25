import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { DashboardLayout } from "./components/DashboardLayout";

// Pages
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import ProductDetail from "./pages/ProductDetail";
import TCGMapping from "./pages/TCGMapping";
import UPCMapping from "./pages/UPCMapping";
import ImportStatus from "./pages/ImportStatus";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            
            {/* Protected routes */}
            <Route path="/" element={<ProtectedRoute><DashboardLayout><Dashboard /></DashboardLayout></ProtectedRoute>} />
            <Route path="/products/:id" element={<ProtectedRoute><DashboardLayout><ProductDetail /></DashboardLayout></ProtectedRoute>} />
            <Route path="/admin/mapping/tcg" element={<ProtectedRoute><DashboardLayout><TCGMapping /></DashboardLayout></ProtectedRoute>} />
            <Route path="/admin/mapping/upc" element={<ProtectedRoute><DashboardLayout><UPCMapping /></DashboardLayout></ProtectedRoute>} />
            <Route path="/admin/imports" element={<ProtectedRoute><DashboardLayout><ImportStatus /></DashboardLayout></ProtectedRoute>} />
            
            {/* Catch-all routes */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;