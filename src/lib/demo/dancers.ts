export type DemoCredit = {
  artist: string;
  role: string;
  year: string;
};

export type DemoDancer = {
  id: string;
  slug: string;
  name: string;
  pronouns: string;
  location: string;
  agency: string;
  agencyVerified: boolean;
  styles: string[];
  height: string;
  measurements: string;
  availability: "available" | "limited" | "booked";
  availabilityLabel: string;
  unionStatus: string;
  imageUrl: string;
  headshots: string[];
  credits: DemoCredit[];
  represented: boolean;
  gender: string;
  matchReasons?: string[];
};

/** Static snapshot of real Motiion talent accounts for marketing demos (no runtime API). */
export const demoDancers: DemoDancer[] = [
  {
    id: "dancer-gabriela",
    slug: "gabibbarra",
    name: "Gabriela Barra",
    pronouns: "she/her",
    location: "Los Angeles, CA",
    agency: "Clear Talent Group",
    agencyVerified: true,
    styles: ["Hip-Hop", "Commercial", "Heels", "Jazz", "Contemporary"],
    height: "5'2\"",
    measurements: "",
    availability: "available",
    availabilityLabel: "Available this month",
    unionStatus: "SAG-AFTRA",
    imageUrl:
      "https://pygdxcscmebeqjxhzzuq.supabase.co/storage/v1/object/public/headshots/18f1ae1d-d6f5-4022-b1f5-e4ef5e47599e/headshot_0_1782102131.jpg",
    headshots: [
      "https://pygdxcscmebeqjxhzzuq.supabase.co/storage/v1/object/public/headshots/18f1ae1d-d6f5-4022-b1f5-e4ef5e47599e/headshot_0_1782102131.jpg",
      "https://pygdxcscmebeqjxhzzuq.supabase.co/storage/v1/object/public/headshots/18f1ae1d-d6f5-4022-b1f5-e4ef5e47599e/headshot_1_1782102131.jpg",
      "https://pygdxcscmebeqjxhzzuq.supabase.co/storage/v1/object/public/headshots/18f1ae1d-d6f5-4022-b1f5-e4ef5e47599e/headshot_2_1782102131.jpg",
    ],
    credits: [
      { artist: "iHeartRadio Music Awards", role: "Dancer", year: "NBC / FOX" },
      { artist: "Rihanna", role: "Savage X Fenty Vol.1", year: "Dancer" },
      { artist: "Rihanna", role: "Savage X Fenty Vol.2", year: "Dancer" },
    ],
    represented: true,
    gender: "Female",
    matchReasons: ["Hip-Hop", "Commercial", "LA", "Available"],
  },
  {
    id: "dancer-gaynor",
    slug: "gaynorrrr",
    name: "Gaynor Hicks",
    pronouns: "she/her",
    location: "Los Angeles, CA",
    agency: "Clear Talent Group (LA)",
    agencyVerified: true,
    styles: ["Hip-Hop", "Commercial", "Heels", "Jazz", "Contemporary"],
    height: "5'4\"",
    measurements: "",
    availability: "available",
    availabilityLabel: "Available this month",
    unionStatus: "Non-union",
    imageUrl:
      "https://pygdxcscmebeqjxhzzuq.supabase.co/storage/v1/object/public/headshots/5cb7514c-c007-4087-979d-ea7de5189720/headshot_0_1776881768.jpg",
    headshots: [
      "https://pygdxcscmebeqjxhzzuq.supabase.co/storage/v1/object/public/headshots/5cb7514c-c007-4087-979d-ea7de5189720/headshot_0_1776881768.jpg",
      "https://pygdxcscmebeqjxhzzuq.supabase.co/storage/v1/object/public/headshots/5cb7514c-c007-4087-979d-ea7de5189720/headshot_1_1776881768.jpg",
      "https://pygdxcscmebeqjxhzzuq.supabase.co/storage/v1/object/public/headshots/5cb7514c-c007-4087-979d-ea7de5189720/headshot_2_1776881768.jpg",
      "https://pygdxcscmebeqjxhzzuq.supabase.co/storage/v1/object/public/headshots/5cb7514c-c007-4087-979d-ea7de5189720/headshot_3_1776881768.jpg",
    ],
    credits: [
      { artist: "J Balvin", role: "VMAs — Assistant Choreographer", year: "Live" },
      { artist: "The Weeknd", role: "Grammys Performance", year: "Dancer" },
      { artist: "Netflix", role: "A Nonsense Christmas", year: "Dancer" },
    ],
    represented: true,
    gender: "Female",
    matchReasons: ["Hip-Hop", "Commercial", "LA", "Available"],
  },
  {
    id: "dancer-natsuki",
    slug: "natsukimiya",
    name: "Natsuki Miya",
    pronouns: "she/her",
    location: "Los Angeles, CA",
    agency: "Bloc Agency (LA)",
    agencyVerified: true,
    styles: ["Commercial", "Heels", "Hip-Hop", "Jazz", "Musical Theatre"],
    height: "",
    measurements: "",
    availability: "available",
    availabilityLabel: "Available this month",
    unionStatus: "SAG-AFTRA",
    imageUrl:
      "https://pygdxcscmebeqjxhzzuq.supabase.co/storage/v1/object/public/headshots/d9f4e50d-c44e-4499-b84c-4d0925a3e486/headshot_1_1781130371.jpg",
    headshots: [
      "https://pygdxcscmebeqjxhzzuq.supabase.co/storage/v1/object/public/headshots/d9f4e50d-c44e-4499-b84c-4d0925a3e486/headshot_1_1781130371.jpg",
    ],
    credits: [
      { artist: "Sabrina Carpenter", role: "Short n' Sweet Tour", year: "Dancer" },
      { artist: "N.E.R.D", role: "World Festival Tour", year: "Dancer" },
      { artist: "TLC", role: "I Love the 90s Tour", year: "Dancer" },
    ],
    represented: true,
    gender: "Female",
    matchReasons: ["Hip-Hop", "Commercial", "LA"],
  },
  {
    id: "dancer-monique",
    slug: "piinklemonade",
    name: "Monique Watson",
    pronouns: "she/her",
    location: "Los Angeles, CA",
    agency: "Bloc Agency (LA)",
    agencyVerified: true,
    styles: ["Hip-Hop", "Commercial", "Heels", "House", "Street Jazz"],
    height: "5'4\"",
    measurements: "",
    availability: "available",
    availabilityLabel: "Available this month",
    unionStatus: "SAG-AFTRA",
    imageUrl:
      "https://pygdxcscmebeqjxhzzuq.supabase.co/storage/v1/object/public/headshots/ac3b2f62-f04c-456f-9e5a-d6833e40bfa5/headshot_0_1776990463.jpg",
    headshots: [
      "https://pygdxcscmebeqjxhzzuq.supabase.co/storage/v1/object/public/headshots/ac3b2f62-f04c-456f-9e5a-d6833e40bfa5/headshot_0_1776990463.jpg",
      "https://pygdxcscmebeqjxhzzuq.supabase.co/storage/v1/object/public/headshots/ac3b2f62-f04c-456f-9e5a-d6833e40bfa5/headshot_1_1776990463.jpg",
      "https://pygdxcscmebeqjxhzzuq.supabase.co/storage/v1/object/public/headshots/ac3b2f62-f04c-456f-9e5a-d6833e40bfa5/headshot_2_1776990463.jpg",
      "https://pygdxcscmebeqjxhzzuq.supabase.co/storage/v1/object/public/headshots/ac3b2f62-f04c-456f-9e5a-d6833e40bfa5/headshot_3_1776990463.jpg",
    ],
    credits: [
      { artist: "Ciara + Serena Williams", role: "ESPYS", year: "Dancer" },
      { artist: "Usher", role: "BET Awards Tribute", year: "Dancer" },
      { artist: "BET Awards", role: "A Bar Song Performance", year: "Dancer" },
    ],
    represented: true,
    gender: "Female",
    matchReasons: ["Hip-Hop", "Commercial", "LA", "Available"],
  },
  {
    id: "dancer-rithiely",
    slug: "rithiely",
    name: "Rithiely",
    pronouns: "she/her",
    location: "Los Angeles, CA",
    agency: "Represented",
    agencyVerified: true,
    styles: ["Commercial", "Heels", "Hip-Hop", "Partnering"],
    height: "5'3\"",
    measurements: "",
    availability: "available",
    availabilityLabel: "Available this month",
    unionStatus: "SAG-AFTRA",
    imageUrl:
      "https://pygdxcscmebeqjxhzzuq.supabase.co/storage/v1/object/public/headshots/f75b5db8-fd09-46fd-80d0-cf94be753304/headshot_0_1775000704.jpg",
    headshots: [
      "https://pygdxcscmebeqjxhzzuq.supabase.co/storage/v1/object/public/headshots/f75b5db8-fd09-46fd-80d0-cf94be753304/headshot_0_1775000704.jpg",
      "https://pygdxcscmebeqjxhzzuq.supabase.co/storage/v1/object/public/headshots/f75b5db8-fd09-46fd-80d0-cf94be753304/headshot_1_1775000704.jpg",
      "https://pygdxcscmebeqjxhzzuq.supabase.co/storage/v1/object/public/headshots/f75b5db8-fd09-46fd-80d0-cf94be753304/headshot_2_1775000704.jpg",
    ],
    credits: [
      { artist: "Shakira & Jennifer Lopez", role: "Super Bowl LIV", year: "Dancer" },
      { artist: "Disney Aladdin", role: "Dancer", year: "Jamal Sims" },
      { artist: "Selena Gomez", role: "American Music Awards", year: "Dancer" },
    ],
    represented: true,
    gender: "Female",
    matchReasons: ["Hip-Hop", "Commercial", "LA"],
  },
  {
    id: "dancer-jay",
    slug: "jaymtellis",
    name: "Jay Tellis",
    pronouns: "he/him",
    location: "Los Angeles, CA",
    agency: "Bloc Agency (LA)",
    agencyVerified: true,
    styles: ["Hip-Hop", "Commercial", "Jazz", "Musical Theatre", "Street Jazz"],
    height: "5'11\"",
    measurements: "",
    availability: "available",
    availabilityLabel: "Available this month",
    unionStatus: "SAG-AFTRA",
    imageUrl:
      "https://pygdxcscmebeqjxhzzuq.supabase.co/storage/v1/object/public/headshots/42402829-5cf7-4fdb-95dc-d5d8fd506124/headshot_0_1781906173.jpg",
    headshots: [
      "https://pygdxcscmebeqjxhzzuq.supabase.co/storage/v1/object/public/headshots/42402829-5cf7-4fdb-95dc-d5d8fd506124/headshot_0_1781906173.jpg",
      "https://pygdxcscmebeqjxhzzuq.supabase.co/storage/v1/object/public/headshots/42402829-5cf7-4fdb-95dc-d5d8fd506124/headshot_1_1781906173.jpg",
      "https://pygdxcscmebeqjxhzzuq.supabase.co/storage/v1/object/public/headshots/42402829-5cf7-4fdb-95dc-d5d8fd506124/headshot_2_1781906173.jpg",
      "https://pygdxcscmebeqjxhzzuq.supabase.co/storage/v1/object/public/headshots/42402829-5cf7-4fdb-95dc-d5d8fd506124/headshot_3_1781906173.jpg",
    ],
    credits: [
      { artist: "Netflix", role: "Dancer", year: "Television" },
      { artist: "JBL", role: "Dancer", year: "Campaign" },
      { artist: "Preseiben", role: "Dancer", year: "Live" },
    ],
    represented: true,
    gender: "Male",
    matchReasons: ["Hip-Hop", "Commercial", "LA", "Available"],
  },
  {
    id: "dancer-jake",
    slug: "jakebrandorff",
    name: "Jake Brandorff",
    pronouns: "he/him",
    location: "Los Angeles, CA",
    agency: "Clear Talent Group (LA)",
    agencyVerified: true,
    styles: ["Hip-Hop", "Commercial", "Breaking", "House", "Popping"],
    height: "5'11\"",
    measurements: "",
    availability: "available",
    availabilityLabel: "Available this month",
    unionStatus: "SAG-AFTRA",
    imageUrl:
      "https://pygdxcscmebeqjxhzzuq.supabase.co/storage/v1/object/public/headshots/ac855d03-ad35-4a90-abc2-868c54ebeb37/headshot_0_1776969009.jpg",
    headshots: [
      "https://pygdxcscmebeqjxhzzuq.supabase.co/storage/v1/object/public/headshots/ac855d03-ad35-4a90-abc2-868c54ebeb37/headshot_0_1776969009.jpg",
      "https://pygdxcscmebeqjxhzzuq.supabase.co/storage/v1/object/public/headshots/ac855d03-ad35-4a90-abc2-868c54ebeb37/headshot_1_1776969009.jpg",
      "https://pygdxcscmebeqjxhzzuq.supabase.co/storage/v1/object/public/headshots/ac855d03-ad35-4a90-abc2-868c54ebeb37/headshot_2_1776969009.jpg",
      "https://pygdxcscmebeqjxhzzuq.supabase.co/storage/v1/object/public/headshots/ac855d03-ad35-4a90-abc2-868c54ebeb37/headshot_3_1776969009.jpg",
    ],
    credits: [
      { artist: "BLACKPINK", role: "Deadline World Tour", year: "2025–26" },
      { artist: "Jennie", role: "Coachella", year: "Dancer" },
      { artist: "Sabrina Carpenter", role: "VMAs", year: "Dancer" },
    ],
    represented: true,
    gender: "Male",
    matchReasons: ["Hip-Hop", "Commercial", "LA", "Available"],
  },
  {
    id: "dancer-nathan",
    slug: "nathan_cherry",
    name: "Nathan Cherry",
    pronouns: "he/him",
    location: "Los Angeles, CA",
    agency: "Clear Talent Group (LA)",
    agencyVerified: true,
    styles: ["Hip-Hop", "Commercial", "Breaking", "House", "Popping"],
    height: "5'11\"",
    measurements: "",
    availability: "available",
    availabilityLabel: "Available this month",
    unionStatus: "SAG-AFTRA",
    imageUrl:
      "https://pygdxcscmebeqjxhzzuq.supabase.co/storage/v1/object/public/headshots/8798252d-483a-425b-8f94-aa8204b6c83a/headshot_1_1777508535.jpg",
    headshots: [
      "https://pygdxcscmebeqjxhzzuq.supabase.co/storage/v1/object/public/headshots/8798252d-483a-425b-8f94-aa8204b6c83a/headshot_1_1777508535.jpg",
    ],
    credits: [
      { artist: "Sabrina Carpenter", role: "Short & Sweet Tour", year: "Dancer" },
      { artist: "Coachella", role: "Dancer", year: "Festival" },
      { artist: "GRAMMYs", role: "67th Grammys", year: "Dancer" },
    ],
    represented: true,
    gender: "Male",
    matchReasons: ["Hip-Hop", "Commercial", "LA", "Available"],
  },
];

export const featuredDemoDancer =
  demoDancers.find((dancer) => dancer.id === "dancer-gabriela") ?? demoDancers[0];

export const searchDemoDancers = demoDancers.filter((dancer) =>
  dancer.styles.some((style) => style === "Hip-Hop" || style === "Commercial"),
);
