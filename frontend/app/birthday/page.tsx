"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button, Card, CardContent, Paper, Typography } from "@mui/material";
import { Cake, Gift, Sparkles, Star } from "lucide-react";
import { PageHeading } from "@/components/page-heading";

const wishes = [
  "A shelf full of stories you love",
  "A soundtrack for every little adventure",
  "New things that make you curious",
  "Cozy evenings and kind company",
];

export default function BirthdayPage() {
  const [opened, setOpened] = useState(false);
  return (
    <section className="mx-auto min-h-[75vh] max-w-5xl px-5 py-20 md:py-28">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
      >
        <PageHeading
          eyebrow="A note for your day"
          title="Happy birthday, Amelia"
        >
          I hope this next chapter brings lovely surprises, fresh inspiration,
          and plenty of moments that make you smile.
        </PageHeading>
        <Card
          className="birthday-letter soft-card mx-auto max-w-3xl rounded-[2rem] text-center"
          sx={{
            border: "1px solid rgba(233,175,197,.18)",
            background: "rgba(31,24,43,.96)",
            borderRadius: "2rem",
          }}
        >
          <CardContent
            sx={{
              p: { xs: 4, md: 6 },
              "&:last-child": { pb: { xs: 4, md: 6 } },
            }}
          >
            <Cake className="mx-auto mb-6 text-rose" size={28} />
            <Typography
              component="p"
              className="serif text-2xl leading-relaxed text-[#f7eaf0] md:text-3xl"
              sx={{
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: { xs: "1.5rem", md: "1.875rem" },
                lineHeight: 1.5,
              }}
            >
              “May the year ahead be full of good books, favorite songs,
              delightful discoveries, and the kind of everyday magic that stays
              with you.”
            </Typography>
            <Typography
              component="p"
              variant="body2"
              className="mt-6 text-sm text-[#bcaec4]"
              sx={{ mt: 3, color: "text.secondary" }}
            >
              A very happy birthday — and all the best for the year ahead.
            </Typography>
            <p className="handwritten mt-7 text-lg text-[#e9afc5]">
              With a warm birthday wish, Michael
            </p>
          </CardContent>
        </Card>
        <motion.div
          className="mx-auto mt-10 text-center"
          whileTap={{ scale: 0.97 }}
        >
          <Button
            type="button"
            variant="contained"
            color="primary"
            onClick={() => setOpened(!opened)}
            aria-expanded={opened}
            endIcon={<Gift size={17} />}
          >
            {opened ? "Tuck the wishes away" : "Open a tiny birthday surprise"}
          </Button>
        </motion.div>
      </motion.div>
      <AnimatePresence>
        {opened && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.24 }}
          >
            <Paper
              className="birthday-surprise soft-card mx-auto mt-8 max-w-3xl rounded-3xl p-7 md:p-9"
              sx={{
                border: "1px solid rgba(233,175,197,.18)",
                borderRadius: "1.5rem",
                background: "rgba(43,32,54,.96)",
              }}
            >
              <Typography
                component="p"
                variant="overline"
                className="eyebrow mb-5 flex items-center justify-center gap-2"
                sx={{ color: "secondary.main", letterSpacing: ".18em" }}
              >
                <Sparkles size={14} /> A handful of wishes for the next chapter
              </Typography>
              <div className="grid gap-3 sm:grid-cols-2">
                {wishes.map((wish, index) => (
                  <motion.div
                    key={wish}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.06 }}
                    className="flex items-start gap-3 rounded-2xl border border-white/[.07] bg-[#211a2d] p-4 text-left leading-6 text-[#e2d5e5]"
                  >
                    <Star size={15} className="mt-1 shrink-0 text-gold" />
                    {wish}
                  </motion.div>
                ))}
              </div>
            </Paper>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
