"use client";

import { useCallback, useRef, useState } from "react";
import {
  Link as LinkIcon,
  Upload,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  AlertTriangle,
  Zap,
  Bug,
  HelpCircle,
  FileText,
  X,
  ExternalLink,
  Skull,
  Lock,
  UserCheck,
  Database,
} from "lucide-react";
import { cn, formatBytes } from "@/lib/utils";

type ScanMode = "url" | "file";

interface EngineResult {
  engine: string;
  category: string;
  result: string;
}

interface ScanStats {
  malicious?: number;
  suspicious?: number;
  harmless?: number;
  undetected?: number;
}

interface ScanResponse {
  mock: boolean;
  target: string;
  verdict: "safe" | "malicious";
  stats: ScanStats;
  engines: EngineResult[];
  permalink: string | null;
}

interface ApiErrorPayload {
  error: string;
  message: string;
}

const MAX_FILE_SIZE = 32 * 1024 * 1024; // 32MB
const PRIORITY_ENGINES = ["Kaspersky", "CrowdStrike Falcon", "Bitdefender", "Sophos"];

function sortEngines(engines: EngineResult[]): EngineResult[] {
  return [...engines].sort((a, b) => {
    const aPriority = PRIORITY_ENGINES.indexOf(a.engine);
    const bPriority = PRIORITY_ENGINES.indexOf(b.engine);

    if (aPriority !== -1 && bPriority !== -1) return aPriority - bPriority;
    if (aPriority !== -1) return -1;
    if (bPriority !== -1) return 1;

    // Malicious/suspicious naik ke atas dalam sisa daftar
    const rank = (cat: string) =>
      cat === "malicious" ? 0 : cat === "suspicious" ? 1 : cat === "harmless" ? 2 : 3;
    return rank(a.category) - rank(b.category) || a.engine.localeCompare(b.engine);
  });
}

function EngineIcon({ category }: { category: string }) {
  if (category === "malicious") return <Bug className="h-4 w-4 shrink-0 text-brutal-red" />;
  if (category === "suspicious")
    return <AlertTriangle className="h-4 w-4 shrink-0 text-[#FF8C00]" />;
  if (category === "harmless") return <ShieldCheck className="h-4 w-4 shrink-0 text-black" />;
  return <HelpCircle className="h-4 w-4 shrink-0 text-black/40" />;
}

function Marquee() {
  const items = [
    "[SYSTEM: READY]",
    "[SCANNER: ACTIVE]",
    "[VIRUSTOTAL v3: CONNECTED]",
    "[THREAT DB: SYNCED]",
  ];
  const content = items.join("  ///  ");

  return (
    <div className="w-full overflow-hidden border-b-4 border-black bg-black py-2">
      <div className="flex w-max animate-marquee whitespace-nowrap font-body text-sm font-bold tracking-wide text-brutal-green">
        <span className="px-4">{content} ///</span>
        <span className="px-4">{content} ///</span>
      </div>
    </div>
  );
}

function BrutalAlert({
  message,
  variant,
  onClose,
}: {
  message: string;
  variant: "error" | "rate-limit";
  onClose: () => void;
}) {
  return (
    <div
      className={cn(
        "relative flex items-start gap-3 border-4 border-black p-4 shadow-brutal",
        variant === "rate-limit" ? "bg-[#FF8C00]" : "bg-brutal-red"
      )}
      role="alert"
    >
      <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 animate-pulse-brutal text-black" />
      <div className="flex-1">
        <p className="font-display text-sm font-extrabold uppercase tracking-wide text-black">
          {variant === "rate-limit" ? "Rate Limit Exceeded" : "Scan Gagal"}
        </p>
        <p className="mt-1 font-body text-sm font-medium text-black">{message}</p>
      </div>
      <button
        onClick={onClose}
        aria-label="Tutup peringatan"
        className="shrink-0 border-2 border-black bg-brutal-white p-1 shadow-brutal-sm transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
      >
        <X className="h-4 w-4 text-black" />
      </button>
    </div>
  );
}

function StatusBadge({ verdict, mock }: { verdict: "safe" | "malicious"; mock: boolean }) {
  const isSafe = verdict === "safe";

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 border-4 border-black p-6 text-center shadow-brutal-lg",
        isSafe ? "bg-brutal-green" : "bg-brutal-red animate-glitch"
      )}
    >
      {isSafe ? (
        <ShieldCheck className="h-14 w-14 text-black" strokeWidth={2.5} />
      ) : (
        <Skull className="h-14 w-14 text-black" strokeWidth={2.5} />
      )}
      <p className="font-display text-3xl font-extrabold uppercase leading-none tracking-tight text-black">
        {isSafe ? "SAFE / AMAN" : "DANGER / BERBAHAYA"}
      </p>
      {mock && (
        <span className="border-2 border-black bg-brutal-white px-2 py-0.5 font-body text-[11px] font-bold uppercase tracking-wide text-black">
          Mock Data — API Key belum diset
        </span>
      )}
    </div>
  );
}

function StatPill({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={cn("border-4 border-black p-3 text-center shadow-brutal-sm", tone)}>
      <p className="font-display text-2xl font-extrabold text-black">{value}</p>
      <p className="font-body text-xs font-bold uppercase tracking-wide text-black">{label}</p>
    </div>
  );
}

function InfoStrip() {
  const items = [
    { value: "70+", label: "Engine AV", tone: "bg-brutal-cyan" },
    { value: "<10s", label: "Rata\u00b2 Scan", tone: "bg-brutal-green" },
    { value: "24/7", label: "Threat DB", tone: "bg-brutal-yellow" },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map((item) => (
        <div
          key={item.label}
          className={cn("border-4 border-black p-4 text-center shadow-brutal", item.tone)}
        >
          <p className="font-display text-2xl font-extrabold leading-none text-black sm:text-3xl">
            {item.value}
          </p>
          <p className="mt-1 font-body text-[10px] font-bold uppercase tracking-wide text-black sm:text-[11px]">
            {item.label}
          </p>
        </div>
      ))}
    </div>
  );
}

function TerminalLog() {
  return (
    <div className="border-4 border-black bg-brutal-black shadow-brutal">
      <div className="flex items-center justify-between border-b-4 border-black bg-brutal-green px-4 py-2">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full border-2 border-black bg-brutal-red" />
          <span className="h-3 w-3 rounded-full border-2 border-black bg-brutal-yellow" />
          <span className="h-3 w-3 rounded-full border-2 border-black bg-brutal-white" />
        </div>
        <p className="font-display text-xs font-extrabold uppercase tracking-wide text-black">
          System Log
        </p>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 animate-pulse-brutal rounded-full bg-black" />
          <span className="font-body text-[10px] font-extrabold uppercase text-black">Live</span>
        </div>
      </div>
      <div className="space-y-1.5 px-4 py-4 font-body text-xs leading-relaxed text-brutal-green">
        <p>
          <span className="text-brutal-green/40">[00:00:01]</span> scanner.init() ................{" "}
          <span className="text-brutal-white">OK</span>
        </p>
        <p>
          <span className="text-brutal-green/40">[00:00:02]</span> virustotal.connect() ..........{" "}
          <span className="text-brutal-white">OK</span>
        </p>
        <p>
          <span className="text-brutal-green/40">[00:00:03]</span> threat_db.sync() ..............{" "}
          <span className="text-brutal-white">OK</span>
        </p>
        <p className="my-2 border-t border-dashed border-brutal-green/20" />
        <p>
          <span className="text-brutal-green/40">[00:00:04]</span> history: bit.ly/3xk9-mock .....{" "}
          <span className="font-bold text-brutal-white">SAFE</span>
        </p>
        <p>
          <span className="text-brutal-green/40">[00:00:05]</span> history: invoice_final.exe ....{" "}
          <span className="font-bold text-brutal-red">DANGER</span>
        </p>
        <p>
          <span className="text-brutal-green/40">[00:00:06]</span> history: liburan.png ..........{" "}
          <span className="font-bold text-brutal-white">SAFE</span>
        </p>
        <p className="pt-1">
          &gt; awaiting target input <span className="animate-pulse-brutal">_</span>
        </p>
      </div>
    </div>
  );
}

function HowItWorks() {
  const steps = [
    { number: "01", text: "Masukkan URL atau upload file yang dicurigai" },
    { number: "02", text: "VirusTotal memindai lewat 70+ mesin antivirus" },
    { number: "03", text: "Lihat verdict SAFE/DANGER & breakdown per-engine" },
  ];

  return (
    <div className="border-4 border-black bg-brutal-white shadow-brutal">
      <div className="border-b-4 border-black bg-brutal-red px-4 py-2">
        <p className="font-display text-xs font-extrabold uppercase tracking-wide text-brutal-white">
          Cara Kerja
        </p>
      </div>
      <div className="divide-y-2 divide-black/10">
        {steps.map((step) => (
          <div key={step.number} className="flex items-start gap-3 p-4">
            <span className="font-display text-2xl font-extrabold text-black/20">
              {step.number}
            </span>
            <p className="mt-1 font-body text-sm font-bold text-black">{step.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SupportedEngines() {
  const priority = ["Kaspersky", "CrowdStrike Falcon", "Bitdefender", "Sophos"];
  const rest = ["Microsoft Defender", "ESET-NOD32", "Avast", "McAfee", "TrendMicro"];

  return (
    <div className="border-4 border-black bg-brutal-white shadow-brutal">
      <div className="border-b-4 border-black bg-brutal-cyan px-4 py-2">
        <p className="font-display text-xs font-extrabold uppercase tracking-wide text-black">
          Engine yang Didukung
        </p>
      </div>
      <div className="flex flex-wrap gap-2 p-4">
        {priority.map((engine) => (
          <span
            key={engine}
            className="border-2 border-black bg-brutal-yellow px-3 py-1.5 font-body text-xs font-bold uppercase shadow-brutal-sm"
          >
            {engine}
          </span>
        ))}
        {rest.map((engine) => (
          <span
            key={engine}
            className="border-2 border-black bg-brutal-white px-3 py-1.5 font-body text-xs font-bold uppercase shadow-brutal-sm"
          >
            {engine}
          </span>
        ))}
        <span className="border-2 border-dashed border-black bg-brutal-white px-3 py-1.5 font-body text-xs font-bold uppercase text-black/50">
          +60 Lainnya
        </span>
      </div>
    </div>
  );
}

function WhyUseThis() {
  const features = [
    { icon: Zap, title: "Real-time", desc: "Hasil scan dalam hitungan detik" },
    { icon: Lock, title: "Privasi", desc: "File tidak disimpan permanen" },
    { icon: UserCheck, title: "Tanpa Daftar", desc: "Langsung pakai, tanpa akun" },
    { icon: Database, title: "Database Global", desc: "Terhubung ke threat intel dunia" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {features.map((f) => (
        <div key={f.title} className="border-4 border-black bg-brutal-white p-4 shadow-brutal">
          <f.icon className="h-6 w-6 text-black" />
          <p className="mt-2 font-display text-sm font-extrabold uppercase text-black">
            {f.title}
          </p>
          <p className="mt-1 font-body text-xs text-black/60">{f.desc}</p>
        </div>
      ))}
    </div>
  );
}

function SiteFooter() {
  return (
    <footer className="mt-16 border-t-4 border-black bg-brutal-black px-4 py-5 text-center">
      <p className="font-body text-xs font-bold uppercase tracking-wide text-white/50">
        SCANNER_VIRUS v1.0.0 // Powered by VirusTotal API v3
      </p>
    </footer>
  );
}

export default function Home() {
  const [mode, setMode] = useState<ScanMode>("url");
  const [urlInput, setUrlInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResponse | null>(null);
  const [alert, setAlert] = useState<{ message: string; variant: "error" | "rate-limit" } | null>(
    null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetResult = () => {
    setResult(null);
    setAlert(null);
  };

  const handleDrag = useCallback((e: React.DragEvent, active: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(active);
  }, []);

  const validateAndSetFile = (candidate: File) => {
    if (candidate.size > MAX_FILE_SIZE) {
      setAlert({
        variant: "error",
        message: `File "${candidate.name}" (${formatBytes(candidate.size)}) melebihi batas 32MB.`,
      });
      return;
    }
    setFile(candidate);
    setAlert(null);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) validateAndSetFile(dropped);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) validateAndSetFile(selected);
  };

  async function handleScan() {
    resetResult();

    if (mode === "url") {
      if (!urlInput.trim()) {
        setAlert({ variant: "error", message: "Masukkan URL yang ingin dipindai." });
        return;
      }
    } else if (!file) {
      setAlert({ variant: "error", message: "Pilih atau seret file yang ingin dipindai." });
      return;
    }

    setLoading(true);

    try {
      let res: Response;

      if (mode === "url") {
        res = await fetch("/api/scan-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: urlInput.trim() }),
        });
      } else {
        const formData = new FormData();
        formData.append("file", file as File);
        res = await fetch("/api/scan-file", { method: "POST", body: formData });
      }

      const data = await res.json();

      if (!res.ok) {
        const err = data as ApiErrorPayload;
        setAlert({
          variant: res.status === 429 ? "rate-limit" : "error",
          message: err.message || "Terjadi kesalahan saat memindai.",
        });
        setLoading(false);
        return;
      }

      setResult(data as ScanResponse);
    } catch {
      setAlert({
        variant: "error",
        message: "Tidak dapat terhubung ke server. Periksa koneksi Anda.",
      });
    } finally {
      setLoading(false);
    }
  }

  const stats = result?.stats ?? {};
  const sortedEngines = result ? sortEngines(result.engines) : [];

  return (
    <>
      <main className="min-h-screen pb-20">
        <Marquee />

      <div className="mx-auto max-w-3xl px-4 pt-10">
        {/* Title */}
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center border-4 border-black bg-brutal-black shadow-brutal">
            <Zap className="h-8 w-8 text-brutal-green" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="font-display text-4xl font-extrabold uppercase leading-none tracking-tight text-black sm:text-5xl">
              SCANNER_VIRUS
            </h1>
            <p className="mt-1 font-body text-sm font-medium text-black/70">
              Brutalist file &amp; URL security scanner — powered by VirusTotal v3
            </p>
          </div>
        </div>

        {/* Tab toggle */}
        <div className="mb-6 grid grid-cols-2 border-4 border-black bg-brutal-white shadow-brutal">
          <button
            onClick={() => {
              setMode("url");
              resetResult();
            }}
            className={cn(
              "flex items-center justify-center gap-2 border-r-4 border-black py-4 font-display text-lg font-bold uppercase tracking-wide transition",
              mode === "url" ? "bg-brutal-cyan text-black" : "bg-brutal-white text-black/50"
            )}
          >
            <LinkIcon className="h-5 w-5" />
            Scan URL
          </button>
          <button
            onClick={() => {
              setMode("file");
              resetResult();
            }}
            className={cn(
              "flex items-center justify-center gap-2 py-4 font-display text-lg font-bold uppercase tracking-wide transition",
              mode === "file" ? "bg-brutal-cyan text-black" : "bg-brutal-white text-black/50"
            )}
          >
            <Upload className="h-5 w-5" />
            Scan File
          </button>
        </div>

        {/* Input area */}
        {mode === "url" ? (
          <div className="mb-6">
            <label className="mb-2 block font-body text-sm font-bold uppercase tracking-wide text-black">
              Target URL
            </label>
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://contoh-domain-mencurigakan.com"
              className="w-full border-4 border-black bg-brutal-white px-4 py-3 font-body text-base font-medium text-black shadow-brutal placeholder:text-black/40 focus-visible:outline-none"
            />
          </div>
        ) : (
          <div className="mb-6">
            <label className="mb-2 block font-body text-sm font-bold uppercase tracking-wide text-black">
              Upload File (Maks 32MB)
            </label>
            <div
              onDragOver={(e) => handleDrag(e, true)}
              onDragEnter={(e) => handleDrag(e, true)}
              onDragLeave={(e) => handleDrag(e, false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-3 border-4 border-dashed border-black px-6 py-10 text-center transition",
                dragActive ? "bg-brutal-cyan" : "bg-brutal-white"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
              />
              {file ? (
                <>
                  <FileText className="h-10 w-10 text-black" />
                  <p className="font-body text-sm font-bold text-black">{file.name}</p>
                  <p className="font-body text-xs text-black/60">{formatBytes(file.size)}</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    className="mt-1 flex items-center gap-1 border-2 border-black bg-brutal-red px-3 py-1 font-body text-xs font-bold uppercase text-black shadow-brutal-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                  >
                    <X className="h-3 w-3" /> Hapus
                  </button>
                </>
              ) : (
                <>
                  <Upload className="h-10 w-10 text-black" />
                  <p className="font-body text-sm font-bold text-black">
                    Seret file ke sini, atau klik untuk memilih
                  </p>
                  <p className="font-body text-xs text-black/50">
                    Ukuran maksimum 32MB per file
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Alert */}
        {alert && (
          <div className="mb-6">
            <BrutalAlert
              message={alert.message}
              variant={alert.variant}
              onClose={() => setAlert(null)}
            />
          </div>
        )}

        {/* Scan button */}
        <button
          onClick={handleScan}
          disabled={loading}
          className={cn(
            "flex w-full items-center justify-center gap-2 border-4 border-black bg-brutal-black py-4 font-display text-xl font-extrabold uppercase tracking-wide text-brutal-yellow shadow-brutal transition active:translate-x-1 active:translate-y-1 active:shadow-brutal-sm",
            loading && "cursor-not-allowed opacity-70"
          )}
        >
          {loading ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin-slow" />
              Menganalisis...
            </>
          ) : (
            <>
              <ShieldAlert className="h-6 w-6" />
              Jalankan Scan
            </>
          )}
        </button>

        {/* Results */}
        {result && (
          <div className="mt-10 space-y-6">
            <StatusBadge verdict={result.verdict} mock={result.mock} />

            <div className="grid grid-cols-4 gap-3">
              <StatPill label="Malicious" value={stats.malicious ?? 0} tone="bg-brutal-red" />
              <StatPill
                label="Suspicious"
                value={stats.suspicious ?? 0}
                tone="bg-[#FF8C00]"
              />
              <StatPill label="Harmless" value={stats.harmless ?? 0} tone="bg-brutal-green" />
              <StatPill
                label="Undetected"
                value={stats.undetected ?? 0}
                tone="bg-brutal-white"
              />
            </div>

            <div className="border-4 border-black bg-brutal-white shadow-brutal">
              <div className="flex items-center justify-between border-b-4 border-black bg-brutal-cyan px-4 py-3">
                <p className="font-display text-sm font-extrabold uppercase tracking-wide text-black">
                  Engine Breakdown ({sortedEngines.length})
                </p>
                {result.permalink && (
                  <a
                    href={result.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 font-body text-xs font-bold uppercase text-black underline"
                  >
                    Lihat di VT <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              <div className="brutal-scroll max-h-80 overflow-y-auto">
                {sortedEngines.map((engine, index) => {
                  const isPriority = PRIORITY_ENGINES.includes(engine.engine);
                  return (
                    <div
                      key={`${engine.engine}-${index}`}
                      className={cn(
                        "flex items-center justify-between gap-3 border-b-2 border-black/10 px-4 py-2.5 last:border-b-0",
                        isPriority && "bg-brutal-yellow/40"
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <EngineIcon category={engine.category} />
                        <span
                          className={cn(
                            "truncate font-body text-sm text-black",
                            isPriority && "font-bold"
                          )}
                        >
                          {engine.engine}
                        </span>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 font-body text-xs font-semibold uppercase tracking-wide",
                          engine.category === "malicious"
                            ? "text-brutal-red"
                            : engine.category === "suspicious"
                            ? "text-[#FF8C00]"
                            : "text-black/50"
                        )}
                      >
                        {engine.result}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="mt-10 space-y-6">
          <InfoStrip />
          <TerminalLog />
          <HowItWorks />
          <SupportedEngines />
          <WhyUseThis />
        </div>
      </div>
      </main>
      <SiteFooter />
    </>
  );
}
