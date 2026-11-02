"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Button, Card, CardContent, Typography } from "@mui/material";
import {
  ArrowDown,
  ArrowRight,
  BookOpen,
  Cat,
  MessageCircle,
  Music2,
  Shirt,
  Sparkles,
  Star,
} from "lucide-react";

const interests = [
  {
    icon: BookOpen,
    title: "A world between pages",
    text: "Romance, fantasy, and the kind of story that makes one more chapter feel irresistible.",
  },
  {
    icon: Music2,
    title: "A song for the moment",
    text: "Little soundtracks for quiet mornings, long walks, and everything in between.",
  },
  {
    icon: Cat,
    title: "A little cat magic",
    text: "Soft paws, curious company, and a tiny hint of Halloween mischief.",
  },
  {
    icon: Shirt,
    title: "A touch of personal style",
    text: "Fashion as another lovely way to play, explore, and express yourself.",
  },
  {
    icon: MessageCircle,
    title: "Conversations worth having",
    text: "Room for friendly chats, new challenges, and the fun of learning something along the way.",
  },
  {
    icon: Sparkles,
    title: "Autumn, after dark",
    text: "A little Halloween season charm, candlelight, and moonlit coziness.",
  },
];

export default function HomePage() {
  return (
    <>
      <motion.section
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.12 } },
        }}
        className="relative mx-auto grid min-h-0 max-w-7xl items-center gap-6 px-5 py-12 md:min-h-[680px] md:grid-cols-[1.08fr_.92fr] md:gap-12 md:px-10 md:py-28"
      >
        <div className="relative z-10">
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 18 },
              visible: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <p className="eyebrow mb-4 flex items-center gap-2 md:mb-6">
              <Sparkles size={14} /> A birthday gathering, just for you
            </p>
            <Typography
              component="h1"
              variant="h1"
              className="serif max-w-3xl text-5xl leading-[1.07] text-[#fff7f4] sm:text-6xl lg:text-7xl"
              sx={{
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: { xs: "3rem", sm: "3.75rem", lg: "4.5rem" },
                lineHeight: 1.07,
                fontWeight: 400,
              }}
            >
              A little place
              <br />
              for <span className="italic text-rose">Amelia</span>
            </Typography>
            <Typography
              component="p"
              className="mt-5 max-w-lg text-base leading-7 text-[#d0c3d4] md:mt-7 md:text-lg md:leading-8"
              sx={{
                mt: { xs: 2.5, md: 3.5 },
                maxWidth: "32rem",
                color: "text.secondary",
                fontSize: { xs: "1rem", md: "1.125rem" },
                lineHeight: { xs: 1.7, md: 1.8 },
              }}
            >
              A cozy corner of the internet to celebrate another trip around the
              sun — with stories, music, and a little moonlit magic.
            </Typography>
          </motion.div>
          <div className="mt-6 flex flex-wrap gap-3 md:mt-9">
            <motion.div whileTap={{ scale: 0.97 }}>
              <Button
                component={Link}
                href="/birthday"
                variant="contained"
                endIcon={<ArrowRight size={17} />}
              >
                Read your birthday note
              </Button>
            </motion.div>
            <motion.div whileTap={{ scale: 0.97 }}>
              <Button
                component={Link}
                href="/guestbook"
                variant="outlined"
                sx={{
                  color: "text.primary",
                  borderColor: "rgba(255,255,255,.19)",
                  "&:hover": {
                    borderColor: "primary.main",
                    backgroundColor: "rgba(233,175,197,.07)",
                  },
                }}
              >
                Leave a little wish
              </Button>
            </motion.div>
          </div>
          <div className="mt-8 flex items-center gap-3 text-sm text-[#aa9bb2] md:mt-14">
            <span className="h-px w-9 bg-rose/50" /> A warm celebration for a
            lovely human
          </div>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative mx-auto flex h-[210px] w-full max-w-[470px] items-center justify-center md:aspect-square md:h-auto"
        >
          <Image
            src="/celestial-cat.svg"
            width={280}
            height={280}
            alt="A black cat with a pink ribbon beneath the birthday stars"
            className="hero-cat relative z-[1]"
          />
          <div className="absolute left-[17%] top-[29%] text-gold">
            <Star size={15} fill="currentColor" />
          </div>
          <div className="absolute right-[20%] top-[46%] text-rose">
            <Sparkles size={20} />
          </div>
          <div className="absolute bottom-[19%] left-[28%] text-[#d3b9dd]">
            <Star size={11} fill="currentColor" />
          </div>

          <p className="handwritten absolute bottom-[6%] right-[7%] rotate-6 text-lg text-[#d8c4de]">
            a little midnight magic
          </p>
        </motion.div>
        <a
          href="#little-things"
          aria-label="Scroll to little things"
          className="absolute bottom-7 left-1/2 hidden -translate-x-1/2 text-[#a99bb0] md:block"
        >
          <ArrowDown size={18} />
        </a>
      </motion.section>

      <section
        id="little-things"
        className="mx-auto max-w-7xl px-5 pb-24 pt-16 md:px-10 md:pb-32"
      >
        <div className="mb-12 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="eyebrow mb-3">A few favorite things</p>
            <Typography
              component="h2"
              variant="h2"
              className="serif text-4xl text-[#fff7f4]"
              sx={{
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: { xs: "2.25rem", md: "2.75rem" },
                fontWeight: 400,
              }}
            >
              Little things that feel like you
            </Typography>
          </div>
          <p className="max-w-md leading-7 text-[#bcaec4]">
            A celebration inspired by the things you enjoy — the stories,
            sounds, style, and small bits of magic that make a day yours.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {interests.map(({ icon: Icon, title, text }, index) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.18 }}
              transition={{ duration: 0.42, delay: (index % 3) * 0.06 }}
              whileHover={{ y: -4 }}
            >
              <Card
                className="interest-card soft-card h-full rounded-3xl"
                sx={{
                  height: "100%",
                  border: "1px solid rgba(233,175,197,.15)",
                  background: "rgba(35,27,48,.94)",
                  borderRadius: "1.5rem",
                  transition: "box-shadow .25s ease",
                  "&:hover": { boxShadow: "0 24px 70px rgba(0,0,0,.24)" },
                }}
              >
                <CardContent sx={{ p: 3.5, "&:last-child": { pb: 3.5 } }}>
                  <span className="mb-6 inline-flex rounded-2xl bg-rose/10 p-3 text-rose">
                    <Icon size={21} />
                  </span>
                  <Typography
                    component="h3"
                    variant="h5"
                    className="serif mb-3 text-2xl text-[#f7eaf0]"
                    sx={{
                      fontFamily: 'Georgia, "Times New Roman", serif',
                      fontSize: "1.5rem",
                      mb: 1.5,
                    }}
                  >
                    {title}
                  </Typography>
                  <Typography
                    component="p"
                    className="leading-7 text-[#bdafc4]"
                    sx={{ color: "text.secondary", lineHeight: 1.75 }}
                  >
                    {text}
                  </Typography>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.45 }}
        className="mx-5 mb-24 rounded-[2rem] border border-rose/15 bg-gradient-to-r from-[#392744] to-[#28203c] px-7 py-12 text-center md:mx-auto md:max-w-5xl md:px-12 md:py-16"
      >
        <p className="eyebrow mb-4">The cozy corner</p>
        <Typography
          component="h2"
          variant="h2"
          className="serif text-3xl text-[#fff5f5] md:text-4xl"
          sx={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: { xs: "1.875rem", md: "2.25rem" },
            fontWeight: 400,
          }}
        >
          Stay for a song, a story, or a hello.
        </Typography>
        <p className="mx-auto mt-4 max-w-xl leading-7 text-[#c9bbd0]">
          Leave a friendly birthday hello in a private chat saved only in your
          browser.
        </p>
        <motion.div className="mt-7 inline-block" whileTap={{ scale: 0.97 }}>
          <Button
            component={Link}
            href="/chat"
            variant="contained"
            endIcon={<ArrowRight size={16} />}
          >
            Visit the Cozy Corner
          </Button>
        </motion.div>
      </motion.section>
    </>
  );
}
