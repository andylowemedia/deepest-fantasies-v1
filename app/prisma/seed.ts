

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import sizeOf from "image-size";

const prisma = new PrismaClient();

// Dimensions are read from the CDN-hosted image (the source of truth) rather
// than a local file. We fetch just the header bytes (with a full-fetch
// fallback) and parse them with image-size.
async function getDimensions(url: string): Promise<{ imageWidth: number; imageHeight: number }> {
  for (const headers of [{ Range: "bytes=0-131071" }, undefined]) {
    try {
      const res = await fetch(url, headers ? { headers } : undefined);
      if (!res.ok && res.status !== 206) continue;
      const dims = sizeOf(Buffer.from(await res.arrayBuffer()));
      if (dims.width && dims.height) {
        return { imageWidth: dims.width, imageHeight: dims.height };
      }
    } catch {
      // fall through to the next strategy
    }
  }
  console.warn(`getDimensions: could not read dimensions for ${url}`);
  return { imageWidth: 0, imageHeight: 0 };
}

async function main() {
  const existing = await prisma.category.count();
  if (existing > 0) {
    console.log("Database already seeded, skipping.");
    return;
  }

  const [glamour, editorial, swimwear, silhouette, fantasy, scifi, comic, movie] = await Promise.all([
    prisma.category.create({ data: { name: "Glamour", slug: "glamour", description: "Classic glamour photography — timeless, confident, alluring" } }),
    prisma.category.create({ data: { name: "Editorial", slug: "editorial", description: "Styled scenario shoots with attitude and character" } }),
    prisma.category.create({ data: { name: "Swimwear", slug: "swimwear", description: "Sun-drenched poolside and beach glamour" } }),
    prisma.category.create({ data: { name: "Silhouette", slug: "silhouette", description: "Atmospheric light, shadow and implied form" } }),
    prisma.category.create({ data: { name: "Fantasy", slug: "fantasy", description: "Characters, costumes and the imagination unleashed" } }),
    prisma.category.create({ data: { name: "Sci-Fi", slug: "sci-fi", description: "Futuristic worlds, megacities and deep space" } }),
    prisma.category.create({ data: { name: "Comic Book", slug: "comic", description: "Superheroes and villains straight off the page" } }),
    prisma.category.create({ data: { name: "Movie/TV", slug: "movie", description: "Big-screen and TV icons brought to life" } }),
  ]);

  const adminHash = await bcrypt.hash("admin123", 12);
  const userHash = await bcrypt.hash("user123", 12);

  const admin = await prisma.user.create({
    data: { email: "admin@deepestfantasies.com", username: "admin", passwordHash: adminHash, isAdmin: true },
  });

  const user1 = await prisma.user.create({
    data: { email: "dreamer@example.com", username: "DarkDreamer", passwordHash: userHash, bio: "Connoisseur of the finer things" },
  });

  let publishedIndex = 0;
  const baseDate = new Date("2025-01-01T12:00:00Z");

  type MediaInput = { url: string; posterUrl?: string; caption?: string; objectPosition?: string };

  // Gallery + video assets are served from the CDN. Source entries keep their
  // local "/gallery/<file>" and "/video/<file>" paths (so getDimensions can read
  // the gallery file off disk); the stored URL is rewritten to the CDN base here.
  // Override with GALLERY_BASE_URL / VIDEO_BASE_URL.
  const GALLERY_BASE =
    process.env.GALLERY_BASE_URL ??
    "https://cdn.low-emedia.com/sites/deepestfantasies/content/gallery/";
  const VIDEO_BASE =
    process.env.VIDEO_BASE_URL ??
    "https://cdn.low-emedia.com/sites/deepestfantasies/content/video/";

  function toPublicUrl(localUrl: string): string {
    // Rewrite gallery + video assets to the CDN; leave anything else
    // (e.g. /profiles/) untouched.
    if (localUrl.startsWith("/gallery/")) {
      return GALLERY_BASE + localUrl.replace("/gallery/", "");
    }
    if (localUrl.startsWith("/video/")) {
      return VIDEO_BASE + localUrl.replace("/video/", "");
    }
    return localUrl;
  }

  async function buildMedia(input: string | MediaInput, order: number) {
    const m = typeof input === "string" ? { url: input } : input;
    const isVideo = /\.(mp4|webm|mov)$/i.test(m.url);
    // Read dimensions from the CDN; for a video, measure its poster frame.
    const dimsSource = isVideo ? m.posterUrl : m.url;
    const dims = dimsSource
      ? await getDimensions(toPublicUrl(dimsSource))
      : { imageWidth: 0, imageHeight: 0 };
    return {
      url: toPublicUrl(m.url),
      mediaType: isVideo ? "video" : "image",
      posterUrl: m.posterUrl ? toPublicUrl(m.posterUrl) : null,
      caption: m.caption ?? null,
      objectPosition: m.objectPosition ?? null,
      width: dims.imageWidth,
      height: dims.imageHeight,
      order,
    };
  }

  // post() takes either a single media (string or {url, posterUrl}) or an array of them.
  // imageUrl/posterUrl shortcut is kept so existing entries don't need rewriting.
  const post = async (data: {
    title: string;
    description: string;
    imageUrl?: string;
    posterUrl?: string;
    objectPosition?: string;
    media?: (string | MediaInput)[];
    categoryId: string;
    tags: string[];
    publishedAt?: Date;
  }) => {
    const items = data.media ?? [{ url: data.imageUrl!, posterUrl: data.posterUrl, objectPosition: data.objectPosition }];
    return {
      title: data.title,
      description: data.description,
      categoryId: data.categoryId,
      tags: data.tags,
      publishedAt: data.publishedAt ?? new Date(baseDate.getTime() + publishedIndex++ * 60 * 60 * 1000),
      media: { create: await Promise.all(items.map((m, i) => buildMedia(m, i))) },
    };
  };

  // Alias for backward compatibility with the existing entries below.
  const img = post;

  const images = await Promise.all([
    // --- MONICA ---
    prisma.image.create({ data: await img({
      title: "Monica — City After Dark",
      description: "A penthouse overlooking the city at midnight. Monica's silhouette against a sea of glowing lights, those wild curls catching the faint glow from far below. She owns the skyline.",
      imageUrl: "/gallery/00285356550776bc05818be927314c25.jpg",
      categoryId: silhouette.id,
      tags: ["monica", "silhouette", "city", "night", "penthouse"],
    })}),
    prisma.image.create({ data: await img({
      title: "Monica — The Maid",
      description: "Monica plays the part to perfection — a classic French maid outfit that leaves little to the imagination, styled with her signature curls and a knowing smile that suggests the cleaning can wait.",
      imageUrl: "/gallery/09113d7ee9633f1b9c15ec71ea7da17e.jpg",
      objectPosition: "center top",
      categoryId: editorial.id,
      tags: ["monica", "maid", "french maid", "costume", "scenario"],
    })}),
    prisma.image.create({ data: await img({
      title: "Monica & Nicole — Double Trouble",
      description: "Monica and Nicole in matching black latex bikinis. An intimate moment between two very confident women who clearly enjoy each other's company.",
      imageUrl: "/gallery/42237827b3e985d3936e6e55dd875b6d.jpg",
      objectPosition: "center top",
      categoryId: glamour.id,
      tags: ["monica", "nicole", "latex", "duo", "black", "bikini"],
    })}),
    prisma.image.create({ data: await post({
      title: "Monica — Sun Chaser",
      description: "The white plunging one-piece and the oversized shades — Monica's pool uniform. Five chapters: the studio test shot first, then a full afternoon at the villa pool. Standing tall, tanning in the suit, suit slipping, and finally the suit gone entirely. Same shades the whole time.",
      media: [
        { url: "/gallery/a555f43c31de5826f3ab3f01def0a063.jpg", caption: "Sun Chaser — the original take.", objectPosition: "center top" },
        { url: "/gallery/74d0963ead93452b6518e8d445158020.jpg", caption: "Same suit. My pool. My rules." },
        { url: "/gallery/5fa7c5d27f3e741df53f1ad50195aa14.jpg", caption: "Sun on the back, smile on the front." },
        { url: "/gallery/a7be1ffb44ceec51603f1d70988dcffe.jpg", caption: "Suit's slipping. Don't tell anyone." },
        { url: "/gallery/56fb2b02dceb1589bdf7e324561b0682.jpg", caption: "Slipped right off. Stay if you want." },
      ],
      categoryId: glamour.id,
      tags: ["monica", "white", "swimsuit", "sunglasses", "pool", "villa", "carousel"],
      publishedAt: new Date("2026-06-05T18:00:00Z"),
    })}),
    prisma.image.create({ data: await img({
      title: "Monica — Night Duty",
      description: "Monica pulls off the nurse look effortlessly — a tight white zip-up dress, that cascade of dark curls, and heels that belong absolutely nowhere near a hospital.",
      imageUrl: "/gallery/d996f7857baa84423fdee21c31d841cd.jpg",
      objectPosition: "center top",
      categoryId: editorial.id,
      tags: ["monica", "nurse", "white", "costume", "scenario"],
    })}),
    prisma.image.create({ data: await post({
      title: "Monica — White Bikini",
      description: "Two takes in the same white triangle bikini. Front-on with the smile that empties a room, then side-on with the shades on and the lighting doing the rest. Clean, confident, no notes.",
      media: [
        { url: "/gallery/dc19e4a287d0a6e2f4b60e209256f940.jpg", caption: "Smile front and centre — the only accessory she needs.", objectPosition: "center top" },
        { url: "/gallery/e0484f3880bafbb5a844c414551a0d1f.jpg", caption: "Shades on, side-on, studio light doing the rest." },
      ],
      categoryId: swimwear.id,
      tags: ["monica", "white", "bikini", "sunglasses", "studio", "swimwear", "carousel"],
      publishedAt: new Date("2026-06-03T17:45:00Z"),
    })}),
    prisma.image.create({ data: await post({
      title: "Monica — The Bunny",
      description: "Monica in the iconic bunny suit — black satin corset bodysuit, tall ears, bow tie, white cuffs and the fluffy cotton tail. Two takes: the front-on smile that closes the deal, then the over-the-shoulder reveal with the tail in full view. A classic for a reason.",
      media: [
        { url: "/gallery/eaa064e4b567674d1b90b578aa68468f.jpg", caption: "The classic, perfected." },
        { url: "/gallery/28fb78640284bdcc393431b95d71be43.jpg", caption: "Cotton tail and all. Where else were you going to look?" },
      ],
      categoryId: editorial.id,
      tags: ["monica", "bunny", "playboy", "black", "costume", "classic", "carousel"],
      publishedAt: new Date("2026-06-05T16:15:00Z"),
    })}),
    prisma.image.create({ data: await post({
      title: "Monica — The Executive",
      description: "Monica in a pinstripe power suit and rimless glasses — the kind of boss who makes you want to stay late and find reasons to schedule extra meetings. Eleven chapters: first the studio portraits — suit, glasses, that knowing smile — then up to the corner office, from the first deal of the day to long after the floor's gone dark, perched on the desk against the skyline, working the chair, taking the call that closes it, and finally the jacket, the shirt and everything else coming off as the city lights come up. All business. Absolutely not.",
      media: [
        { url: "/gallery/ee9a2ab788bb2c149d4a173c73114fe5.jpg", caption: "Studio portrait — suit, glasses, that knowing smile.", objectPosition: "center top" },
        { url: "/gallery/f99b4454c26259c7b5c10dd12f62d238.jpg", caption: "Shirt unbuttoned a little further. Meeting adjourned.", objectPosition: "center top" },
        { url: "/gallery/097ddf10c03fd76c6dc748e687507032.jpg", caption: "Glasses on, blazer on, rather less underneath.", objectPosition: "center top" },
        { url: "/gallery/42853699af716c5761d8da7df888cf47.jpg", caption: "Corner office, skyline behind her. She runs this floor." },
        { url: "/gallery/3433e2800964e81273040dc72f44e2f1.jpg", caption: "Up against the desk, golden hour pouring in." },
        { url: "/gallery/db18c6e2b8f59e00f018d286696d711e.jpg", caption: "Perched on the edge, legs crossed, completely in charge." },
        { url: "/gallery/49c1afdd646ee8a53272ec9b2f57848c.jpg", caption: "Settled into the big chair like it was made for her." },
        { url: "/gallery/67d1b62f74055bc6a52532fdee262f79.jpg", caption: "On the phone, closing the deal without raising her voice." },
        { url: "/gallery/67b8b8f869d29b8dfbd446d86dc3e7a4.jpg", caption: "Skirt gone, shirt tied off, back against the desk at dusk." },
        { url: "/gallery/382e24485efe67388e0ffff254f42d67.jpg", caption: "City lights up behind her, down to the shirt and not much else." },
        { url: "/gallery/756955544ff10d40a0099c31e6d1cd51.jpg", caption: "After hours in the corner office — nothing left but the view." },
      ],
      categoryId: editorial.id,
      tags: ["monica", "business", "suit", "glasses", "office", "executive", "skyline", "nude", "scenario", "carousel"],
      publishedAt: new Date("2026-06-14T13:00:00Z"),
    })}),

    prisma.image.create({ data: await post({
      title: "Monica — The Fur Series",
      description: "Three takes with one dark fur coat. Monica plays with how much of the moment she's prepared to share — first holding it tight, then loosening, then letting it fall open. Pure old-school glamour. The kind of restraint that only makes you look harder.",
      media: [
        { url: "/gallery/9d8e578e20c10b08d4d8828c9dac798a.jpg", caption: "Held closed at the waist, one bare leg through the split — elegant restraint.", objectPosition: "center top" },
        { url: "/gallery/8c3737364723cf43afd45ba3a171126b.jpg", caption: "Settled on the floor, coat falling open, smiling like she's got nothing to prove." },
        { url: "/gallery/635b1e420e193be717c245817c71f295.jpg", caption: "Coat thrown wide — black lingerie, bare skin, full confidence." },
      ],
      categoryId: glamour.id,
      tags: ["monica", "fur", "coat", "lingerie", "studio", "glamour", "carousel"],
      publishedAt: new Date("2026-06-03T17:30:00Z"),
    })}),

    prisma.image.create({ data: await post({
      title: "Monica — Day Off",
      description: "No costume, no character — just Monica. Black hoodie, worn-in jeans, a pink headband holding back those famous curls, and an afternoon sunk into the couch with nothing to prove. The girl behind all the personas, exactly as she is when nobody's directing. It suits her.",
      media: [
        { url: "/gallery/faafff14bc3a9625c04e737234a3e9c6.jpg", caption: "Sunk into the couch, smiling — this is the real one." },
        { url: "/gallery/f8d0cf1090b78562c00e70f42327edbd.jpg", caption: "Curled into the corner, hoodie and jeans, completely at ease." },
        { url: "/gallery/990e0e43cd92c12da94361487da06892.jpg", caption: "Stretched out, hand in her hair, in no hurry to be anywhere." },
        { url: "/gallery/10a07ab0f10aa0dc6405fce887b1e20a.jpg", caption: "Hands behind her head, grinning — caught off guard and loving it." },
        { url: "/gallery/fa404c821e5cfe5abf43a8e1ea47268c.jpg", caption: "Cross-legged and playful, fixing the headband." },
        { url: "/gallery/6c362022f5f816ba582a8ee4089a6e97.jpg", caption: "Hoodie unzipped, drink in hand — day off, her way." },
      ],
      categoryId: glamour.id,
      tags: ["monica", "casual", "hoodie", "jeans", "couch", "relaxed", "everyday", "carousel"],
      publishedAt: new Date("2026-06-13T15:00:00Z"),
    })}),

    prisma.image.create({ data: await post({
      title: "Monica — Liquid Sunshine",
      description: "A villa pool, high sun, and a yellow zip-front swimsuit that was never going to stay zipped for long. Monica works the water from dry curls to slicked-back wet, the suit riding lower frame by frame until it's gone entirely. Six chapters of pure summer heat — glamour-nude in the Playboy vein, all golden skin and bright blue water. The kind of afternoon that doesn't need a reason.",
      media: [
        { url: "/gallery/8d5d594578f7b0b4a534920f30d26776.jpg", caption: "Yellow zip, wet curls, the sun doing half the work." },
        { url: "/gallery/35bf5c63f85970ebb192b05e12b5db1d.jpg", caption: "Hair slicked back, suit on, dripping at the pool's edge." },
        { url: "/gallery/2f67035680e136723188dd18cf380987.jpg", caption: "Kneeling in the shallows, head back, zip giving way." },
        { url: "/gallery/b1b80d32fc58d3c4682ea8ce27ff6a28.jpg", caption: "Suit down to a yellow slip, golden in the low light." },
        { url: "/gallery/8ecb7bac03fd653aa6af3da77ad32555.jpg", caption: "A glance over the shoulder, nothing left but the water." },
        { url: "/gallery/1a0c49dfaddfe3a73e52511851b2e8ad.jpg", caption: "Wet, bare and smiling — the suit's a memory now." },
      ],
      categoryId: glamour.id,
      tags: ["monica", "pool", "yellow", "swimsuit", "villa", "summer", "nude", "glamour", "carousel"],
      publishedAt: new Date("2026-06-14T08:00:00Z"),
    })}),

    prisma.image.create({ data: await post({
      title: "Monica — Black Diamond",
      description: "Monica at her most polished — a floor-length black gown shot through with glitter, those signature curls slicked back into a sleek ponytail, nothing but studio light and attitude. No cosplay, no character this time: just elegance turned all the way up. Nine frames of pure black-tie poise, from full-length and front-on to a slow kneel and a last look back over the shoulder. The crown jewel, doing what she does best.",
      media: [
        { url: "/gallery/c73cc3a67607e94d4c6af33cc53467b3.jpg", caption: "Floor-length and flawless, lit up like the night sky.", objectPosition: "center top" },
        { url: "/gallery/5cb9bdb6299e75b6b019fd7e31b00a02.jpg", caption: "Sleek, statuesque, completely in control.", objectPosition: "center top" },
        { url: "/gallery/a51ea543e4fc7ac6500ba04c188ac36e.jpg", caption: "High neck, high shine, that easy smile.", objectPosition: "center top" },
        { url: "/gallery/510d4a60bda44474f4dbec63562e9a6c.jpg", caption: "A quarter turn, the glitter catching every move.", objectPosition: "center top" },
        { url: "/gallery/e5d1f19f517865b3819b80d3ecb89d4e.jpg", caption: "Poised and unhurried — she knows exactly how good she looks.", objectPosition: "center top" },
        { url: "/gallery/1b19ab7dba070db20fd1f01916a72fac.jpg", caption: "Soft light, sharp lines, not a thing out of place.", objectPosition: "center top" },
        { url: "/gallery/8037d7207669f54288f2631297a2cc4c.jpg", caption: "Down to the floor, gown pooling around her.", objectPosition: "center top" },
        { url: "/gallery/9acb9366805d98ed819b6b289643161e.jpg", caption: "A glance back over the shoulder, ponytail swinging." },
        { url: "/gallery/061a6ef13ac6569181de28efb2a8c07d.jpg", caption: "Walking away, smiling — last word, as always." },
      ],
      categoryId: glamour.id,
      tags: ["monica", "black", "gown", "glitter", "sparkle", "studio", "glamour", "elegant", "ponytail", "carousel"],
      publishedAt: new Date("2026-06-15T07:00:00Z"),
    })}),

    prisma.image.create({ data: await post({
      title: "Monica — Castaway",
      description: "Monica washed up somewhere far better than home — a deserted stretch of white sand, turquoise lagoon, a lone green peak rising across the water. Hair wet and slicked back, skin sun-warm and salt-kissed, not a stitch or another soul in sight. Seven frames of pure desert-island daydream, from a quiet face-down in the sand to long, languid stretches at the water's edge. Paradise, and she's the only thing on it.",
      media: [
        { url: "/gallery/7e7a733ed4b22428bf7bd94a18de947b.jpg", caption: "Cheek to the sand, the whole lagoon to herself." },
        { url: "/gallery/02b309fc86ceb809c676f591768bcba6.jpg", caption: "Wet hair, salt skin, that slow castaway smile." },
        { url: "/gallery/cc9afc7ea09aa7343d5e5f93b4f20497.jpg", caption: "Stretched out where the tide just reaches.", objectPosition: "center top" },
        { url: "/gallery/0d4b0313f176dbe0926aaba375869eb2.jpg", caption: "Gazing off toward the peak across the water." },
        { url: "/gallery/faf56f1ee866130c09ded97ac753a296.jpg", caption: "Sun-warm and unhurried in the shallows." },
        { url: "/gallery/c4c39a26af943a47d26e27678dfbc744.jpg", caption: "Reclined on the bright sand, paradise behind her." },
        { url: "/gallery/7b6191a8fd66a44dc513054e1aceb4df.jpg", caption: "Glistening in the heat, the lagoon shimmering past." },
      ],
      categoryId: glamour.id,
      tags: ["monica", "beach", "island", "tropical", "lagoon", "sand", "wet hair", "sun", "nude", "glamour", "carousel"],
      publishedAt: new Date("2026-06-19T06:00:00Z"),
    })}),

    // --- OTHER CHARACTERS ---
    prisma.image.create({ data: await img({
      title: "Golden Hour",
      description: "Studio gold. A striking blonde in a liquid-gold metallic bikini with black trim, commanding every inch of the frame with the kind of confidence that doesn't need a backdrop.",
      imageUrl: "/gallery/037c53ea1bef891c2f195e36e547bf65.jpg",
      objectPosition: "center top",
      categoryId: glamour.id,
      tags: ["blonde", "gold", "bikini", "studio", "glamour"],
    })}),
    prisma.image.create({ data: await img({
      title: "Neon Threshold",
      description: "She stands in a neon-framed doorway, arms raised wide, a warm pink-red light tracing every curve. The villa behind her is cool and blue. Everything in front of her glows — then it moves.",
      media: [
        { url: "/gallery/1e8f6c7e304242997749386f73fb8228.jpg" },
        { url: "/video/c1022b840f078bdbc0c834d579bd84ef.mp4", posterUrl: "/gallery/1e8f6c7e304242997749386f73fb8228.jpg" },
      ],
      categoryId: silhouette.id,
      tags: ["neon", "silhouette", "doorway", "red light", "night", "video"],
    })}),
    prisma.image.create({ data: await img({
      title: "First Class",
      description: "A sun-kissed redhead in a fitted captain's uniform perched on the desk, one leg up, a smile that suggests this particular flight is going to be very memorable indeed.",
      imageUrl: "/gallery/24fed93953b1d908ada174bbbc7fd451.jpg",
      objectPosition: "center top",
      categoryId: editorial.id,
      tags: ["redhead", "uniform", "air hostess", "office", "scenario"],
    })}),
    prisma.image.create({ data: await img({
      title: "Red Alert",
      description: "Two powerhouses on the shoreline at golden hour. Matching red latex swimsuits, waves at their feet, the whole sky burning behind them. Neither one is here to cool down.",
      imageUrl: "/gallery/5938dfed12d990f5389268108ce5fccf.jpg",
      objectPosition: "center top",
      categoryId: swimwear.id,
      tags: ["duo", "beach", "red", "latex", "sunset", "swimwear"],
    })}),
    prisma.image.create({ data: await img({
      title: "Storm Chaser",
      description: "Lightning cracks behind her as she stands on the rooftop — arms wide, black latex catsuit, lightning bolt insignia blazing across her chest. She doesn't fear the storm. She is the storm.",
      imageUrl: "/gallery/5ba02e851e185f1a4d7a9cc33226c49e.jpg",
      objectPosition: "center top",
      categoryId: fantasy.id,
      tags: ["blonde", "superhero", "latex", "lightning", "rooftop", "fantasy"],
    })}),
    prisma.image.create({ data: await img({
      title: "Purple Reign",
      description: "Golden hour by the pool. A metallic purple bikini catching every ray, water still dripping from a swim that just ended, the whole yard glowing amber and warm.",
      imageUrl: "/gallery/b03cbad618c6a6ec9fe7bfa3626e6ae7.jpg",
      objectPosition: "center top",
      categoryId: swimwear.id,
      tags: ["pool", "purple", "bikini", "sunset", "golden hour"],
    })}),
    prisma.image.create({ data: await img({
      title: "Little Black Dress",
      description: "The classic LBD — elevated. A platinum blonde in a strapless bandage mini with red lips, leaning forward with the kind of pose that empties a room of conversation.",
      imageUrl: "/gallery/bc300baccf82ae0bc559eeab8160550f.jpg",
      objectPosition: "center top",
      categoryId: glamour.id,
      tags: ["blonde", "black dress", "studio", "glamour", "classic"],
    })}),
    prisma.image.create({ data: await img({
      title: "Candy Striper",
      description: "All pink, all attitude. A blonde in a candy-pink nurse costume, thigh-highs, a hat perched perfectly — more prescription than care plan, and entirely unapologetic about it.",
      imageUrl: "/gallery/e844bde4205ab15f0edcec4d372fb1df.jpg",
      objectPosition: "center top",
      categoryId: editorial.id,
      tags: ["blonde", "nurse", "pink", "costume", "scenario"],
    })}),
    prisma.image.create({ data: await post({
      title: "The Alien Saga",
      description: "A purple-skinned warrior queen, three chapters deep. First the empress, kneeling but bowing to no one. Then the lightsaber lit and the blaster ready, armed for whatever's coming. And finally the duel itself — lightsabers crossed in the heart of a spacecraft, against a blue-skinned, red-eyed enemy. Leia's authority, Han's swagger, Luke's saber. She didn't choose sides in any war. She ended them.",
      media: [
        { url: "/gallery/e9c86035f79f1b2d7af6ef9a13ed1c8f.jpg", caption: "The empress — kneeling, glowing eyes, ancient markings. Not here to be tamed.", objectPosition: "center top" },
        { url: "/gallery/7f0b39609f8a4edd311a531b2f0e0c67.jpg", caption: "Lightsaber lit, blaster drawn — she came prepared for both outcomes." },
        { url: "/gallery/5701e4c2279f382c4fe8320acff93e2f.jpg", caption: "Blades crossed in deep space. The galaxy holds its breath." },
      ],
      categoryId: fantasy.id,
      tags: ["alien", "sci-fi", "fantasy", "purple", "lightsaber", "warrior", "saga", "carousel"],
      publishedAt: new Date("2026-06-03T17:50:00Z"),
    })}),
    prisma.image.create({ data: await post({
      title: "Cyberpunk Skyline",
      description: "Three views of the same neon city, told in three different lights. Start above the light trails snaking between towers, drop into the rain and the holograms, then ride a helicopter past the giant face on the billboard. Down in those streets, everything is for sale. Up here, someone's always watching.",
      media: [
        { url: "/gallery/3d0c334f96d7dfe7f3e28b61747a36d1.jpg", caption: "Aerial — blue and orange light trails cutting between towers. The city breathes electricity." },
        { url: "/gallery/776e14153b6f2dabbcecff2d7fe881b8.jpg", caption: "Rain and purple neon, helicopters weaving the holograms. Everything is for sale." },
        { url: "/gallery/ee58aca2e804351b7b05ff1135c5d421.jpg", caption: "Helicopter side view — a face on the billboard, watching. Always watching." },
      ],
      categoryId: scifi.id,
      tags: ["cyberpunk", "city", "neon", "rain", "helicopter", "noir", "carousel"],
      publishedAt: new Date("2026-06-03T18:00:00Z"),
    })}),
    prisma.image.create({ data: await img({
      title: "Orbital Station",
      description: "A vast space station complex hangs above Earth — rings, platforms and docked vessels lit blue against the dark of space. Whatever mission begins here, it doesn't end quietly.",
      imageUrl: "/gallery/abc03fc734b377a53c4e89a77fd8b46a.jpg",
      categoryId: scifi.id,
      tags: ["space", "station", "orbit", "earth", "futuristic", "sci-fi"],
      publishedAt: new Date("2026-06-02T17:00:00Z"),
    })}),
    prisma.image.create({ data: await img({
      title: "Still Water",
      description: "Black and white. She stands in a shower, face in profile, water falling around her like rain. Her shadow doubles her on the wall. Intimate, quiet, completely still despite everything moving.",
      imageUrl: "/gallery/6ebb5756c8da651c9dcbaa78500ad535.jpg",
      categoryId: silhouette.id,
      tags: ["shower", "bw", "silhouette", "intimate", "cinematic", "water"],
      publishedAt: new Date("2026-06-02T19:00:00Z"),
    })}),
    prisma.image.create({ data: await img({
      title: "Black Tiles",
      description: "Hands pressed against black tiles, water tracing every line of her back, the rain head above her blurring everything soft. Dark, editorial, completely controlled.",
      imageUrl: "/gallery/cd5a96cd11408f1158db72fc4e3745a1.jpg",
      categoryId: glamour.id,
      tags: ["shower", "back", "water", "dark", "editorial", "glamour"],
      publishedAt: new Date("2026-06-02T20:00:00Z"),
    })}),
    prisma.image.create({ data: await post({
      title: "Monica — The Rogue Series",
      description: "Monica steps into Rogue's green and yellow leather and never quite steps back out. Five chapters: the suit on for the first time, a stroll through Times Square, then up into the New York sky to blow you a kiss, fly straight at you, and wave goodbye in motion. Pure 92 series — all that warmth, nowhere to put it, and the gloves stay on.",
      media: [
        { url: "/gallery/0a406070a507de173bfb3e9df867ebce.jpg", caption: "Suit on, gloves checked, white streak in place — ready, sugah?", objectPosition: "center top" },
        { url: "/gallery/11c2223a93e3eff7767469f7ff7cc913.jpg", caption: "Just out for a stroll in Times Square. New York didn't see her comin'." },
        { url: "/gallery/10b03f800fe079b14c3717031f16db90.jpg", caption: "Hey sugah. Don't go missin' me too much down there." },
        { url: "/gallery/228d2d1b771394c6a1744230f0f159b0.jpg", caption: "Y'all ready to play? Come on then — try and keep up." },
        { url: "/video/50f701bbc65fffcc558fbfb5100f2222.mp4", posterUrl: "/gallery/228d2d1b771394c6a1744230f0f159b0.jpg", caption: "See ya later, darlin'. Same time tomorrow?" },
      ],
      categoryId: comic.id,
      tags: ["monica", "rogue", "x-men", "superhero", "cosplay", "new york", "flying", "video", "carousel"],
      publishedAt: new Date("2026-06-03T18:05:00Z"),
    })}),
    prisma.image.create({ data: await post({
      title: "Monica — Modern Jedi",
      description: "No robes, no temple, no ceremony — just Monica in a beaten brown leather jacket, black tank and leather pants, igniting a green lightsaber like it's a Tuesday. The reveal in the studio, the first wave of stormtroopers deflected in an Imperial corridor, and then the Sith arrives. Four chapters: the calm before, the easy part, the standoff, and the duel. All Sith should beware.",
      media: [
        { url: "/gallery/f37768e784f56c8aaf17766e3b45da43.jpg", caption: "Saber lit. Force balanced. Let's go to work." },
        { url: "/gallery/e6f9649caffe22030f4b4a487bc97a3a.jpg", caption: "Blaster bolts? Cute. Send more." },
        { url: "/gallery/ae84fda3d7caa3debe4e0bb94ffeb783.jpg", caption: "Sith arrives. About time someone showed up worth my saber." },
        { url: "/gallery/0e050f10b2e94bce301a726b2a7d402c.jpg", caption: "Green crosses red. The Force decides who walks out." },
      ],
      categoryId: movie.id,
      tags: ["monica", "jedi", "star wars", "lightsaber", "sith", "modern", "leather", "duel", "carousel"],
      publishedAt: new Date("2026-06-05T05:45:00Z"),
    })}),
    prisma.image.create({ data: await img({
      title: "Shower Kiss",
      description: "Black and white, water falling, two silhouettes pressed against the tile. A kiss caught in the steam — and a shadow on the wall that watches it happen. Nothing said, everything understood.",
      imageUrl: "/gallery/a2147ceaf4a8c2b8edab814ea0ef142f.jpg",
      categoryId: glamour.id,
      tags: ["couple", "shower", "kiss", "bw", "intimate", "shadow", "cinematic"],
      publishedAt: new Date("2026-06-03T09:45:00Z"),
    })}),
    prisma.image.create({ data: await post({
      title: "Monica — Steam & Shadow",
      description: "A four-frame film noir study. Monica under the shower, head tilted back into the water, long wet hair tracing the line of her back, no expression beyond the quiet pleasure of the moment. Black and white, hard light, the kind of intimate that doesn't need to say anything.",
      media: [
        "/gallery/9820f9b3b0be4f94aa804a7776297539.jpg",
        "/gallery/4c31d3e291321450159041b9110d7b5d.jpg",
        "/gallery/d158e54d3e2dbaafedf341f56b8d7c56.jpg",
        "/gallery/23a17c8e2f7545b744d8fa36a79ca0c5.jpg",
      ],
      categoryId: silhouette.id,
      tags: ["monica", "shower", "bw", "noir", "intimate", "water", "hair", "profile", "carousel"],
      publishedAt: new Date("2026-06-03T16:00:00Z"),
    })}),
    prisma.image.create({ data: await post({
      title: "Monica — Raiders",
      description: "Monica's Indy in three acts. First the temple sprint — fedora on, whip in hand, boulder bearing down. Then the cool-down — jacket slipped open, hat held in her lap, treasure safely stashed. And finally the curtain call — everything off but the hat. The artefact's hers. So is the rest of the night.",
      media: [
        { url: "/gallery/5f0f5e3ff37471562461fc8d9fb320c4.jpg", caption: "It belongs in a museum. But first she's got to outrun the boulder." },
        { url: "/gallery/537a708e93a23e9dc189e0515776b356.jpg", caption: "Adventure done. Hat in hand. Tell me again about the museum, professor." },
        { url: "/gallery/a588d0bb69de6d3f31c282d8408c4074.jpg", caption: "Off duty. The treasure can wait. The hat covers what needs covering." },
      ],
      categoryId: movie.id,
      tags: ["monica", "indiana jones", "raiders", "fedora", "whip", "boudoir", "cosplay", "carousel"],
      publishedAt: new Date("2026-06-03T18:10:00Z"),
    })}),
    prisma.image.create({ data: await post({
      title: "Monica — Who You Gonna Call",
      description: "Monica suits up for Ghostbusters duty — cream leather jumpsuit zipped just enough to keep things interesting, the iconic no-ghost patch on her shoulder, proton pack strapped to her back, black combat boots on her feet. Class IV apparitions: form an orderly queue — starting with the slimy green one haunting the hotel hallway.",
      media: [
        { url: "/gallery/e4bf8010f600dc919ac2c699b528220f.jpg", caption: "Suited, packed and ready. Class IV apparitions, form an orderly queue.", objectPosition: "center top" },
        { url: "/gallery/fa4ca51700719f684b2ae1e7683d527a.jpg", caption: "Stream crossed, boots planted — cornering the slimy green one down the hotel hallway." },
      ],
      categoryId: movie.id,
      tags: ["monica", "ghostbusters", "cosplay", "proton pack", "jumpsuit", "ghost", "hotel", "80s", "iconic", "carousel"],
      publishedAt: new Date("2026-06-03T18:12:00Z"),
    })}),
    prisma.image.create({ data: await post({
      title: "Melissa — Supergirl",
      description: "Meet Melissa, our blue-eyed blonde with sunshine for a smile and a red cape pinned to her shoulders. Three takes: a quiet studio shot before the shift starts, then airborne over Metropolis, then a vintage film-frame moment that wouldn't look out of place in the Christopher Reeve era. All the brightness and optimism of the comic-book Supergirl, none of the brooding. The world's a better place when she's in the sky.",
      media: [
        { url: "/gallery/3e88793d565f4d821484454227331d02.jpg", caption: "Just got the cape this morning. How does it look?", objectPosition: "center top" },
        { url: "/gallery/3543902db29039647b13a2b641255e62.jpg", caption: "Oh — you're welcome, Metropolis." },
        { url: "/gallery/538d6a32b4afe03ab734de29d5378bd0.jpg", caption: "Hold for camera, fellas. Don't forget my good side." },
      ],
      categoryId: comic.id,
      tags: ["melissa", "supergirl", "dc", "superhero", "cosplay", "blonde", "metropolis", "flying", "cinematic", "carousel"],
      publishedAt: new Date("2026-06-04T06:30:00Z"),
    })}),
    prisma.image.create({ data: await post({
      title: "Brandy — Storm",
      description: "Brandy steps into Storm's silver hair, glowing white eyes, white leather catsuit, full cape and the X belt — and pulls a sky full of lightning down over Times Square. Three takes: claiming the ground, calling the storm, and ascending into it. Regal, calm, completely in control. Goddesses don't ask.",
      media: [
        { url: "/gallery/c10e200edc75d2692beeaa241f0be702.jpg", caption: "The city is mine tonight. So is the sky." },
        { url: "/gallery/2365eb395486f255b8f9714f9f894b3c.jpg", caption: "Lightning calls. I always answer." },
        { url: "/gallery/623f58ac7d9069d58d0fe1761fd4cf44.jpg", caption: "Up here, the wind answers only to me." },
      ],
      categoryId: comic.id,
      tags: ["brandy", "storm", "x-men", "marvel", "superhero", "cosplay", "lightning", "times square", "carousel"],
      publishedAt: new Date("2026-06-04T18:35:00Z"),
    })}),
    prisma.image.create({ data: await post({
      title: "Amy — Leather & Chrome",
      description: "Meet Amy. Blonde, blue-eyed, and trouble in a leather jacket. Four takes that go from the diner parking lot to the studio floor — a vintage Harley, a coiled-spring crouch, an editorial moto portrait, and the jacket finally cracked open. She's the kind of girl who'll borrow your bike, hit two state lines, and call you from a payphone laughing.",
      media: [
        { url: "/gallery/21a76d80b57ef3028380e474be6fc483.jpg", caption: "Coffee, then trouble. In that order." },
        { url: "/gallery/486b0e96b1746c658e29bae0ed6ad6eb.jpg", caption: "Try to keep up. Last guy didn't." },
        { url: "/gallery/f7aa8538ae840a29e8cac76b0b76f1c9.jpg", caption: "Don't ask where I'm going. Ask if I'm coming back." },
        { url: "/gallery/77bdad8d19a02c3b007729458385a82e.jpg", caption: "Jacket's still on. That's all you get to know tonight." },
      ],
      categoryId: glamour.id,
      tags: ["amy", "leather", "motorcycle", "harley", "biker", "blonde", "diner", "editorial", "carousel"],
      publishedAt: new Date("2026-06-05T00:30:00Z"),
    })}),
    prisma.image.create({ data: await post({
      title: "Hallee — The Empress",
      description: "Meet Hallee. A day in the life of a tribal empress, told in four chapters. She arrives through her village with flowers and attendants, takes the golden throne to receive her court, then retires to the red-and-gold of her private tent — first kneeling, then reclining. Public power, then private repose. The crown stays on for the public. Everything else is by invitation only.",
      media: [
        { url: "/gallery/8363848a11148b3e51945bc8745ba4a0.jpg", caption: "Bring me flowers and tell me you love me. We'll see." },
        { url: "/gallery/543cd2eaa3a74adeb0c1ac56c08a74a0.jpg", caption: "Speak. The throne is listening." },
        { url: "/gallery/052e798af31bf2dab4d5b64d1c15c9b3.jpg", caption: "Come closer. The crown comes off in here." },
        { url: "/gallery/85d50a5ea296a0a8dd9bc6a4de723d77.jpg", caption: "The empress is at rest. Don't disappoint her." },
      ],
      categoryId: editorial.id,
      tags: ["hallee", "empress", "queen", "tribal", "throne", "boudoir", "tent", "editorial", "carousel"],
      publishedAt: new Date("2026-06-05T02:00:00Z"),
    })}),
    prisma.image.create({ data: await post({
      title: "Monica — Gym Day",
      description: "This is why Monica has her own private gym at home — there's no way she'd train like this anywhere else. Five frames in pink: tear-shirt and light dumbbells, shirt gone, side squats, front squats, and a cool-down stretch on the mat. The headband stays on the whole time. The rest is negotiable.",
      media: [
        { url: "/gallery/944ec7b5d287001820149255281588d4.jpg", caption: "First set. Try not to stare.", objectPosition: "center top" },
        { url: "/gallery/f9bed66901973a95db51ce8c18ba7319.jpg", caption: "Shirt's gone. Real work starts now." },
        { url: "/gallery/299f2f16f0949b71614f7d3dfe6989d2.jpg", caption: "Squats are about form. You like the angles?" },
        { url: "/gallery/05622dcf62db79be0cf00fa2ba54d670.jpg", caption: "Front view. Hands stay where they are." },
        { url: "/gallery/20390eb22e24ba9f44e692fa55c29a72.jpg", caption: "Cool down. Or warm up. Your call." },
      ],
      categoryId: glamour.id,
      tags: ["monica", "gym", "workout", "fitness", "pink", "headband", "squats", "yoga", "private", "carousel"],
      publishedAt: new Date("2026-06-05T05:30:00Z"),
    })}),
    prisma.image.create({ data: await post({
      title: "Hallee — Studio 54",
      description: "Four chapters of one club night. Out on the floor in the red mini, climbing the pole as the centrepiece, settling into the VIP booth with a champagne flute, and finally stretched out on the leather with the heels still on. Neon, smoke, and a crowd that came to watch. Tonight she's letting the music decide.",
      media: [
        { url: "/gallery/410051df660a313a89007ac5f5c3f2cd.jpg", caption: "Music caught me. Don't take it personally." },
        { url: "/gallery/2982237ccd50e1e4d4caece237731a8b.jpg", caption: "Up here the view's better. So is the audience." },
        { url: "/gallery/d7619e3e7b055fd73d4d80a05fcdfc42.jpg", caption: "Bubbles for the floor. Bubbles for me. Bubbles for whoever's still standing." },
        { url: "/gallery/3fb1da27b472126b380acd4fc50a9049.jpg", caption: "Lights down. Heels on. Don't go yet." },
      ],
      categoryId: editorial.id,
      tags: ["hallee", "club", "nightlife", "studio 54", "dancing", "pole", "vip", "neon", "red", "carousel"],
      publishedAt: new Date("2026-06-05T07:30:00Z"),
    })}),
    prisma.image.create({ data: await post({
      title: "The Gala",
      description: "All five of them in one room. A black-tie ballroom, chandeliers overhead, champagne flowing, every gown a statement. Monica, Hallee, Melissa, Brandy and Amy at the same gala — no capes, no characters, just glamour at its most ruthless. Crossover events don't happen often. When they do, the rest of the room becomes background.",
      media: [
        { url: "/gallery/f651a7ed7770a680874e8e722c68be84.jpg", caption: "Five gowns, five reasons to skip the speeches." },
        { url: "/gallery/f3641c205a618f227d8da2f40281a0c2.jpg", caption: "Gold, white, silver — and the conversation no one outside this triangle gets to hear." },
        { url: "/gallery/60d458a2c5162a66703826d382b235e8.jpg", caption: "Some nights write themselves." },
      ],
      categoryId: glamour.id,
      tags: ["monica", "hallee", "melissa", "brandy", "amy", "gala", "black tie", "crossover", "ballroom", "champagne", "carousel"],
      publishedAt: new Date("2026-06-05T08:30:00Z"),
    })}),
    prisma.image.create({ data: await post({
      title: "Hallee — After Hours",
      description: "Five black-and-white film noir frames in a black-tile shower — Hallee alone with the water. Starts full-length and pulls in slow: framed in the doorway, head tilted back into the rain, the curve of her profile, then finally a glance over the shoulder. Pure silence except the water. The kind of intimacy that doesn't need an audience.",
      media: [
        { url: "/gallery/0689811444f95644858088e8dd2df00f.jpg", caption: "Lock the door. The rest of the world can wait." },
        { url: "/gallery/92eaa77fa378f29204e0abedcf0b8365.jpg", caption: "Washing the day off, one drop at a time." },
        { url: "/gallery/6daff61ad22f16a25db4096e617b547d.jpg", caption: "Hot water, low light, no audience required." },
        { url: "/gallery/bb47f26cf4082b0492618ba3194ae9cd.jpg", caption: "Don't speak. The water's doing all the talking." },
        { url: "/gallery/0c4992d97eb46570c3e6342cc2929f78.jpg", caption: "You weren't supposed to be in here. Stay anyway." },
      ],
      categoryId: silhouette.id,
      tags: ["hallee", "shower", "bw", "noir", "intimate", "water", "after hours", "carousel"],
      publishedAt: new Date("2026-06-05T09:15:00Z"),
    })}),
    prisma.image.create({ data: await post({
      title: "Brandy — The Villa",
      description: "An afternoon at her place, told in six beats. Settle into the deck chair, drift over to the sun lounger, slip into the pool, work the suit off in the water, then back to the lounger with nothing on at all. Sunglasses never leave her face. Pure Helmut Newton — luxury, sun, and the kind of quiet only money buys.",
      media: [
        { url: "/gallery/1eb6a7a9dbe0c8955528a44d321b74c6.jpg", caption: "Settle in. We've got time." },
        { url: "/gallery/3355162ffdcb3ae164a00a9edb35eeb8.jpg", caption: "An afternoon well spent." },
        { url: "/gallery/09348a6569b4f4a4a1a9b20d584839ce.jpg", caption: "Now the real part starts." },
        { url: "/gallery/704cd3f297ae6d1635870937ceaeb6cd.jpg", caption: "Suit's getting in the way." },
        { url: "/gallery/3c8aea27dc259852e9742af38529c04a.jpg", caption: "Better. The water doesn't ask questions." },
        { url: "/gallery/6bf19933879c083c631e9539e4696203.jpg", caption: "Day's almost done. Stay if you want." },
      ],
      categoryId: glamour.id,
      tags: ["brandy", "villa", "pool", "bw", "swimwear", "editorial", "luxury", "helmut newton", "carousel"],
      publishedAt: new Date("2026-06-05T11:00:00Z"),
    })}),
    prisma.image.create({ data: await post({
      title: "Melissa — Harley Quinn",
      description: "Melissa swaps the cape for a jester hat. Classic comic Harley — white face paint, black diamond mask, the red and black catsuit, and the big mallet she absolutely will use. Three takes: hammer on the shoulder mid-grin, leaning on it like it's a walking stick, then a parting glance with the mallet at her side. Pure 90s animated chaos.",
      media: [
        { url: "/gallery/9023a1eaf35a17d41ab0530e0ddae50d.jpg", caption: "Heya, puddin'! Look what Harls found!", objectPosition: "center top" },
        { url: "/gallery/621e46ef00c39a79a41d66eebea7e406.jpg", caption: "C'mon, ya gotta admit — Harls did good." },
        { url: "/gallery/e48825c25bafac102d83a06e867292a3.jpg", caption: "What? Ya thought I was leavin' without ya?" },
      ],
      categoryId: comic.id,
      tags: ["melissa", "harley quinn", "dc", "cosplay", "jester", "mallet", "chaos", "carousel"],
      publishedAt: new Date("2026-06-05T13:50:00Z"),
    })}),
    prisma.image.create({ data: await post({
      title: "Melissa — Poison Ivy",
      description: "Melissa swaps cape and mallet for green velvet and ivy. Classic Poison Ivy — red hair, leaf-trimmed corset, long gloves, mint-green tights. Three takes: a kiss in the studio, her domain in the greenhouse surrounded by alien vines, then the bedroom where she does her best work. Sultry, controlled, completely in charge. Pheromones do the rest.",
      media: [
        { url: "/gallery/7196875477e442e132666de700179619.jpg", caption: "Hello, lover. That one's free.", objectPosition: "center top" },
        { url: "/gallery/3ed5bf54db372a2ec29cbf3274fd637e.jpg", caption: "Welcome to my garden. The plants are friendly. I'm not." },
        { url: "/gallery/3060a249beb869b29f0fcf46964ab2a2.jpg", caption: "Don't bother running. The pheromones do the asking." },
      ],
      categoryId: comic.id,
      tags: ["melissa", "poison ivy", "dc", "batman", "villain", "cosplay", "red hair", "greenhouse", "carousel"],
      publishedAt: new Date("2026-06-05T14:30:00Z"),
    })}),
    prisma.image.create({ data: await post({
      title: "Melissa — Batgirl",
      description: "Same red wig, very different night. Melissa pulls on the cowl, the yellow belt and the bat-symbol, and goes to work in Gotham. Four chapters: cowl on and ready in the studio, then a rooftop watch over the skyline, then on the cable mid-swing, and finally a full leap between buildings. Smart, quick, and the only one in the rogues gallery actually doing the job.",
      media: [
        { url: "/gallery/91e8aa74ae155e4562a9ea9f94652161.jpg", caption: "Cowl on. Comms live. Let's get to work.", objectPosition: "center top" },
        { url: "/gallery/23878e332ab01a6f31a05355e46f9824.jpg", caption: "Gotham looks better from up here. Don't get too comfortable." },
        { url: "/gallery/c883a5ae8da86f1f68b2009c6122e527.jpg", caption: "Some of us actually use the cable." },
        { url: "/gallery/bb370af66be77e8c4a10a835bff0a153.jpg", caption: "Try to keep up. I won't slow down." },
      ],
      categoryId: comic.id,
      tags: ["melissa", "batgirl", "dc", "batman", "gotham", "superhero", "cosplay", "red hair", "rooftop", "carousel"],
      publishedAt: new Date("2026-06-05T15:30:00Z"),
    })}),
    prisma.image.create({ data: await post({
      title: "Melissa — Catwoman",
      description: "The Bat-rogues are nearly complete. Melissa pulls on the stitched PVC, the eared cowl, the red lipstick and a whip. Pure Michelle Pfeiffer era — purring, sardonic, doesn't care about your laws. Four chapters: studio reveal, the whip in hand, a sprint across the Gotham rooftops, and finally peeling open a window to take what she wants.",
      media: [
        { url: "/gallery/011ec0d1fd6022056b4848db69fed9c7.jpg", caption: "Just me. Just the suit. Try not to drool." },
        { url: "/gallery/dc1d34c3bd46e39f7473481ddd84a574.jpg", caption: "Eight more lives where this came from." },
        { url: "/gallery/f477e3468ca080aa989107c19f57d374.jpg", caption: "Diamonds don't steal themselves." },
        { url: "/gallery/2da191cb843266cfe5e28e29bf337a8f.jpg", caption: "Locked? Cute." },
      ],
      categoryId: comic.id,
      tags: ["melissa", "catwoman", "dc", "batman", "gotham", "villain", "cosplay", "latex", "whip", "carousel"],
      publishedAt: new Date("2026-06-05T16:00:00Z"),
    })}),
    prisma.image.create({ data: await post({
      title: "Abby — Wonder Woman",
      description: "Meet Abby, our Princess of Themyscira. Five chapters in DC: a dramatic walk-in with the lasso, Diana Prince at the museum, a bracelets-crossed defensive stance, deflecting a bullet from a bank robbery on the steps, then flying triumphant over the US Capitol. Noble, warm, completely lethal. The Amazons brought their best.",
      media: [
        { url: "/gallery/ff73443fe1733f7cdf204fa3ebf4b74c.jpg", caption: "Diana of Themyscira. Reporting for duty.", objectPosition: "center top" },
        { url: "/gallery/1abc431b65323371e8cc41b2eb83b073.jpg", caption: "I work at the museum during the day. The other job is... extracurricular." },
        { url: "/gallery/fb22a579198269d8aab5ac9228a43066.jpg", caption: "Try the bracelets. I dare you." },
        { url: "/gallery/386334bde4513983243ced553d27916a.jpg", caption: "Sweetheart, I caught one of these in my teeth in 1918." },
        { url: "/gallery/949c50fd8a2d8b1aabeb2935ebdde4bc.jpg", caption: "DC sleeps soundly. You're welcome." },
      ],
      categoryId: comic.id,
      tags: ["abby", "wonder woman", "dc", "justice league", "themyscira", "lasso", "tiara", "washington dc", "capitol", "carousel"],
      publishedAt: new Date("2026-06-06T15:30:00Z"),
    })}),
    prisma.image.create({ data: await post({
      title: "Abby — Poolside",
      description: "Out of the costume, into the sun. Abby spends an afternoon at a Mediterranean villa — black string bikini, wet hair, an infinity pool and not a single thing to do. Five frames: easing into the hot tub, a gliding underwater pass, drying off on warm tile, stretched out on the lounger, and one last look back before she goes inside. Warm, unhurried, completely at ease.",
      media: [
        { url: "/gallery/df59155141a42d0d4a6f811fccac8bca.jpg", caption: "The water's perfect. You coming in or just watching?" },
        { url: "/gallery/28ce94c7f3e791fff7aa709d8f764de9.jpg", caption: "One length, no breath. Try to keep up." },
        { url: "/gallery/94d6ca5c0883236f25701a21210afedc.jpg", caption: "Warm tile, warmer sun. This is the whole plan." },
        { url: "/gallery/1e7bb1adc1bcb9b78106c96cb7b42c25.jpg", caption: "Best seat in the house. All afternoon." },
        { url: "/gallery/3c7b19c4cf3ec30d7b0f429fae5b30c5.jpg", caption: "Heading in. You can come too. Or not." },
      ],
      categoryId: glamour.id,
      tags: ["abby", "pool", "villa", "bikini", "swimwear", "mediterranean", "summer", "carousel"],
      publishedAt: new Date("2026-06-07T07:15:00Z"),
    })}),
    prisma.image.create({ data: await post({
      title: "Amy — Sock Hop",
      description: "Amy trades the leather jacket for a cream knit and a skirt that won't sit still. A '50s diner all to herself — a black convertible out front, a burger and a strawberry shake, and a jukebox that only plays the good ones. Sweeter than her usual, but don't be fooled — she still leaves before the bill comes.",
      media: [
        { url: "/gallery/1c3c85f03f8020404e1f8d17dd8087b6.jpg", caption: "Borrowed the car. Don't ask whose." },
        { url: "/gallery/ec20220bc27cf4a4666470a07516197e.jpg", caption: "Burger, fries, shake. I earned all three." },
        { url: "/gallery/6fe82732fbe21d00f593eaeb38136776.jpg", caption: "Put a nickel in. Let's see if you've got taste." },
        { url: "/gallery/af4fbacf25754fdfa44e07df8b388d23.jpg", caption: "This one's my song. Try to keep up." },
      ],
      categoryId: editorial.id,
      tags: ["amy", "diner", "50s", "retro", "sock hop", "jukebox", "americana", "convertible", "carousel"],
      publishedAt: new Date("2026-06-07T09:00:00Z"),
    })}),
    prisma.image.create({ data: await post({
      title: "Abby — Deep End",
      description: "Abby, the open water, and nothing else. An eight-frame underwater study — surfacing in the blue, descending into the light, gliding over the reef and rising again. Weightless, unhurried, completely unguarded. The most stripped-back she's ever been, in every sense. Artistic nude.",
      media: [
        { url: "/gallery/b2d6538bb9fbd1948c3755aee805b823.jpg", caption: "Just me and the deep blue. Come find out how cold it is." },
        { url: "/gallery/232e8fd111e85dab697c6102be38883c.jpg", caption: "Surfacing. Don't look away now." },
        { url: "/gallery/887c46db6fd3e00254764ef3f36ca620.jpg", caption: "The water keeps my secrets. You won't." },
        { url: "/gallery/fe9d68dd76dc8df73135234c3943568e.jpg", caption: "Eyes open down here. I want to see you seeing me." },
        { url: "/gallery/8f1ee338c55de9772729e7e0a5ef404c.jpg", caption: "Weightless. Quiet. Nothing left to hide." },
        { url: "/gallery/748173b6599cbcbfa2737e58a7a14068.jpg", caption: "Drifting past. Reach out if you dare." },
        { url: "/gallery/2f3355bebd6575ae3161528373aca3a5.jpg", caption: "Over the reef, slow as I like." },
        { url: "/gallery/6a07a7a89ae9a81a56978930bca0f192.jpg", caption: "One last look before I go under for good." },
      ],
      categoryId: glamour.id,
      tags: ["abby", "underwater", "nude", "ocean", "artistic", "fine art", "water", "carousel"],
      publishedAt: new Date("2026-06-07T13:00:00Z"),
    })}),
    prisma.image.create({ data: await post({
      title: "Brandy — Hay Bales",
      description: "Cowboy hat, plaid shirt, cut-off shorts and tan boots — Brandy alone in a sunlit barn. Twelve frames that start buttoned up and end with nothing but the hat and the boots. Quiet confidence, dust and hay and warm afternoon light. Artistic nude.",
      media: [
        { url: "/gallery/36492566c35fb551d1a1d9e58da79d09.jpg", caption: "Hat on, boots on. Let's see what the afternoon brings.", objectPosition: "center top" },
        { url: "/gallery/22068df16bc8e3aa9237a461be3ad5df.jpg", caption: "It's warm in here. This shirt isn't staying tied for long." },
        { url: "/gallery/d3dc48bbf0d25db7cd32c1563f08c919.jpg", caption: "Shirt's gone. The view's better from back here anyway." },
        { url: "/gallery/f970fbf20ba7de534430fbd904663cc1.jpg", caption: "One look back. That's all you're getting for now." },
        { url: "/gallery/ec2269c25e5ee854fea5ab2cfcad46a5.jpg", caption: "Shorts next. Don't rush me." },
        { url: "/gallery/627058a79665e60525c415ddb3c28dbf.jpg", caption: "Sun on my skin, hay under my boots. This'll do." },
        { url: "/gallery/77c214c01f0aa8db9a0bd47c0c1632f9.jpg", caption: "Just the hat and the boots now. Country rules." },
        { url: "/gallery/3ac3f1a8b5d890b516c2347d26dba134.jpg", caption: "Nothing left to take off. Your move." },
        { url: "/gallery/cdbaef3e73eb4836dd48f6b5a576b8a4.jpg", caption: "Hat where it counts. Come sit down." },
        { url: "/gallery/cbe2669e81d97910170c9558ce96f178.jpg", caption: "Boots up, hay everywhere. I'm not in any hurry." },
        { url: "/gallery/2e4c9ef6c5ebea6eaaea8559de4a4f79.jpg", caption: "Caught me smiling. Don't make a thing of it." },
        { url: "/gallery/909fa2395d2a19c289111d8e199b0e63.jpg", caption: "Laid out on the bales. Stay a while, cowboy." },
      ],
      categoryId: glamour.id,
      tags: ["brandy", "cowgirl", "country", "barn", "nude", "western", "hat", "boots", "artistic", "carousel"],
      publishedAt: new Date("2026-06-07T15:30:00Z"),
    })}),
    prisma.image.create({ data: await post({
      title: "Amy — Red Earth",
      description: "Amy, the open desert, and nothing else for miles. Five frames among the red rock and Monument Valley buttes — sitting in the warm sand, walking the canyon floor, stretched out on sun-baked stone as the light turns gold. Stripped of the leather and the attitude, just her and the landscape. Artistic nude.",
      media: [
        { url: "/gallery/e966bc1cdd7b8db850689159d1e8116b.jpg", caption: "Out here there's no one to answer to. I like it that way." },
        { url: "/gallery/885922ab12b65ca3afe1308dff536703.jpg", caption: "Keep up or don't. The canyon doesn't wait." },
        { url: "/gallery/5fec30eef47d918bd07467ef90764e78.jpg", caption: "Warm stone, big sky, miles of nothing. Perfect." },
        { url: "/gallery/fa0d71bdc3919ee9bada03aeee905615.jpg", caption: "The buttes have stood here forever. I'm just passing through." },
        { url: "/gallery/d08de27a521abbbcc54bba0211a13640.jpg", caption: "Golden hour. Eyes closed. Don't wake me." },
      ],
      categoryId: glamour.id,
      tags: ["amy", "desert", "monument valley", "nude", "red rock", "nature", "golden hour", "artistic", "carousel"],
      publishedAt: new Date("2026-06-07T17:30:00Z"),
    })}),
    prisma.image.create({ data: await post({
      title: "Monica — 88 MPH",
      description: "Monica behind the wheel of a stainless DeLorean, gullwing doors up, time circuits glowing in a rain-slicked parking lot at midnight. Denim, sneakers, aviators and that grin that says she knows exactly what this car does. Where she's going, she might not need roads.",
      media: [
        { url: "/gallery/010776bffdce649956ea8a884ea5f1b2.jpg", caption: "Ready when you are. The future's not going to visit itself.", objectPosition: "center top" },
        { url: "/gallery/42dfe3b9bf43ac6f73d90a20108124f6.jpg", caption: "Hop in. Where we're going is going to be fun." },
        { url: "/gallery/fbac88c0d18a1b0526267ed81c4ab8d6.jpg", caption: "Doors up, circuits hot. You coming or not?" },
        { url: "/gallery/b25e2acad2a89e463e05bf1c49d7dc5f.jpg", caption: "Just need to hit 88. Hold onto something." },
      ],
      categoryId: movie.id,
      tags: ["monica", "delorean", "back to the future", "car", "night", "80s", "movie", "carousel"],
      publishedAt: new Date("2026-06-07T22:00:00Z"),
    })}),
    prisma.image.create({ data: await post({
      title: "Monica — Knight Rider",
      description: "Monica and a jet-black Trans Am with a mind of its own. Red shirt, leather jacket, a comlink watch on her wrist and that scanner sweeping red across the night. One driver, one talking car, and a whole lot of empty road. KITT could do the steering — but she'd rather do it herself.",
      media: [
        { url: "/gallery/f684b738335cc31d00c91bb57c4f8dcc.jpg", caption: "Watch on, jacket on. KITT, fire her up.", objectPosition: "center top" },
        { url: "/gallery/3a53a299b1c8b6a467e2b2936d1977c5.jpg", caption: "Doors up. She purrs when she's ready to run." },
        { url: "/gallery/d8a41ee1b16529da8038b6b9b059a55f.jpg", caption: "Climb in. The night shift's the best shift." },
        { url: "/gallery/829c80632eeaf0a3d5cd7792b4f0a036.jpg", caption: "Hands on the wheel. Eyes on the road. Mostly." },
        { url: "/gallery/f6772f5f84952f0c8b7389f19cedfb62.jpg", caption: "Last light, open door, full tank. Let's drive." },
      ],
      categoryId: movie.id,
      tags: ["monica", "knight rider", "trans am", "kitt", "car", "night", "80s", "tv", "carousel"],
      publishedAt: new Date("2026-06-08T04:30:00Z"),
    })}),
    prisma.image.create({ data: await post({
      title: "Melissa — Set Adrift",
      description: "Out where the water turns to glass and the coastline is just a memory, Melissa starts the day zipped into a slick yellow wetsuit, sunbathing on the bow. But the open ocean is an invitation. She slips in, swims out — and then, with no one for miles, peels the suit away and lets it go. What follows is pure release: weightless, bare, exhilarated, gliding over the reef without a single thing holding her back. By the time she breaks the surface again she's grinning ear to ear, lighter and freer than when she went under.",
      media: [
        { url: "/gallery/5f993feb03883b29b219f5a7ac4d3f58.jpg", caption: "Flat calm, open horizon, sun on her skin. Nowhere to be.", objectPosition: "center" },
        { url: "/gallery/2064dcd5e90f4fc01f1da2e917c1a456.jpg", caption: "The water's warmer than it looks. Just one more minute up here." },
        { url: "/gallery/841edec70e9d352ad781a71d11040165.jpg", caption: "Floating, drifting, letting the swell rock her." },
        { url: "/gallery/97fa5ca72d2ac388102f63db21c680e9.jpg", caption: "Zip eased down, head tipped back. The day's hers." },
        { url: "/gallery/743603486cf00adf6ed4fe34c414f1cc.jpg", caption: "Down she goes — long glide along the reef, eyes shut, smiling." },
        { url: "/gallery/ed9f7a2cde2522c2e58feef011a5ba60.jpg", caption: "Suit gone, nothing left to hold her. Diving deeper just because she can." },
        { url: "/gallery/3cf2c5cdfdb84f4886288284470b821c.jpg", caption: "Weightless and bare in the blue — no rush, no shore, no one." },
        { url: "/gallery/a1eead389765d0982e22999a5ba7043e.jpg", caption: "Wide open and grinning. This is what free feels like." },
        { url: "/gallery/db7a51dabc2ae1d06f1ec3d0ad871c8c.jpg", caption: "Up into the light, breathless and beaming. Lighter than when she went under." },
      ],
      categoryId: swimwear.id,
      tags: ["melissa", "ocean", "boat", "wetsuit", "underwater", "swimming", "nude", "freedom", "carousel"],
      publishedAt: new Date("2026-06-08T09:00:00Z"),
    })}),
    prisma.image.create({ data: await post({
      title: "Melissa — Red Sky Country",
      description: "Monument Valley at golden hour, a black mare, and Melissa riding in with the sun going down behind the buttes. Plaid shirt, worn jeans, tooled boots and a hat pulled low — pure frontier romance. As the fire crackles and the sky burns from amber to deep red, the layers come off, and the last light finds her bare and unhurried out where there's nothing but red rock, cactus and open sky for miles.",
      media: [
        { url: "/gallery/e79cb1065939225768f0d7dbd461f53b.jpg", caption: "Riding in on the last of the light, dust kicking up behind.", objectPosition: "center 30%" },
        { url: "/gallery/1de2e040b7945539dc0b4a3d1a83c2e6.jpg", caption: "Full gallop across the red rock, hair streaming." },
        { url: "/gallery/b08387f86052dad47077662dfffe3174.jpg", caption: "Hat off, boots crossed, fire going. Settling in for the evening." },
        { url: "/gallery/c882f9e45caa0dc85169d08ca7c184f2.jpg", caption: "Shirt loosened by the campfire glow, in no hurry at all." },
        { url: "/gallery/6eb0562f87e31b6438a15134a5b1d8b9.jpg", caption: "Just her hat and boots now, hand resting on the mare." },
        { url: "/gallery/5151811a4e681425e4448efe4abaf38d.jpg", caption: "Bare and free at last light, riding into the red sky." },
      ],
      categoryId: editorial.id,
      tags: ["melissa", "cowgirl", "western", "horse", "desert", "sunset", "monument valley", "nude", "carousel"],
      publishedAt: new Date("2026-06-08T10:00:00Z"),
    })}),
    prisma.image.create({ data: await post({
      title: "Glamour Show",
      description: "One night, one studio, six couture gowns — the whole roster in black-tie finery. Monica, Melissa, Brandy, Amy, Hallee and Abby, each in a colour that's entirely her own. No characters, no cosplay tonight — just the women, the silk and the kind of confidence that doesn't need an occasion.",
      media: [
        { url: "/gallery/a3d978febcd5b900a65a619addca5a3a.jpg", caption: "Brandy in buttercup silk — quiet luxury, nothing left to prove.", objectPosition: "center top" },
        { url: "/gallery/86e895c8a1e88f12840eb2fcc778bb48.jpg", caption: "Melissa glows in emerald, that megawatt smile doing half the work." },
        { url: "/gallery/2d6d7a58ab777cdb308cf275525cbb5e.jpg", caption: "Monica owns the black plunge gown the way she owns every room." },
        { url: "/gallery/fdc102e225f7b626c73032ee1f5687f0.jpg", caption: "Hallee in ivory, regal in profile — sovereign as ever." },
        { url: "/gallery/dadbc72ff8f8ee1e57a6f0df44d05a88.jpg", caption: "Amy cleans up in midnight navy, still looking like she's plotting something." },
        { url: "/gallery/76a34b64916dd81254cdfdefd956dab2.jpg", caption: "Abby in deep amethyst — warmth and steel in equal measure." },
      ],
      categoryId: glamour.id,
      tags: ["monica", "melissa", "brandy", "amy", "hallee", "abby", "gown", "gala", "black tie", "couture", "glamour", "carousel"],
      publishedAt: new Date("2026-06-08T12:00:00Z"),
    })}),
    prisma.image.create({ data: await post({
      title: "Abby — The Phoenix",
      description: "Abby trades the lasso for fire — red hair, the green-and-gold star suit, and eyes lit up like furnaces. It starts as a studio portrait, all poise and restraint, then the wings ignite: first a low pass over the river and the city lights, then up and out past the atmosphere, a full cosmic firebird wrapped around the curve of the Earth. Then the suit goes red and black, the restraint burns away, and the Dark Phoenix takes over — screaming, unbound, the whole planet small beneath her.",
      media: [
        { url: "/gallery/caf2877fcbecb4258ac5734747b5a17c.jpg", caption: "Suit on, hair like flame — before she lets the fire show.", objectPosition: "center top" },
        { url: "/gallery/9188221db87a95ca49edae84379ec637.jpg", caption: "Wings lit, a low pass over the bridge and the city lights." },
        { url: "/gallery/7184ef57179ffa8a45dd2e2cb4be5d19.jpg", caption: "Up past the atmosphere now — a firebird wrapped around the Earth." },
        { url: "/gallery/5fbd4afbcb43ede9c32413a9fddf57d2.jpg", caption: "The suit turns red and black. Something colder behind the eyes now.", objectPosition: "center top" },
        { url: "/gallery/8bcbfad605c5ef2a77a64c7355fc1966.jpg", caption: "Restraint gone — the Dark Phoenix screams herself awake in orbit." },
        { url: "/gallery/11f59c5eee607d202aa8b733f9d1e37b.jpg", caption: "Wings wide, fully unbound, the whole planet small beneath her." },
      ],
      categoryId: comic.id,
      tags: ["abby", "phoenix", "dark phoenix", "cosplay", "superhero", "fire", "flight", "space", "cosmic", "carousel"],
      publishedAt: new Date("2026-06-08T17:00:00Z"),
    })}),
    prisma.image.create({ data: await post({
      title: "Melissa — The Bandit",
      description: "Gender-swapped Bandit: Melissa in a red western shirt, jeans, boots and a cowboy hat, with a black-and-gold Trans Am — gold firebird on the hood, T-tops off, eastbound and grinning. It starts at a sun-bleached gas station with the car, then moves to the studio, where the shirt comes loose and the Smokey-outrunning swagger turns up the heat. 10-4, good buddy.",
      media: [
        { url: "/gallery/cdc86825e8b1991b97a64755d3e3e910.jpg", caption: "Sun going down, tank full, bird on the hood. Eastbound and ready." },
        { url: "/gallery/9a2aaa428ba8bf3f92736059014e1863.jpg", caption: "Breaker breaker — anybody seen a Smokey on this stretch?" },
        { url: "/gallery/f8a7857ef9087b3800e5d440d7d8333b.jpg", caption: "Perched on the hood, keeping one eye on the road." },
        { url: "/gallery/d15fcf7221a365535b01b173e2ed271e.jpg", caption: "T-tops off, behind the wheel. Keep your foot down." },
        { url: "/gallery/b16dcef34387545910e66d9cef2f05dc.jpg", caption: "Hat low, shirt sharp — the Bandit cleans up.", objectPosition: "center top" },
        { url: "/gallery/2d564b914722e77107f192f0cbaa42fc.jpg", caption: "Top button's overrated when you're this far ahead of the law.", objectPosition: "center top" },
        { url: "/gallery/e9e99d7dfdbca6b3d6ebb79d17db7a66.jpg", caption: "Shirt loose, swagger intact. Catch me if you can, Smokey." },
      ],
      categoryId: movie.id,
      tags: ["melissa", "bandit", "smokey and the bandit", "trans am", "cowgirl", "car", "70s", "movie", "carousel"],
      publishedAt: new Date("2026-06-08T19:00:00Z"),
    })}),
    prisma.image.create({ data: await post({
      title: "Monica — Solid Gold",
      description: "A homage to the most famous gold girl in cinema — Monica painted head to toe in gold, hair straightened and gilded to match, laid out on white linen. Shot from every angle so the light plays differently across the gold each time: standing, reclining, languid. All the glamour of that iconic frame, none of the menace — alive, gleaming and entirely in command. The Midas touch, if Midas had taste.",
      media: [
        { url: "/gallery/fff136aba8411045d3eeca2c2c08707a.jpg", caption: "Gold from head to toe, eyes open, completely at ease. Worth every carat." },
        { url: "/gallery/1ce29e0483c41c7751c4510c707ed7cb.jpg", caption: "Solid gold, standing for inspection. Look all you like." },
        { url: "/gallery/d37cd97e97b2fb73ebb892354be9b258.jpg", caption: "A glance over a gilded shoulder. The light loves her from behind." },
        { url: "/gallery/a5b079b99fa54dfeb24badec21a7df98.jpg", caption: "Laid out on white linen, gold catching the morning light." },
        { url: "/gallery/be1aa82bee22597219bf4b27d7c9768a.jpg", caption: "Head tipped back, gilded and glowing. Pure Midas glamour." },
        { url: "/gallery/76e7f46e3897a22f79472b7544419daa.jpg", caption: "On her side, the gold pooling along every curve." },
        { url: "/gallery/e4419c0a47aabd48493ccb8052a60b63.jpg", caption: "Languid and luminous, the sheen following the light." },
        { url: "/gallery/c11d8a61e836c4b2226331684652cdd0.jpg", caption: "Curled into the linen, soft and golden." },
        { url: "/gallery/86f9ec276970edd427d510790701c447.jpg", caption: "Still as a statue, warm as anything but." },
        { url: "/gallery/c6c45f851100fca1007f94953293c17d.jpg", caption: "Stretched out in gold, not a care in the world." },
        { url: "/gallery/eaaecf9f38795d676257367bd274a812.jpg", caption: "Gold on her skin, gold on the sheets. The whole frame gilded." },
      ],
      categoryId: glamour.id,
      tags: ["monica", "gold", "body paint", "goldfinger", "bond", "nude", "fine art", "glamour", "artistic", "carousel"],
      publishedAt: new Date("2026-06-09T07:00:00Z"),
    })}),
    prisma.image.create({ data: await post({
      title: "Monica & Abby — Midnight Soak",
      description: "A hidden grotto, a steaming hot spring carved into the rock, cocktails on the ledge and the night sky beyond. Monica and Abby slip in for a private soak — white bikinis at first, then not, the steam and the warm light doing the rest. Close, unhurried and entirely at ease in each other's company.",
      media: [
        { url: "/gallery/2e8741c502b2743dcd2bba53e008ddec.jpg", caption: "Found the grotto, poured the drinks. Just us and the steam.", objectPosition: "center top" },
        { url: "/gallery/4b77849dbb1b422c60e0aad7b609d5ae.jpg", caption: "Closer now — a whisper against the neck, warm water rising." },
        { url: "/gallery/4c0dec58945f395ae9bdcddd24390db4.jpg", caption: "Head tipped back, lost in the heat and the moment." },
        { url: "/gallery/e3c126078fa4b0446f589ed8f8d94ea7.jpg", caption: "Nose to nose, smiling — the night's theirs and no one else's." },
        { url: "/gallery/6f1682eddc97f8204add0a6a4b1e8938.jpg", caption: "A slow kiss under the rock, steam curling around them." },
      ],
      categoryId: glamour.id,
      tags: ["monica", "abby", "duo", "hot spring", "grotto", "night", "intimate", "nude", "glamour", "carousel"],
      publishedAt: new Date("2026-06-09T08:30:00Z"),
    })}),
    prisma.image.create({ data: await post({
      title: "Melissa — Spider-Woman",
      description: "Melissa suits up as Spider-Woman — the Julia Carpenter look, black with the bold white spider, white gloves and the masked white-eyed stare. It opens in the studio, suit and stance, then she takes it to the rooftops: scaling glass towers, leaping the gaps and falling free between the skyscrapers with the whole city lit up below. Agile, fearless and right at home a thousand feet up.",
      media: [
        { url: "/gallery/229bedece42d9156154071deb3546cd1.jpg", caption: "Suit on, mask off — one last look before the city needs her.", objectPosition: "center top" },
        { url: "/gallery/c88e953f70e33f1eb1793718cb9febf7.jpg", caption: "White eyes down, spider front and centre. Ready to work.", objectPosition: "center top" },
        { url: "/gallery/74d65d09f2a7c4fad3b445f344f1361d.jpg", caption: "Gloves on, hair flying — coiled and ready to move.", objectPosition: "center top" },
        { url: "/gallery/7f6b9eb663101c297a6e61d2d76ad0c8.jpg", caption: "Low and loaded, a half-grin under the mask." },
        { url: "/gallery/952dbe0951217a2c7df4f71c5499a403.jpg", caption: "Stuck to the glass, web spun, the skyline behind her." },
        { url: "/gallery/c7b405ce1802f6414ddd3a21848f2a89.jpg", caption: "Mid-leap across the gap, a thousand feet of nothing below." },
        { url: "/gallery/5b954198d8f2544d52fe0a288c7bce55.jpg", caption: "Falling free between the towers — exactly where she wants to be." },
      ],
      categoryId: comic.id,
      tags: ["melissa", "spider-woman", "julia carpenter", "marvel", "superhero", "cosplay", "spider", "new york", "web", "carousel"],
      publishedAt: new Date("2026-06-09T10:00:00Z"),
    })}),
    prisma.image.create({ data: await post({
      title: "Melissa — Captain Marvel",
      description: "Melissa goes cosmic as Captain Marvel — the red, blue and gold suit, the star across her chest and photon energy trailing off her fists. It starts grounded in the studio, then she lifts off past the Statue of Liberty and out beyond the atmosphere, blazing through the stars with the Earth turning far below. Higher, further, faster — and entirely in her element among the galaxies.",
      media: [
        { url: "/gallery/ac6e7d5372928edde94fbf9d16ebd52f.jpg", caption: "Suited up, star on her chest, ready to leave the ground behind.", objectPosition: "center top" },
        { url: "/gallery/f4dfd020dc808613a6420c5e50551764.jpg", caption: "Lift-off past Lady Liberty — photon trail in her wake." },
        { url: "/gallery/d801e4f3858039a9b074d5c4bd907371.jpg", caption: "Out beyond the atmosphere, the whole planet turning below." },
        { url: "/gallery/dc8d370c10139f402b66fd45052ba80e.jpg", caption: "Fist first, photon blazing — nothing's catching her now." },
        { url: "/gallery/20c5e895c4d556aaf980adf5ff6a8585.jpg", caption: "Higher, further, faster. The galaxy's her playground." },
      ],
      categoryId: comic.id,
      tags: ["melissa", "captain marvel", "carol danvers", "marvel", "superhero", "cosplay", "space", "flight", "photon", "carousel"],
      publishedAt: new Date("2026-06-09T11:00:00Z"),
    })}),
    prisma.image.create({ data: await post({
      title: "Melissa — Candlelight",
      description: "Melissa trades the cape for candlelight — black satin lingerie, lace-top stockings and a silk robe in a room lit only by a wall of flickering candles. That sunshine smile keeps it warm rather than brooding as the robe slips, the lingerie comes off piece by piece, and she settles back into the cream silk sheets. Intimate, glowing and entirely at ease.",
      media: [
        { url: "/gallery/b6dc08531460e29f252f2338657084bb.jpg", caption: "Robe open, candles lit, that smile doing all the talking.", objectPosition: "center top" },
        { url: "/gallery/5fde23f177cf2746206013ac6984e14b.jpg", caption: "Satin and lace in the candle glow — in no hurry at all." },
        { url: "/gallery/61b213672a81c2e76c9f802e8acfead1.jpg", caption: "Robe gone, head tipped back, lost in the warmth." },
        { url: "/gallery/42464bd2e9e7b7d792938b456d116ed1.jpg", caption: "A glance over the shoulder, garter and stockings catching the light." },
        { url: "/gallery/874bbc9597d7fa5e54fe2eaf0523b873.jpg", caption: "Easing a stocking down, one slow piece at a time." },
        { url: "/gallery/ac93e89e82764a655135f38914d3eb46.jpg", caption: "Down to almost nothing, still smiling in the glow." },
        { url: "/gallery/ad1ac9f8d4af06fc581e81235bbb934c.jpg", caption: "Cross-legged on the silk, soft and golden in the candlelight." },
        { url: "/gallery/79195d30754e8dfd395e6ba7e13fd942.jpg", caption: "Hands in her hair, warm and unhurried." },
        { url: "/gallery/7e4e9a9f2a668ccc5b4e901c2b7b35dc.jpg", caption: "Stretched out on the sheets, a look back over the shoulder." },
        { url: "/gallery/4a3f637d959795cd4cd6c1f316a23fda.jpg", caption: "Settled into the silk as the candles burn low." },
      ],
      categoryId: glamour.id,
      tags: ["melissa", "lingerie", "boudoir", "candlelight", "satin", "stockings", "nude", "glamour", "carousel"],
      publishedAt: new Date("2026-06-09T12:00:00Z"),
    })}),
    prisma.image.create({ data: await post({
      title: "Amy & Brandy — Untamed",
      description: "Deep in the rainforest, explorer Amy in her khakis runs into something the maps don't show — Brandy gone wild, a feral creature of the jungle, all tangled hair and bared teeth. The standoff turns to a tussle, the tussle to something else entirely. By the end the khakis are gone and the only law out here is the jungle's. Predator and prey, until neither's quite sure which is which.",
      media: [
        { url: "/gallery/b5d4389ae4a5ac5f493fabe329d082b6.jpg", caption: "Two strangers, one clearing. Nobody's backing down." },
        { url: "/gallery/07d55b724d85106523466f12bd0185b0.jpg", caption: "She moves first — Amy goes down into the leaf litter." },
        { url: "/gallery/f60ee46160a93c6fc56e2af439a70702.jpg", caption: "Pounced on, pinned, teeth bared. The wild one has her." },
        { url: "/gallery/f91a62b4aa1de5fa355287c45cdec3f5.jpg", caption: "Khakis torn open — and the snarl starts to soften." },
        { url: "/gallery/4325b72108b9934064f6eb305e4017ea.jpg", caption: "Predator and prey, leaning into a first slow kiss." },
        { url: "/gallery/dc47e4a306ad4b0a2bb212a5586bba10.jpg", caption: "Out here there's no one watching and no rules but the jungle's." },
      ],
      categoryId: editorial.id,
      tags: ["amy", "brandy", "duo", "jungle", "explorer", "wild", "feral", "intimate", "nude", "editorial", "carousel"],
      publishedAt: new Date("2026-06-09T15:00:00Z"),
    })}),
    prisma.image.create({ data: await post({
      title: "Melissa & Amy — Black Satin",
      description: "Two blondes, one bed dressed in black silk. It starts buttoned-up — matching white maillots, studio-bright and all smiles — then the lights drop and the satin takes over. Melissa and Amy lose the suits and fold into each other, slow and unhurried, a study in skin against shadow. Tasteful artistic nude — soft, intimate, never in a rush. They drift off tangled together as the last frame fades to black.",
      media: [
        { url: "/gallery/c7f838277707ef4832af6c6c7179e1c3.jpg", caption: "Matching white maillots, studio lights, two killer smiles — the calm before.", objectPosition: "center top" },
        { url: "/gallery/d1e37dd2bb310b7f6ae3a54c626fecf6.jpg", caption: "Suits gone, down on the studio floor — a kiss to the temple." },
        { url: "/gallery/a671b909e0c8b1dc904d6a546dda47d2.jpg", caption: "Onto the black satin, stretched out and close." },
        { url: "/gallery/b1af2cc35aa8d433e14d5a986dad7ef3.jpg", caption: "Wrapped into one another, all soft light and shadow." },
        { url: "/gallery/0d89010891c1e9783d26a632aeb90dc4.jpg", caption: "A fall of silk, a slow kiss, nowhere to be." },
        { url: "/gallery/c98028f567c093d15f067062fa466d4c.jpg", caption: "Skin against skin against satin — quiet and unhurried." },
        { url: "/gallery/13ae76ba8cf8c1306f20e891ff946084.jpg", caption: "Drifted off side by side, the sheets pulled up. Fade to black." },
      ],
      categoryId: glamour.id,
      tags: ["melissa", "amy", "duo", "boudoir", "black satin", "intimate", "blonde", "nude", "glamour", "carousel"],
      publishedAt: new Date("2026-06-13T19:30:00Z"),
    })}),
    prisma.image.create({ data: await post({
      title: "Brandy — Disco Inferno",
      description: "1977, and Brandy owns the floor — towering afro, cream halter jumpsuit, platform heels and a mirror ball throwing light across a packed dancefloor. She works the podium until the crowd can't look away, peels the jumpsuit down to a slip of a bikini, then slinks off to the velvet VIP booth where the night gets a whole lot more private. Pure Saturday-night fever.",
      media: [
        { url: "/gallery/16fbdbc674f8d90a4d5c9eaec41c54bc.jpg", caption: "Centre of the floor, mirror ball spinning. The night belongs to her.", objectPosition: "center top" },
        { url: "/gallery/ea0592da92e56186fa8a412a47462e91.jpg", caption: "Cream jumpsuit, platforms, attitude. Studio-54 ready.", objectPosition: "center top" },
        { url: "/gallery/5822e459efdefcb4da97ef6451dfcde5.jpg", caption: "Deep-V and bell-bottoms, moving with the beat." },
        { url: "/gallery/073477336e2ee54ae0a1124b3a3d014c.jpg", caption: "Lost in the groove, the whole room watching." },
        { url: "/gallery/c77c7242fed66510e38993cf970aa8cf.jpg", caption: "Backless and fearless, owning the podium." },
        { url: "/gallery/dce1a0d0f6909fc12a77b10db251c6ef.jpg", caption: "A cocktail at the bar before the next number." },
        { url: "/gallery/5aa2d116e5356173ae4e50d48ce5b621.jpg", caption: "Jumpsuit down to a bikini — the temperature jumps with it." },
        { url: "/gallery/b75b219ff5b83393d9373f3d74c71001.jpg", caption: "Up on the podium in next to nothing, still dancing." },
        { url: "/gallery/1f5a74fe4700b3bba5d6963293075947.jpg", caption: "Spotlight, platforms, that afro catching the light." },
        { url: "/gallery/8d595bd8c5d3f26852bd194219135772.jpg", caption: "A turn for the crowd, the floor roaring." },
        { url: "/gallery/569a984ba29a551ca4eb5da10dc5b6ad.jpg", caption: "Off to the velvet booth, stretched out and cooling down." },
        { url: "/gallery/64a5f53ebc80afbaac23e0de600e706f.jpg", caption: "In the VIP shadows now, a slow smile and nothing to prove." },
        { url: "/gallery/0eb86d1a36b6c9ea242bbb6a1a9802f2.jpg", caption: "Just her and the booth, the party a blur behind her." },
      ],
      categoryId: editorial.id,
      tags: ["brandy", "disco", "70s", "studio 54", "dancefloor", "afro", "jumpsuit", "nude", "editorial", "carousel"],
      publishedAt: new Date("2026-06-10T07:00:00Z"),
    })}),
    prisma.image.create({ data: await post({
      title: "Hallee & Brandy — Scarlet",
      description: "Hallee and Brandy on a fall of red silk against a black bed — a study in skin, shadow and scarlet. Long dark hair pooled on crimson pillows, the two of them wrapped up in each other, slow and close. Shot from above and from the side, all soft light and satin, intimate without ever tipping its hand.",
      media: [
        { url: "/gallery/467d3c8bb6d71c6740f635effbef0000.jpg", caption: "Crimson silk, a slow kiss, the world shut out." },
        { url: "/gallery/3b454bb4d05986cbe217f818fdb04ccd.jpg", caption: "Head to head on scarlet pillows, hair spilling like ink." },
        { url: "/gallery/6f2137f1ddce4c8da6a5d46720a066aa.jpg", caption: "Closer now, hands where they want to be." },
        { url: "/gallery/ee900b871c40b0f8ed037f0030cd4ddd.jpg", caption: "Skin against skin, soft in the low light." },
        { url: "/gallery/5966e2f1d7beee4727588a00cd580e6c.jpg", caption: "One leaning into the other, the silk sliding away." },
        { url: "/gallery/3088dcfe97dbf39e2fe576b1d1557bd3.jpg", caption: "Wrapped up together, lost in it." },
        { url: "/gallery/36849311e568fa05a9c854392dc2bcf3.jpg", caption: "Entwined on the red, no rush to be anywhere." },
      ],
      categoryId: glamour.id,
      tags: ["hallee", "brandy", "duo", "boudoir", "red satin", "intimate", "nude", "glamour", "carousel"],
      publishedAt: new Date("2026-06-10T08:00:00Z"),
    })}),
    prisma.image.create({ data: await post({
      title: "The Eyes Are the Windows of the Soul",
      description: "No costumes, no characters, no colour — just the whole roster stripped back to black and white and a single look. The six of them together first, then one close, quiet study of each: Monica, Melissa, Brandy, Amy, Hallee and Abby, every one giving away a little of who she is in nothing more than an eye.",
      media: [
        { url: "/gallery/8edb7938bdb19b0eb7d4d5a72389c2d4.jpg", caption: "All six, stripped back — grey cotton, no glamour, just the eyes." },
        { url: "/gallery/aba394816a111ad508b8db4c2c38d8bb.jpg", caption: "Monica — the knowing look that's worn every role and owned them all." },
        { url: "/gallery/298a1deea070a20416ddcbbf581c6897.jpg", caption: "Melissa — even in monochrome, there's sunshine behind it." },
        { url: "/gallery/3e30d3e0dc9171ca0d48a2236a6e00f1.jpg", caption: "Brandy — composed, unreadable, giving away nothing she doesn't choose to." },
        { url: "/gallery/837179820226e4c353dc447ba8d6704d.jpg", caption: "Amy — that glint that says she's already half out the door." },
        { url: "/gallery/a2b23c8d0d04673e4afcc64b0a6882fc.jpg", caption: "Hallee — sovereign and unhurried, drawn out of the shadow." },
        { url: "/gallery/c181b549b1e056ad054e22ff1302e380.jpg", caption: "Abby — warmth and steel in a single glance." },
      ],
      categoryId: silhouette.id,
      tags: ["monica", "melissa", "brandy", "amy", "hallee", "abby", "portrait", "black and white", "eyes", "fine art", "silhouette", "carousel"],
      publishedAt: new Date("2026-06-11T12:00:00Z"),
    })}),
    prisma.image.create({ data: await post({
      title: "Amy — Study in White",
      description: "A quiet side of Amy — no leather, no attitude, just black-and-white and bare skin on white linen. Shot from directly overhead, her hair fanned across the sheets like ink in water, the light doing all the work. A fine-art study: form, shadow and stillness, building from folded and covered to wholly open.",
      media: [
        { url: "/gallery/b64da20f35b22c1a14cefcccde61e655.jpg", caption: "Folded in on herself, hair spilling across the white." },
        { url: "/gallery/3da7764a7ac4e233fe7e0270c4bd4118.jpg", caption: "Knees drawn up, arms crossed, eyes to the lens above." },
        { url: "/gallery/4f8ba521dc7ff4d908290f66ee52c94f.jpg", caption: "All clean lines and soft shadow on the linen." },
        { url: "/gallery/00ef40fd69e7091476b8780208861eff.jpg", caption: "Close and still, the sheets glowing white around her." },
        { url: "/gallery/7f2dfadd56be7dd0ed0cb1adc862cb89.jpg", caption: "Arms loosening, the light tracing every line." },
        { url: "/gallery/cd07ea43abb708a68acc7f91184cae2b.jpg", caption: "Legs to the headboard, hair a halo beneath her." },
        { url: "/gallery/405a495a75891f53926b51609f08deed.jpg", caption: "Fully open on the white — nothing left but form and light." },
      ],
      categoryId: silhouette.id,
      tags: ["amy", "nude", "fine art", "black and white", "bedroom", "artistic", "silhouette", "carousel"],
      publishedAt: new Date("2026-06-12T07:00:00Z"),
    })}),
    prisma.image.create({ data: await post({
      title: "Melissa — Dark Side",
      description: "Our sunshine girl goes to the dark side — a jet-black bob, smudged kohl eyes, blood-dark lips and a black satin corset finished with a buckled collar and a fine silver chain. Shot under a single hard spotlight on bare studio grey, she trades the smile for a cool, level stare and proves the brightest one in the room can do brooding just as well.",
      media: [
        { url: "/gallery/79b59f13cc7664e786c8b51f236c4c86.jpg", caption: "Corset laced, collar on, that level stare. Not so sunny tonight.", objectPosition: "center top" },
        { url: "/gallery/fe821896bcd0b9e395cff589420cb26b.jpg", caption: "Chain down the spine, laces drawn tight." },
        { url: "/gallery/464ba0fee88d464c0bbb561f37d494b3.jpg", caption: "Down on all fours under the hard light, holding your eye." },
        { url: "/gallery/7df08c18bcaa6d1ba4c9707a39984458.jpg", caption: "Stretched out on the floor, cool as the concrete." },
        { url: "/gallery/182a2f694f32b1e744d2bad464c7a9bd.jpg", caption: "A glance back over the laces, chain swinging." },
        { url: "/gallery/c7ba14068d30b0fb34ca0f900b0b283c.jpg", caption: "Up on her knees, the satin starting to give." },
        { url: "/gallery/8369a24a62d2fcdb6a1b368b21d32448.jpg", caption: "Corset easing open, the spotlight doing the rest." },
        { url: "/gallery/3ec2d4824d8c93b0b47bcc4fd048888a.jpg", caption: "Reclined and unhurried, chain across bare skin." },
        { url: "/gallery/ed87fc4ccd941c496167a616ead478f6.jpg", caption: "Flat on her back, lost in the dark mood entirely." },
      ],
      categoryId: glamour.id,
      tags: ["melissa", "goth", "corset", "collar", "bob", "dark", "boudoir", "nude", "glamour", "carousel"],
      publishedAt: new Date("2026-06-12T09:00:00Z"),
    })}),
    prisma.image.create({ data: await post({
      title: "Abby — Pink Fantasy",
      description: "Abby goes full plastic-fantastic — a candy-pink wig, a pink-on-pink bedroom and a wardrobe of pink to match. Part doll, part pin-up, all grown-up: she works through the frilly pink dress and the pink swimsuits before the outfits go the way of all good fantasies, leaving just the pink wig, the pink sheets and that megawatt smile.",
      media: [
        { url: "/gallery/7c268f4010d27276b4c34288d71aff95.jpg", caption: "Pink wig, pink frills, pure doll-house glamour.", objectPosition: "center top" },
        { url: "/gallery/362eb4bb404215e286dc2eeda1cfe53a.jpg", caption: "Bubblegum-pink one-piece, that doll-perfect smile." },
        { url: "/gallery/ca67c213a07c529648176f52abcfab86.jpg", caption: "On the pink bed in the pink room — committed to the bit." },
        { url: "/gallery/92081b044552ff76c309598abdf70d44.jpg", caption: "A glance back, the top already forgotten." },
        { url: "/gallery/0fa8327a339c4d54e130ce3bbc985200.jpg", caption: "Down to pink shorts and a smile over the shoulder." },
        { url: "/gallery/4e088c2994d9cff454f7cb5f68754436.jpg", caption: "Arms crossed, grinning, in on the joke." },
        { url: "/gallery/114456d00ca5270464916644f7156568.jpg", caption: "Kneeling on the candy-pink sheets, soft and sweet." },
        { url: "/gallery/237064e50af5d1a67c2d7cc843ac6b67.jpg", caption: "Pink slipping away, the room glowing rose." },
        { url: "/gallery/370485d19de767f50a53e0d041572ca5.jpg", caption: "Stretched out on the pink, fantasy complete." },
      ],
      categoryId: glamour.id,
      tags: ["abby", "pink", "barbie", "wig", "doll", "bedroom", "nude", "glamour", "carousel"],
      publishedAt: new Date("2026-06-12T11:00:00Z"),
    })}),
    prisma.image.create({ data: await post({
      title: "Hallee — Celestia",
      description: "An original: Hallee as Celestia, a cosmic force in human form. Black bodysuit, a battered leather coat and eyes lit like blue stars. It begins grounded — a portrait, then down in a storm-lashed neon city as the power wakes up — before she rips loose of gravity entirely: up through the towers, out past the sky, and into open space, hurling blue cosmic energy across the curve of the Earth. The sovereign trades her throne for the whole cosmos.",
      media: [
        { url: "/gallery/1542e672fea604bacad87f6795f6640a.jpg", caption: "Suit on, coat thrown over, eyes already burning blue.", objectPosition: "center top" },
        { url: "/gallery/b2b026cb2d234d360e035410fff15ec4.jpg", caption: "Calm before it starts — the power humming under the skin.", objectPosition: "center top" },
        { url: "/gallery/42b235f1d32009c148e82478e7612bd3.jpg", caption: "Down on the wet neon street, eyes flaring in the rain." },
        { url: "/gallery/ff55456a3fdea7ddfa92687ec1478304.jpg", caption: "The city floods and storms around her. She barely notices." },
        { url: "/gallery/b25d4679875f2e25ebc92224bd6c8f51.jpg", caption: "Arms wide, lightning splitting the sky — it's waking up." },
        { url: "/gallery/b94f03eeacd22022f4c7a484224ce412.jpg", caption: "Off the ground now, blue fire trailing through the towers." },
        { url: "/gallery/377f4c926bf760bdc61318fc40b69e54.jpg", caption: "Past the atmosphere, energy streaming around the world below." },
        { url: "/gallery/fd5b8c2f18deeff81540660301a53359.jpg", caption: "Full cosmic force in orbit — portals blazing from her hands." },
      ],
      categoryId: fantasy.id,
      tags: ["hallee", "celestia", "superhero", "cosmic", "original", "energy", "flight", "space", "new york", "carousel"],
      publishedAt: new Date("2026-06-12T13:00:00Z"),
    })}),
    prisma.image.create({ data: await post({
      title: "Hallee — Hailing Frequencies",
      description: "A homage to the original communications officer. Hallee takes the bridge in the classic red Starfleet minidress, insignia at her shoulder, all poise and command. Seven frames: settled into the captain's chair like she's always belonged there, working the comms console with the stars streaming past, then a run of studio portraits that put the uniform front and centre. Cool, sharp and entirely in charge. Hailing frequencies open.",
      media: [
        { url: "/gallery/00a8dba51114c86049f4477697fc8f31.jpg", caption: "The captain's chair. She wears it like it was always hers." },
        { url: "/gallery/2ce89fe72c532a037961261be873a3a5.jpg", caption: "Comms console, channels open, the stars streaming past." },
        { url: "/gallery/8508709ca0aea075666a6811364cb855.jpg", caption: "Heads-down on the boards — on duty and unflappable." },
        { url: "/gallery/4946a9ff86f2ad13861d037b2e11221b.jpg", caption: "Studio portrait — red on grey, insignia at the shoulder.", objectPosition: "center top" },
        { url: "/gallery/307d3d8e4db6874a89c24a1008131e19.jpg", caption: "Hand on hip, chin level — every inch an officer.", objectPosition: "center top" },
        { url: "/gallery/b5d736173f3e9c398b56d791d80fc3df.jpg", caption: "Full length, boots and tights, ready for the away mission.", objectPosition: "center top" },
        { url: "/gallery/71bac4b15e16e2488dd34d4501c502dc.jpg", caption: "One last look back before the turbolift doors close.", objectPosition: "center top" },
      ],
      categoryId: movie.id,
      tags: ["hallee", "uhura", "star trek", "starfleet", "communications", "officer", "red", "bridge", "sci-fi", "cosplay", "carousel"],
      publishedAt: new Date("2026-06-14T04:00:00Z"),
    })}),
    prisma.image.create({ data: await post({
      title: "Hallee — English Roses",
      description: "A golden afternoon in a country rose garden, nine frames long. Hallee starts in an aubergine string bikini on the warm grass, all easy smiles among the climbing roses, then lets the heat and the privacy take over — the suit goes, the poses soften, and the last frames are nothing but sun on bare skin. Languid, sovereign and entirely at home.",
      media: [
        { url: "/gallery/297555991ffcd9e491be50303847aff1.jpg", caption: "The roses came for me. You can too." },
        { url: "/gallery/3b15e120d9ff14623708ba27c2f80a29.jpg", caption: "Sun on my skin, nowhere I'd rather be." },
        { url: "/gallery/b1dd099f9e222f5f9dad3bc55c13719d.jpg", caption: "Warm grass, warmer welcome. Come sit." },
        { url: "/gallery/9893c7e9ae17802b7626ae7ac9a467a4.jpg", caption: "You made me laugh. That's a rare privilege.", objectPosition: "center top" },
        { url: "/gallery/31f28f3102d911dffce5c0df0807fbe7.jpg", caption: "All of this, and the garden's just the setting.", objectPosition: "center top" },
        { url: "/gallery/b72c192e95f8ad50b6ff3f0ee217a104.jpg", caption: "Patience. The garden keeps its secrets too.", objectPosition: "center top" },
        { url: "/gallery/975475e1beae19b60532beb885bc11a4.jpg", caption: "Stretched out in the sun, letting the afternoon decide." },
        { url: "/gallery/70a953e7531c8f7a057628743213c3bb.jpg", caption: "No need to pretend. Not out here.", objectPosition: "center top" },
        { url: "/gallery/677499e3fac6e305c96dc08551344c72.jpg", caption: "Last look before the light goes. Don't waste it." },
      ],
      categoryId: glamour.id,
      tags: ["hallee", "garden", "roses", "summer", "golden hour", "nude", "glamour", "carousel"],
      publishedAt: new Date("2026-06-21T09:30:00Z"),
    })}),
    prisma.image.create({ data: await post({
      title: "Hallee — Just Desserts",
      description: "Hallee takes over the kitchen and becomes the dish herself — seven frames of a marble island, a sun-filled luxury kitchen and a body piped and swirled with cream from head-wrap to heel. Starts coy and front-on, then turns playful and unhurried as the afternoon melts. Sweet, knowing and completely in charge. Artistic nude.",
      media: [
        { url: "/gallery/5eeface2b55f8fc6587e0910b820cf42.jpg", caption: "Dessert's served. Hope you skipped dinner." },
        { url: "/gallery/45d3a2cde4520ae048217f3fe3964231.jpg", caption: "Hand-piped, just for you. Don't make a mess." },
        { url: "/gallery/1ceb79a13c1406ca3527b2f50027ed2d.jpg", caption: "Come closer. I won't bite — unless you're sweet." },
        { url: "/gallery/271852cca4e7c00012a2187948433652.jpg", caption: "Careful. It's still warm." },
        { url: "/gallery/4bc4b5d6e6cc9228489b908fa71ac7ea.jpg", caption: "Every angle's on the menu tonight." },
        { url: "/gallery/f0298c082b3053e0a0d50ad91a6f71fc.jpg", caption: "Clean-up's the best part. Take your time." },
        { url: "/gallery/c4aa9fa50d68a48c40b921ec147f07e7.jpg", caption: "All of it. No rush." },
      ],
      categoryId: glamour.id,
      tags: ["hallee", "kitchen", "cream", "marble", "playful", "boudoir", "nude", "glamour", "carousel"],
      publishedAt: new Date("2026-06-21T20:30:00Z"),
    })}),
    prisma.image.create({ data: await post({
      title: "Abby — Princess Leia",
      description: "Abby trades the lasso for a blaster's worth of nerve as the Princess of Alderaan. Ten frames against studio grey: the white ceremonial gown and side-buns, a blue blade drawn for a hero pose, then a run of story beats with R2-D2 — tending the little droid and slipping him the message the whole galaxy is waiting on. Regal, warm and quietly dangerous.",
      media: [
        { url: "/gallery/952215651a95670739e9e529cc67de14.jpg", caption: "A princess, a senator, and a very good shot. Don't test the last one." },
        { url: "/gallery/2c67ea845f6e2dfd8b8d68787ae31347.jpg", caption: "Diplomacy first. The blade's just in case.", objectPosition: "center top" },
        { url: "/gallery/95a67074c87bdc6b7bf9e822de84f271.jpg", caption: "You'll find I'm not on the council to be decorative.", objectPosition: "center top" },
        { url: "/gallery/18882a214533050173bc080e0d97eca9.jpg", caption: "Alderaan raised me gentle. The Empire raised the stakes.", objectPosition: "center top" },
        { url: "/gallery/cbb0f80a423e19e9e778974300064c9d.jpg", caption: "He's stubborn, he's loyal, and he keeps my secrets. We get along." },
        { url: "/gallery/2d59af233d59cb44dead95c5d9655bfd.jpg", caption: "Best co-pilot in the Rebellion. Don't tell the pilots.", objectPosition: "center top" },
        { url: "/gallery/0fa1e7acd023dcf1b208f1df36acfc83.jpg", caption: "Help me, Obi-Wan Kenobi. You're my only hope.", objectPosition: "center top" },
        { url: "/gallery/ea94c9f86efca826ebc879b54a598036.jpg", caption: "Hold still. The whole galaxy's riding on you, little guy." },
        { url: "/gallery/21abdd0f0583cb94fdb13eb231e857da.jpg", caption: "Go safely. And come back." },
        { url: "/gallery/2d8db472c840f61c4553017440739665.jpg", caption: "For Alderaan. For all of it. Light it up.", objectPosition: "center top" },
      ],
      categoryId: movie.id,
      tags: ["abby", "princess leia", "star wars", "leia", "r2-d2", "lightsaber", "white gown", "cosplay", "movie", "carousel"],
      publishedAt: new Date("2026-06-22T18:45:00Z"),
    })}),
  ]);

  // Sample comments
  const commentData = [
    { content: "The lighting on this one is incredible. That city backdrop is everything.", userId: user1.id, imageId: images[0].id },
    { content: "Monica is absolutely stunning in every shoot. The maid look is a classic.", userId: admin.id, imageId: images[1].id },
    { content: "The Bunny shoot is pure old-school glamour. Right out of a 70s Playboy feature.", userId: admin.id, imageId: images[6].id },
    { content: "The Executive is my favourite. Something about the suit and glasses combination is just perfect.", userId: user1.id, imageId: images[7].id },
    { content: "Storm Chaser is next level. The rooftop, the lightning, the whole concept is brilliant.", userId: admin.id, imageId: images[17].id },
  ];

  await Promise.all(commentData.map((c) => prisma.comment.create({ data: c })));

  console.log(`Seeded: 8 categories, ${images.length} images, 2 users, ${commentData.length} comments`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
