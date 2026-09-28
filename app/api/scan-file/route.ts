import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const VT_BASE = "https://www.virustotal.com/api/v3";
const MAX_FILE_SIZE = 32 * 1024 * 1024; // 32MB
const POLL_ATTEMPTS = 12;
const POLL_INTERVAL_MS = 3000;

interface EngineResult {
  engine: string;
  category: string;
  result: string;
}

function buildMockResult(filename: string) {
  const engines = [
    "Kaspersky",
    "CrowdStrike Falcon",
    "Bitdefender",
    "Sophos",
    "Microsoft Defender",
    "ESET-NOD32",
    "Avast",
    "McAfee",
    "TrendMicro",
  ];

  const isMalicious = Math.random() < 0.2;
  const maliciousCount = isMalicious ? 3 + Math.floor(Math.random() * 3) : 0;

  const engineResults: EngineResult[] = engines.map((engine, index) => {
    const flagged = isMalicious && index < maliciousCount;
    return {
      engine,
      category: flagged ? "malicious" : "harmless",
      result: flagged ? "Win32.Trojan.MOCK" : "Clean",
    };
  });

  return {
    mock: true,
    target: filename,
    verdict: isMalicious ? "malicious" : "safe",
    stats: {
      malicious: maliciousCount,
      suspicious: isMalicious ? 1 : 0,
      harmless: engines.length - maliciousCount - (isMalicious ? 1 : 0),
      undetected: 0,
    },
    engines: engineResults,
    permalink: null as string | null,
  };
}

export async function POST(req: NextRequest) {
  let formData: FormData;

  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "INVALID_BODY", message: "Request harus berupa multipart/form-data." },
      { status: 400 }
    );
  }

  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "MISSING_FILE", message: "File wajib diunggah." },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      {
        error: "FILE_TOO_LARGE",
        message: "Ukuran file melebihi batas maksimum 32MB.",
      },
      { status: 413 }
    );
  }

  if (file.size === 0) {
    return NextResponse.json(
      { error: "EMPTY_FILE", message: "File kosong tidak dapat dipindai." },
      { status: 400 }
    );
  }

  const apiKey = process.env.VIRUSTOTAL_API_KEY;

  if (!apiKey || apiKey === "your_virustotal_api_key_here") {
    await new Promise((resolve) => setTimeout(resolve, 1100));
    return NextResponse.json(buildMockResult(file.name));
  }

  try {
    const vtForm = new FormData();
    vtForm.append("file", file, file.name);

    const submitRes = await fetch(`${VT_BASE}/files`, {
      method: "POST",
      headers: { "x-apikey": apiKey },
      body: vtForm,
      cache: "no-store",
    });

    if (submitRes.status === 429) {
      return NextResponse.json(
        {
          error: "RATE_LIMIT",
          message:
            "Kuota VirusTotal API (Free Tier) habis. Tunggu ~1 menit lalu coba lagi.",
        },
        { status: 429 }
      );
    }

    if (submitRes.status === 401) {
      return NextResponse.json(
        {
          error: "UNAUTHORIZED",
          message: "API Key VirusTotal tidak valid. Periksa file .env.local.",
        },
        { status: 401 }
      );
    }

    if (!submitRes.ok) {
      const errText = await submitRes.text();
      return NextResponse.json(
        { error: "VT_SUBMIT_FAILED", message: errText || "Gagal mengunggah file ke VirusTotal." },
        { status: submitRes.status }
      );
    }

    const submitJson = await submitRes.json();
    const analysisId: string = submitJson?.data?.id;

    if (!analysisId) {
      return NextResponse.json(
        { error: "NO_ANALYSIS_ID", message: "VirusTotal tidak mengembalikan ID analisis." },
        { status: 502 }
      );
    }

    let attributes: any = null;

    for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt++) {
      const analysisRes = await fetch(`${VT_BASE}/analyses/${analysisId}`, {
        headers: { "x-apikey": apiKey },
        cache: "no-store",
      });

      if (analysisRes.status === 429) {
        return NextResponse.json(
          {
            error: "RATE_LIMIT",
            message: "Kuota VirusTotal API habis saat polling hasil analisis.",
          },
          { status: 429 }
        );
      }

      if (!analysisRes.ok) break;

      const analysisJson = await analysisRes.json();
      const status = analysisJson?.data?.attributes?.status;
      attributes = analysisJson?.data?.attributes;

      if (status === "completed") break;
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }

    if (!attributes || attributes.status !== "completed") {
      return NextResponse.json(
        {
          error: "ANALYSIS_TIMEOUT",
          message:
            "Analisis file belum selesai dalam batas waktu. File besar butuh waktu lebih lama — coba cek lagi nanti.",
        },
        { status: 202 }
      );
    }

    const stats = attributes.stats ?? {};
    const results = attributes.results ?? {};

    const engines: EngineResult[] = Object.entries(results).map(
      ([engineName, data]: [string, any]) => ({
        engine: engineName,
        category: data?.category ?? "undetected",
        result: data?.result ?? "Clean",
      })
    );

    const isMalicious = (stats.malicious ?? 0) > 0 || (stats.suspicious ?? 0) > 0;

    return NextResponse.json({
      mock: false,
      target: file.name,
      verdict: isMalicious ? "malicious" : "safe",
      stats,
      engines,
      permalink: null,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: "SERVER_ERROR",
        message: err?.message ?? "Terjadi kesalahan tak terduga di server.",
      },
      { status: 500 }
    );
  }
}
