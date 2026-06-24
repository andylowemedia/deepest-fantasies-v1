---
name: check-new-set
description: Add newly-uploaded gallery images to the Deepest Fantasies site as a carousel set. Use when the user says "check for new set", "check for new pictures", "I just added a set", gives a list of new image filenames, or otherwise wants new gallery images turned into a seed.ts entry — identifying which model it is, the category/tags, building the carousel, reseeding, and verifying in the browser. Images now live on the CDN (not local).
---

# Check for a new set

Turns a fresh drop of CDN-hosted gallery images into a carousel entry in
`app/prisma/seed.ts`, reseeds, and verifies it in the browser. Run all commands
from the project root (`/Users/andylowe/Projects/deepestfantasies.com`).

**Images live on the CDN now, not local disk.** The gallery base is
`https://cdn.low-emedia.com/sites/deepestfantasies/content/gallery/` and a frame's
URL is that base + `<filename>.jpg`. In `seed.ts` you still write the local-style
`/gallery/<filename>.jpg` path — `toPublicUrl()` rewrites it to the CDN, and
`getDimensions()` reads the dimensions from the CDN. You do **not** need a local
copy in `app/public/gallery/`.

## 1. Find the new images

The user supplies the new set — usually as a list of filenames (and often the
model/scenario, e.g. "a new set for hallee"). There's no local drop to scan. To
view them, download the CDN copies to a temp dir:

```bash
cd /tmp && base="https://cdn.low-emedia.com/sites/deepestfantasies/content/gallery"
for f in <hash1> <hash2> <hash3>; do curl -s -o "new_$f.jpg" "$base/$f.jpg"; done
```

Use the named model/scenario if given, but still **look at every image** before
writing anything. Clean up `/tmp/new_*.jpg` when done.

## 2. Look at the images and identify the model

`Read` each downloaded `/tmp/new_<hash>.jpg`. Determine:

- **Which model** (see roster below). Confirm the count of distinct people —
  some sets are duos (e.g. "Melissa & Amy").
- **The scenario** (location, wardrobe/cosplay, mood).
- **Which frame is the least-explicit, face-forward shot** — this leads the carousel.

**Always confirm the model with the user before building the set** — even when
you're confident, and even when the user named the model in their message. Ask
with `AskUserQuestion`: state who you think it is (and the scenario), and let them
confirm or correct. The user has corrected misidentifications before, so never
treat your read of the images — or an offhand name in the prompt — as settled
until they've confirmed it. Offer the recurring models plus a "one-off / someone
else" option.

Hair/styling varies between sets (wet-slicked vs curls, ponytail vs loose) — that
alone does **not** mean a different model, so don't let a restyle talk you out of
the right person; confirm rather than guess.

**The recurring models are the core, Monica is the lead — but not every set is
one of them.** Most sets will be Monica or another recurring model, and that's
the default expectation, not a guarantee. Expect occasional one-off models — some
the user names, some stay anonymous. Don't force-fit a new face onto one of the
established characters just to place it. When you ask who it is, "it's a one-off"
or "no name" is a valid answer. A one-off needs **no** Models-directory profile
and no dedicated section — just build the set with its own copy and a fitting
title (use the given name, or a scenario-based title if unnamed), and tag it with
that name if it has one (otherwise skip the model tag).

### Model roster (`app/src/lib/models.ts` is the source of truth)

| Model | Look / signature |
|---|---|
| **Monica** | Brunette, signature curls (often restyled). The crown-jewel / variety lead — cosplay queen, but also glamour, fur, gowns, beach. Most sets are her. |
| **Melissa** | Blonde. The studio's Supergirl; sunny, comic-book optimism. |
| **Brandy** | Editorial cover model — Helmut Newton villa/sunglasses/white one-piece. Has done a Storm cosplay. |
| **Amy** | Biker/diner archetype — leather jacket, vintage Harley, defiant grin. |
| **Hallee** | Sultry/sovereign; throne, shower, dance-floor, garden/kitchen artistic-nude scenarios. Well-stocked now after English Roses + Just Desserts. |
| **Abby** | The mythological anchor — Wonder Woman / Amazon (gold armour, lasso). |
| *Nicole* | Not a directory model; appears only as Monica's friend inside the "Double Trouble" set. Don't create a Nicole section. |

## 3. Decide category and tags

Pick **one** category id (the destructured consts at the top of `seed.ts`,
`app/prisma/seed.ts:28`):

| const | name | use for |
|---|---|---|
| `glamour` | Glamour | classic/artistic nude, boudoir, beach, fur, gowns |
| `editorial` | Editorial | styled scenario shoots with a character/role |
| `swimwear` | Swimwear | poolside/beach in swimwear |
| `silhouette` | Silhouette | shadow / implied form |
| `fantasy` | Fantasy | costumes, mythology, imagination |
| `scifi` | Sci-Fi | futuristic / space |
| `comic` | Comic Book | superheroes/villains |
| `movie` | Movie/TV | film & TV icons (slug stays `"movie"`) |

Tags: lowercase, model slug first, then scenario keywords, always end with
`"carousel"`. Include `"nude"` when the set is nude. Example:
`["monica", "beach", "island", "tropical", "nude", "glamour", "carousel"]`.

## 4. Content rules

- Tasteful glamour / fine-art nude only (Playboy / fine-art register), legs
  closed, no spread/gynecological framing, no porn/sexual acts, no youth-coding.
  If a frame crosses the line, leave it out (and tell the user).
- **Lead with the least-explicit, face-forward frame**, then build toward the
  fuller ones.
- **No cross-cosplay references** — don't reference one set's character/role from
  inside a different set's copy.
- Older untagged "orphan" sets are an intentional holding pen — don't try to
  attribute them.

## 5. Write the entry in `seed.ts`

**Append the entry at the END of the `images` array** (just before the closing
`]);`). The file isn't strictly grouped by model, and appending at the end means
no existing `commentData` index shifts (see step 6). `post()` is **async**, so the
block must `await` it:

```ts
prisma.image.create({ data: await post({
  title: "Monica — Castaway",
  description: "Two or three sentences, evocative, mentions frame count and arc.",
  media: [
    { url: "/gallery/<lead-least-explicit>.jpg", caption: "..." },
    { url: "/gallery/<frame2>.jpg", caption: "...", objectPosition: "center top" },
    // ...one entry per frame, in viewing order
  ],
  categoryId: glamour.id,
  tags: ["monica", "beach", "nude", "glamour", "carousel"],
  publishedAt: new Date("2026-06-19T06:00:00Z"),
})}),
```

- Note the `data: await post({ ... })` — every entry awaits the async builder.
- The `/gallery/<file>.jpg` paths stay local-style; `toPublicUrl()` rewrites them
  to the CDN and `getDimensions()` reads the dimensions from the CDN at seed time
  (no local file needed).
- `MediaInput = { url, posterUrl?, caption?, objectPosition? }`.
- Add `objectPosition: "center top"` (or `"center 30%"`) on **tall portrait**
  frames so the face survives the landscape thumbnail crop. Wide/landscape frames
  don't need it.
- `publishedAt`: get container time first with `docker compose exec app date -u`,
  then set it a little in the **past** so the set is live. A recent timestamp puts
  it at the top of the homepage (sorted `publishedAt desc, id desc`); the user
  expects and wants new sets to lead.

## 6. Comment indices (only if you didn't append at the end)

The `commentData` block (search `imageId: images[`) references sets by **array
index**. **Appending at the end (step 5) shifts nothing** — the comments point at
early entries (`images[0,1,6,7,17]`), so you're safe. Only if you insert or move an
entry mid-array do you need to re-check those indices and bump any that now point
at the wrong set (e.g. inserting at position 12 pushes `images[16]` → `images[17]`).
This has shipped wrong before — audit it whenever you don't append at the end.

## 7. Reseed

```bash
docker compose exec app npx prisma migrate reset --force --skip-generate \
  && docker compose exec app npx prisma db push --skip-generate \
  && docker compose exec app npm run db:seed
```

This now fetches every frame's dimensions from the CDN, so it's a bit slower and
needs the CDN reachable. Watch for any `getDimensions: could not read dimensions`
warnings (a bad/missing CDN file). Confirm the final line's image count went up by
one (e.g. `74` → `75`).

## 8. Verify in the browser (Chrome MCP)

Load the Chrome tools via `ToolSearch`, open `http://localhost:3000/`, and check:

1. The new set leads "Latest Creations" with the right thumbnail and frame count.
2. Open its lightbox — title, description, tags, and frame 1/N render correctly,
   and the Discussion panel shows the **right** comment (or none) — a new
   appended set should have none; if you inserted mid-array, this confirms your
   step 6 index fixes.

Report what you built: title, frame count, where it sits, any frames you dropped,
and the new image total.