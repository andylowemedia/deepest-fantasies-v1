export interface ModelProfile {
  slug: string;
  name: string;
  tagSlug: string;
  voice: string;
  bio: string;
  avatar: string;
}

// Avatars are served from the CDN, alongside the gallery images.
const PROFILE_BASE =
  "https://cdn.low-emedia.com/sites/deepestfantasies/content/profiles/";

export const MODELS: ModelProfile[] = [
  {
    slug: "monica",
    name: "Monica",
    tagSlug: "monica",
    voice: "Confident, knowing, ready to be looked at.",
    bio: "The studio's cosplay queen. She's been a French maid, a nurse, a Playboy bunny, an X-Men icon, a modern Jedi, Indiana Jones and a Ghostbuster — and made every one of them look like it was tailored to her. When she's not in costume she's in fur, lingerie, gym kit or a black-tie gown. Variety is her business and she's the best in it.",
    avatar: PROFILE_BASE + "1fd5052b75f752683e371592690be059.jpg",
  },
  {
    slug: "melissa",
    name: "Melissa",
    tagSlug: "melissa",
    voice: "Sunshine. Comic-book optimism, no brooding.",
    bio: "Our Supergirl. Plays the role like she was born for it — all Christopher Reeve era warmth, flying over Metropolis, blowing kisses to the citizens, doing the job with a smile. The world is a better place when she's in the sky.",
    avatar: PROFILE_BASE + "4abd513cc273f29f5d368868e4b7d5bf.jpg",
  },
  {
    slug: "brandy",
    name: "Brandy",
    tagSlug: "brandy",
    voice: "Quiet luxury. Doesn't say much because she doesn't have to.",
    bio: "Our editorial cover model. Modernist villa, sunglasses, plunging white one-piece — pure Helmut Newton territory. Equally at home stepping into a cosplay (she's done the Storm shoot), but the look that suits her best is her own: refined, unhurried, comfortable in her skin.",
    avatar: PROFILE_BASE + "2a18d248a1027c1ea8f0507b32c93a52.jpg",
  },
  {
    slug: "amy",
    name: "Amy",
    tagSlug: "amy",
    voice: "Trouble in a leather jacket. Won't call back.",
    bio: "Vintage Harley, diner coffee, defiant grin. Amy's the one who'll borrow your bike, hit two state lines and call you from a payphone laughing. Then disappear. You'll be fine, eventually. Maybe.",
    avatar: PROFILE_BASE + "ae112aa59ca5a4e5647e612822e757d2.jpg",
  },
  {
    slug: "hallee",
    name: "Hallee",
    tagSlug: "hallee",
    voice: "Empress on her own terms. Sultry, sovereign.",
    bio: "Takes the golden throne when she wants the room, takes the shower when she wants to be alone, takes the dance floor when she wants to forget she's royalty. Confidence wedded to literal sovereignty.",
    avatar: PROFILE_BASE + "11c4ac89726ce40e1574029b48a6c73f.jpg",
  },
  {
    slug: "abby",
    name: "Abby",
    tagSlug: "abby",
    voice: "Noble, warm, completely lethal.",
    bio: "Our anchor for the mythological side of the gallery. Plays Wonder Woman / Diana Prince — Princess of Themyscira, museum curator by day, deflector of bullets by every other hour. The Amazon thread runs through her shoots: gold armour, lasso, bracelets, and the kind of compassion that makes the warrior part more frightening, not less.",
    avatar: PROFILE_BASE + "e9c886e7e9872219493efbc73cf83697.jpg",
  },
];

export function findModel(slug: string): ModelProfile | undefined {
  return MODELS.find((m) => m.slug === slug);
}