import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const VT_BASE = "https://www.virustotal.com/api/v3";
const POLL_ATTEMPTS = 10;
const POLL_INTERVAL_MS = 2500;

interface EngineResult {
  engine: string;
  category: string;
  result: string;
}

function toBase64Url(input: string): string {
  return Buffer.from(input, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function buildMockResult(target: string) {
  const engines = [
    "Kaspersky",
    "CrowdStrike Falcon",
    "Bitdefender",
    "Sophos",
    "Microsoft Defender",
    "ESET-NOD32",
    "Avast",
    "McAfee",
  ];

  const isMalicious = Math.random() < 0.18;
  const maliciousCount = isMalicious ? 2 + Math.floor(Math.random() * 3) : 0;

  const engineResults: EngineResult[] = engines.map((engine, index) => {
    const flagged = isMalicious && index < maliciousCount;
    return {
      engine,
      category: flagged ? "malicious" : "harmless",
      result: flagged ? "Phishing.Generic.MOCK" : "Clean",
    };
  });

  return {
    mock: true,
    target,
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
  let payload: { url?: string };

  try {
    payload = await req.json();
  } catch {
    return NextResponse.json(
      { error: "INVALID_BODY", message: "Body request tidak valid." },
      { status: 400 }
    );
  }

  const targetUrl = payload.url?.trim();

  if (!targetUrl) {
    return NextResponse.json(
      { error: "MISSING_URL", message: "URL wajib diisi." },
      { status: 400 }
    );
  }

  try {
    // eslint-disable-next-line no-new
    new URL(targetUrl);
  } catch {
    return NextResponse.json(
      { error: "INVALID_URL", message: "Format URL tidak valid." },
      { status: 400 }
    );
  }

  const apiKey = process.env.VIRUSTOTAL_API_KEY;

  if (!apiKey || apiKey === "your_virustotal_api_key_here") {
    await new Promise((resolve) => setTimeout(resolve, 900));
    return NextResponse.json(buildMockResult(targetUrl));
  }

  try {
    const submitRes = await fetch(`${VT_BASE}/urls`, {
      method: "POST",
      headers: {
        "x-apikey": apiKey,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ url: targetUrl }),
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
        { error: "VT_SUBMIT_FAILED", message: errText || "Gagal submit URL ke VirusTotal." },
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
            "Analisis VirusTotal belum selesai dalam batas waktu. Coba scan ulang beberapa saat lagi.",
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
      target: targetUrl,
      verdict: isMalicious ? "malicious" : "safe",
      stats,
      engines,
      permalink: `https://www.virustotal.com/gui/url/${toBase64Url(targetUrl)}`,
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
