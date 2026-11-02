import { Heart, Sparkles } from "lucide-react";
import { Typography } from "@mui/material";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/[.08] px-5 py-10 text-center">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-3">
        <Sparkles size={17} className="text-gold" aria-hidden="true" />
        <Typography component="p" className="serif text-xl text-[#f3d9e3]" sx={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: "1.25rem" }}>May the year ahead bring good stories, good songs, and many cozy moments.</Typography>
        <Typography component="p" variant="caption" className="flex items-center gap-1.5 text-xs text-[#a99bb0]">Made with <Heart size={12} className="text-rose" aria-label="love" /> for Amelia’s birthday</Typography>
      </div>
    </footer>
  );
}
