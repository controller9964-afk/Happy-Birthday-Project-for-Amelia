import type { ReactNode } from "react";
import { Typography } from "@mui/material";

export function PageHeading({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <div className="page-intro mx-auto max-w-2xl text-center">
      <Typography component="p" variant="overline" className="eyebrow mb-4" sx={{ letterSpacing: ".22em", color: "secondary.main" }}>{eyebrow}</Typography>
      <Typography component="h1" variant="h2" className="serif text-4xl leading-tight text-[#fff7f4] sm:text-5xl" sx={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: { xs: "2.25rem", sm: "3rem" }, lineHeight: 1.15 }}>{title}</Typography>
      {children && <Typography component="p" className="mx-auto mt-5 max-w-xl leading-7 text-[#c8b9cf]" sx={{ color: "text.secondary", lineHeight: 1.75 }}>{children}</Typography>}
    </div>
  );
}
