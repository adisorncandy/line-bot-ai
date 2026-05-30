import { NextRequest, NextResponse } from "next/server";
import { validateSignature, messagingApi } from "@line/bot-sdk";
import type { webhook } from "@line/bot-sdk";
import { getFAQ } from "@/lib/sheet";
import { askGemini, DEFAULT_REPLY_FAQ } from "@/lib/gemini";

const client = new messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
});

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-line-signature") ?? "";

  const isValid = validateSignature(
    body,
    process.env.LINE_CHANNEL_SECRET!,
    signature
  );
  if (!isValid) {
    console.warn("[LINE] Invalid signature");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed: { events: webhook.Event[] } = JSON.parse(body);

  await Promise.all(
    parsed.events.map(async (event) => {
      if (
        event.type !== "message" ||
        event.message.type !== "text" ||
        !event.replyToken
      ) {
        return;
      }

      const userMessage = (event.message as webhook.TextMessageContent).text;
      let replyText = DEFAULT_REPLY_FAQ;

      try {
        const faqCSV = await getFAQ();
        replyText = await askGemini(faqCSV, userMessage);
      } catch (err) {
        console.error("[Handler] Error:", err);
        replyText = DEFAULT_REPLY_FAQ;
      }

      try {
        await client.replyMessage({
          replyToken: event.replyToken,
          messages: [{ type: "text", text: replyText }],
        });
      } catch (err) {
        console.error("[LINE] Reply failed:", err);
      }
    })
  );

  return NextResponse.json({ status: "ok" });
}
