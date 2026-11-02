"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button, IconButton } from "@mui/material";
import { Menu, Moon, X } from "lucide-react";

const links = [
  { href: "/", label: "Home" },
  { href: "/birthday", label: "A birthday note" },
  { href: "/#little-things", label: "Little things" },
  { href: "/guestbook", label: "Guestbook" },
  { href: "/chat", label: "Cozy Corner" },
];

const navButtonSx = {
  minHeight: 40,
  px: 1.5,
  color: "#d5c9d8",
  "&:hover": { color: "#e9afc5", backgroundColor: "rgba(233,175,197,.08)" },
};

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const firstMenuLinkRef = useRef<HTMLAnchorElement>(null);

  const closeMenu = useCallback(() => {
    setOpen(false);
    menuButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    firstMenuLinkRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closeMenu, open]);

  return (
    <header className="site-header relative z-20 border-b">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-10" aria-label="Main navigation">
        <motion.div whileTap={{ scale: 0.96 }} transition={{ type: "spring", stiffness: 450, damping: 22 }}>
          <Button
            component={Link}
            href="/"
            color="inherit"
            startIcon={<Moon size={16} aria-hidden="true" />}
            sx={{ color: "#e9afc5", px: 1, "& .MuiButton-startIcon": { color: "#e9afc5" } }}
          >
            <span className="serif text-lg font-normal tracking-wide">a little place for amelia</span>
          </Button>
        </motion.div>

        <motion.div whileTap={{ scale: 0.9 }} transition={{ type: "spring", stiffness: 450, damping: 22 }} className="lg:hidden">
          <IconButton
            ref={menuButtonRef}
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-site-navigation"
            sx={{ border: "1px solid rgba(255,255,255,.16)", borderRadius: "999px", p: 1 }}
          >
            {open ? <X size={19} /> : <Menu size={19} />}
          </IconButton>
        </motion.div>

        <div className="site-nav-links hidden items-center gap-1 lg:flex">
          {links.map((link) => (
            <motion.div key={link.href} whileTap={{ scale: 0.94 }} transition={{ type: "spring", stiffness: 450, damping: 22 }}>
              <Button component={Link} href={link.href} size="small" sx={navButtonSx}>
                {link.label}
              </Button>
            </motion.div>
          ))}
        </div>
      </nav>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -8 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute inset-x-0 top-full z-30 overflow-hidden border-b border-white/10 bg-[#211830] shadow-xl lg:hidden"
          >
            <nav id="mobile-site-navigation" aria-label="Mobile navigation" className="mx-auto flex max-w-7xl flex-col gap-1 p-4">
              {links.map((link, index) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.025 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    ref={index === 0 ? firstMenuLinkRef : undefined}
                    component={Link}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    fullWidth
                    sx={{ justifyContent: "flex-start", color: "#eee3ef", px: 2, "&:hover": { backgroundColor: "rgba(255,255,255,.06)" } }}
                  >
                    {link.label}
                  </Button>
                </motion.div>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
