import { loadFont } from "@remotion/google-fonts/BricolageGrotesque";

export const { fontFamily: displayFont } = loadFont("normal", {
  weights: ["600", "700", "800"],
  subsets: ["latin"],
});
