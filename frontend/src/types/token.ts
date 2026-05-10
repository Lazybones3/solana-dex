import { tokenList } from "@/lib/constants";

// export type Token = {
//   name: string;
//   symbol: string;
//   mint: string;
// };

export type Token = (typeof tokenList)[number];