import { NextRequest, NextResponse } from "next/server";
import { getFAQ } from "@/lib/sheet";
import { getProducts, formatProductsForPrompt } from "@/lib/myshop";
import { askGemini, DEFAULT_REPLY_FAQ } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  const { message } = await req.json();
  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  let reply = DEFAULT_REPLY_FAQ;
  try {
    const [faqCSV, products] = await Promise.all([
      getFAQ(),
      getProducts().catch(() => []),
    ]);
    const productsText = formatProductsForPrompt(products);
    reply = await askGemini(faqCSV, message, productsText);
  } catch (err) {
    console.error("[test-chat]", err);
  }

  return NextResponse.json({ reply });
}
