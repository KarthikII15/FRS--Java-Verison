import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  ScanFace,
  Lock,
  Mail,
  AlertCircle,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Shield,
} from "lucide-react";
import { Checkbox } from "./ui/checkbox";
import { authConfig } from "../config/authConfig";
import keycloak from "../services/auth/keycloakInstance";


export const LoginPage: React.FC = () => {
  const { login, isAuthLoading, authError, clearAuthError } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState("hr@company.com");
  const [password, setPassword] = useState("hr123");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const isKeycloakMode = authConfig.mode === "keycloak";

  // Handle Keycloak automatic redirect when in Keycloak mode
  useEffect(() => {
    if (isKeycloakMode && !keycloak.authenticated) {
      // Keycloak auth provider handles the login flow
      // This effect ensures we don't show the legacy form in keycloak mode
    }
  }, [isKeycloakMode]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    clearAuthError();

    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    const success = await login(email, password);
    if (!success) {
      setError("Invalid email or password");
    }
  };

  const handleQuickLogin = (role: "admin" | "hr" | "associate") => {
    if (role === "admin") {
      setEmail("admin@company.com");
      setPassword("admin123");
    } else if (role === "hr") {
      setEmail("hr@company.com");
      setPassword("hr123");
    } else {
      // Dummy credentials for associate if needed, or just focus on HR/Admin for POC
      setEmail("associate@company.com");
      setPassword("assoc123");
    }
  };

  return (
    <div className="min-h-screen bg-[#020817] text-slate-50 flex flex-col font-sans">

      {/* Top Bar */}
      <header className="flex items-center justify-between px-8 py-6 w-full absolute top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <ScanFace className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-sm tracking-widest text-white">
            FACERECOG ATTENDANCE
          </span>
        </div>
        <div className="flex items-center gap-6">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              toast("Support Request", { description: "Opening support portal... (Mock)" });
            }}
            className="text-xs font-semibold tracking-wider text-slate-400 hover:text-white transition-colors"
          >
            SUPPORT
          </a>
          <button
            onClick={toggleTheme}
            className="text-slate-400 hover:text-yellow-400 transition-colors"
          >
            {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row w-full h-screen pt-20">
        {/* Left Side - Branding */}
        <div className="flex-1 lg:flex-[1.2] relative overflow-hidden flex flex-col justify-center px-8 lg:px-24">
          {/* Dark gradient radial background */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-blue-900/40 via-[#020817] to-[#020817] z-0 pointer-events-none" />

          <div className="relative z-10 max-w-2xl mt-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/50 border border-blue-900/50 mb-8">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              <span className="text-xs font-semibold tracking-wider text-blue-400 uppercase">
                AI Engine Active
              </span>
            </div>

            <h1 className="text-6xl lg:text-8xl font-black text-white leading-[0.9] tracking-tight mb-2">
              FaceMatch <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500 font-extrabold italic">
                Identity.
              </span>
            </h1>

            <p className="mt-8 text-lg lg:text-xl text-slate-400 max-w-xl font-medium leading-relaxed">
              Enterprise-grade attendance tracking via advanced facial
              recognition. Seamlessly identify, verify, and monitor your
              workforce with zero-friction biometrics.
            </p>

            {/* Stats */}
            <div className="mt-20 flex flex-wrap items-center gap-16">
              <div>
                <div className="text-3xl font-bold text-white mb-1">98.4%</div>
                <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
                  Accuracy
                  <br />
                  Face Recognition
                </div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white mb-1">
                  {"<10ms"}
                </div>
                <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
                  Latency
                  <br />
                  Edge Response
                </div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white mb-1">SOC2</div>
                <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
                  Compliance
                  <br />
                  Data Privacy
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="flex-1 bg-[#050B14] border-l border-slate-800/50 shadow-2xl flex flex-col justify-center px-8 lg:px-24 relative">
          <div className="w-full max-w-md mx-auto relative z-10 pb-16">
            <div className="mb-10">
              <h2 className="text-4xl font-bold text-white mb-3">
                Enterprise Login
              </h2>
              <p className="text-slate-400 text-sm font-medium">
                Welcome back. Please authenticate to continue.
              </p>
            </div>

            {isKeycloakMode ? (
              /* Keycloak OIDC Login */
              <div className="space-y-6">
                <div className="text-center py-8">
                  <div className="w-20 h-20 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Shield className="w-10 h-10 text-blue-500" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    Enterprise SSO
                  </h3>
                  <p className="text-slate-400 text-sm">
                    Secure authentication via Keycloak Identity Provider
                  </p>
                </div>

                {(error || authError) && (
                  <div className="flex items-center gap-2 text-red-500 text-sm bg-red-500/10 border border-red-500/20 p-4 rounded-xl font-medium">
                    <AlertCircle className="w-5 h-5" />
                    <span>{error || authError}</span>
                  </div>
                )}

                <Button
                  onClick={() => keycloak.login()}
                  disabled={isAuthLoading}
                  className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-base tracking-wide transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(37,99,235,0.5)]"
                >
                  {isAuthLoading ? "Redirecting..." : "Sign In with Keycloak"}{" "}
                  <span className="ml-2">→</span>
                </Button>

                <div className="text-center">
                  <p className="text-xs text-slate-500">
                    Authenticating against realm:{" "}
                    <span className="text-blue-400">{authConfig.keycloak.realm}</span>
                  </p>
                </div>
              </div>
            ) : (
              /* Legacy Email/Password Login */
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="text-xs font-bold tracking-wider text-slate-300 uppercase"
                  >
                    Work Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-12 bg-[#0F1623] border-slate-800/80 text-white h-14 rounded-xl focus:ring-blue-500/50 focus:border-blue-500 placeholder:text-slate-600 transition-all font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="password"
                      className="text-xs font-bold tracking-wider text-slate-300 uppercase"
                    >
                      Password
                    </Label>
                    <a
                      href="#"
                      className="text-xs font-bold text-blue-500 hover:text-blue-400 tracking-wider"
                    >
                      FORGOT?
                    </a>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-12 pr-12 bg-[#0F1623] border-slate-800/80 text-white h-14 rounded-xl focus:ring-blue-500/50 focus:border-blue-500 placeholder:text-slate-600 transition-all font-medium font-mono tracking-widest"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center space-x-3 pt-2">
                  <Checkbox
                    id="remember"
                    className="border-slate-700 bg-[#0F1623] data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 w-5 h-5 rounded"
                  />
                  <label
                    htmlFor="remember"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-400"
                  >
                    Remember this device for 30 days
                  </label>
                </div>

                {(error || authError) && (
                  <div className="flex items-center gap-2 text-red-500 text-sm bg-red-500/10 border border-red-500/20 p-4 rounded-xl font-medium">
                    <AlertCircle className="w-5 h-5" />
                    <span>{error || authError}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isAuthLoading}
                  className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-base tracking-wide transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(37,99,235,0.5)] mt-4"
                >
                  {isAuthLoading ? "Signing In..." : "Sign In to Dashboard"}{" "}
                  <span className="ml-2">→</span>
                </Button>
              </form>
            )}


            {!isKeycloakMode && (
              <div className="mt-12 pt-10 border-t border-slate-800/50">
                <div className="text-center mb-6">
                  <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
                    Quick Access Prototypes
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleQuickLogin("admin")}
                    className="bg-transparent border-slate-800 text-white hover:bg-slate-800/50 hover:text-white rounded-xl h-12 text-xs font-bold tracking-wider uppercase"
                  >
                    Main Admin
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleQuickLogin("hr")}
                    className="bg-transparent border-slate-800 text-white hover:bg-slate-800/50 hover:text-white rounded-xl h-12 text-xs font-bold tracking-wider uppercase"
                  >
                    HR Manager
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleQuickLogin("associate")}
                    className="bg-transparent border-slate-800 text-white hover:bg-slate-800/50 hover:text-white rounded-xl h-12 text-xs font-bold tracking-wider uppercase col-span-2 sm:col-span-1"
                  >
                    HR Associate
                  </Button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};
