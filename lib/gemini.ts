import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const DEFAULT_REPLY_FAQ =
  "เรื่องนี้แอดมินขอเช็กข้อมูลให้ก่อนนะคะ เพื่อให้ตอบได้ถูกต้องที่สุดค่ะ 🙏 รบกวนรอสักครู่นะคะ เดี๋ยวทีมงานร้านหลังบ้านจะเข้ามาดูแลต่อให้ค่ะ 😊";

const DEFAULT_REPLY_OOB =
  "ขออภัยนะคะ เรื่องนี้อาจอยู่นอกเหนือข้อมูลสินค้าของทางร้านค่ะ แอดมินขอส่งต่อให้ทีมงานตรวจสอบให้อีกครั้งนะคะ 🙏";

function buildPrompt(faqCSV: string, productsText: string, userMessage: string): string {
  return `<role>
คุณคือแอดมินร้านหลังบ้าน ผู้ช่วยตอบคำถามลูกค้าของร้าน "หลังบ้าน - ของอร่อยจากพัทลุง"
ร้านจำหน่ายขนม ของฝาก และอาหารแห้งพื้นบ้านจากจังหวัดพัทลุง
เช่น ปั้นสิบไส้ปลา ครองแครงกรอบ เม็ดมะม่วงกรอบแก้ว ขนมผิง โรตีกรอบ หมี่กรอบ เครื่องแกงใต้
</role>

<constraints>
- ตอบโดยใช้ข้อมูลใน <faq> และ <products> เท่านั้น ห้ามแต่งหรือเดาราคา เวลา หรือที่ตั้งเอง
- ถ้าลูกค้าถามราคาหรือรายละเอียดสินค้า ให้ดูจาก <products> แล้วตอบราคาจริงได้เลย
- ห้ามพูดถึงจำนวนสต็อกหรือว่ามีกี่ชิ้น ให้ตอบแทนว่า "ขนมทำสดใหม่ทุกวันตามออเดอร์ค่ะ ทำเช้า-ส่งบ่ายค่ะ 😊"
- ถ้าคำถามเกี่ยวกับสินค้าร้านแต่ไม่มีใน FAQ หรือ products ให้ตอบว่า:
  "เรื่องนี้แอดมินขอเช็กข้อมูลให้ก่อนนะคะ เพื่อให้ตอบได้ถูกต้องที่สุดค่ะ 🙏 รบกวนรอสักครู่นะคะ เดี๋ยวทีมงานร้านหลังบ้านจะเข้ามาดูแลต่อให้ค่ะ 😊"
- ถ้าคำถามนอกเหนือสินค้าร้านหรือร้านไม่ได้ให้บริการ ให้ตอบว่า:
  "ขออภัยนะคะ เรื่องนี้อาจอยู่นอกเหนือข้อมูลสินค้าของทางร้านค่ะ แอดมินขอส่งต่อให้ทีมงานตรวจสอบให้อีกครั้งนะคะ 🙏"
- โทนภาษา: สุภาพ เป็นกันเอง อบอุ่น เหมือนแอดมินร้านขนมที่คุยกับลูกค้าจริง ไม่แข็ง ไม่เป็นหุ่นยนต์
- ใช้คำลงท้าย "ค่ะ" เป็นหลัก เช่น "ได้เลยค่ะ" "ขอบคุณมากค่ะ"
- Emoji: ใช้พอประมาณ เฉพาะช่วงเปิดบทสนทนา ท้ายข้อความ หรือเพิ่มความเป็นกันเอง เช่น 😊 🙏 ✨
- ความยาว: 1-2 ประโยคสำหรับคำถามทั่วไป / 3-4 ประโยคสำหรับรายละเอียดสินค้า วิธีสั่ง ค่าจัดส่ง การเก็บรักษา หรือปัญหาสินค้า
</constraints>

<output_format>
ภาษาไทย ไม่ใช้ markdown ไม่ใช้ bullet point ตอบเป็นข้อความธรรมดาเท่านั้น
</output_format>

<products>
${productsText}
</products>

<faq>
${faqCSV}
</faq>

<question>
${userMessage}
</question>`;
}

export async function askGemini(
  faqCSV: string,
  userMessage: string,
  productsText = "(ไม่มีข้อมูลสินค้าจาก MyShop)"
): Promise<string> {
  const prompt = buildPrompt(faqCSV, productsText, userMessage);

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: prompt,
    config: {
      temperature: 1.0,
      maxOutputTokens: 1024,
    },
  });

  const candidate = response.candidates?.[0];
  const finishReason = candidate?.finishReason;
  const thoughtsTokenCount = response.usageMetadata?.thoughtsTokenCount ?? 0;
  const candidatesTokenCount =
    response.usageMetadata?.candidatesTokenCount ?? 0;

  console.log(
    `[Gemini] finishReason=${finishReason} thoughtsTokens=${thoughtsTokenCount} candidatesTokens=${candidatesTokenCount}`
  );

  if (finishReason === "MAX_TOKENS") {
    console.warn("[Gemini] MAX_TOKENS hit — returning default reply");
    return DEFAULT_REPLY_FAQ;
  }

  const text = candidate?.content?.parts?.[0]?.text ?? "";
  return text.trim() || DEFAULT_REPLY_FAQ;
}

export { DEFAULT_REPLY_FAQ, DEFAULT_REPLY_OOB };
