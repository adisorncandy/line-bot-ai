export type ProductVariant = {
  options: { name: string; value: string }[];
  price: number;
  discountedPrice: number;
};

export type Product = {
  id: number;
  name: string;
  category: string;
  variants: ProductVariant[];
};

let cachedProducts: Product[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getProducts(): Promise<Product[]> {
  const now = Date.now();
  if (cachedProducts && now - cacheTime < CACHE_TTL) {
    return cachedProducts;
  }

  const baseUrl = process.env.OAPLUS_API_URL ?? "https://developers-oaplus.line.biz";
  const apiKey = process.env.OAPLUS_API_KEY;
  if (!apiKey) throw new Error("OAPLUS_API_KEY is not set");

  let allProducts: Product[] = [];
  let page = 1;
  let totalPage = 1;

  do {
    const res = await fetch(
      `${baseUrl}/myshop/v1/products?page=${page}&perPage=100`,
      {
        headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      console.error(`[MyShop] fetch failed: ${res.status}`);
      break;
    }

    const json = await res.json();
    totalPage = json.totalPage ?? 1;

    type RawVariant = { options: { name: string; value: string }[]; price: number; discountedPrice: number };
    type RawProduct = { id: number; name: string; isDisplay: boolean; category: { nameTh: string; nameEn: string }; variants: RawVariant[] };

    const items: Product[] = (json.data as RawProduct[] ?? [])
      .filter((p) => p.isDisplay === true)
      .map((p) => ({
        id: p.id,
        name: p.name ?? "",
        category: p.category?.nameTh ?? p.category?.nameEn ?? "",
        variants: (p.variants ?? []).map((v) => ({
          options: v.options ?? [],
          price: v.price ?? 0,
          discountedPrice: v.discountedPrice ?? v.price ?? 0,
        })),
      }));

    allProducts = [...allProducts, ...items];
    page++;
  } while (page <= totalPage);

  cachedProducts = allProducts;
  cacheTime = now;
  console.log(`[MyShop] loaded ${allProducts.length} visible products`);
  return allProducts;
}

export function formatProductsForPrompt(products: Product[]): string {
  if (products.length === 0) return "(ไม่พบข้อมูลสินค้า)";

  return products
    .map((p) => {
      const cat = p.category ? `[${p.category}] ` : "";
      if (p.variants.length === 0) return `${cat}${p.name}`;

      const hasOnlyDefault = p.variants.length === 1 && p.variants[0].options.length === 0;

      if (hasOnlyDefault) {
        const v = p.variants[0];
        const price = v.discountedPrice < v.price
          ? `${v.discountedPrice} บาท (ลดจาก ${v.price} บาท)`
          : `${v.price} บาท`;
        return `${cat}${p.name} — ราคา ${price}`;
      }

      const variantLines = p.variants
        .map((v) => {
          const label = v.options.map((o) => o.value).join(", ");
          const price = v.discountedPrice < v.price
            ? `${v.discountedPrice} บาท (ลดจาก ${v.price} บาท)`
            : `${v.price} บาท`;
          return `  • ${label}: ${price}`;
        })
        .join("\n");

      return `${cat}${p.name}\n${variantLines}`;
    })
    .join("\n");
}
