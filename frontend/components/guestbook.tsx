"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Alert, Button, Paper, TextField, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { Send, BookHeart } from "lucide-react";
import { useGuestbook } from "@/hooks/use-guestbook";

export function Guestbook() {
  const { wishes, loading, submitting, loadError, submitError, success, loadWishes, addWish, clearFeedback } = useGuestbook();
  const [nickname, setNickname] = useState("");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = await addWish(nickname, message);
    if (saved) {
      setNickname("");
      setMessage("");
    }
  }

  return (
    <div className="grid gap-7 lg:grid-cols-[.8fr_1.2fr]">
      <Paper component="form" onSubmit={submit} className="guestbook-form soft-card h-fit rounded-3xl p-6 md:p-8" sx={{ border: "1px solid rgba(233,175,197,.17)", background: "rgba(31,24,43,.96)", p: { xs: 3, md: 4 } }}>
        <Typography component="h2" variant="h5" className="serif mb-6 text-2xl text-[#f7eaf0]" sx={{ fontFamily: 'Georgia, "Times New Roman", serif', mb: 3 }}>Add your wish</Typography>
        <TextField id="nickname" label="Your name" variant="outlined" fullWidth className="mb-5" sx={{ mb: 2.5 }} slotProps={{ htmlInput: { maxLength: 40 } }} required value={nickname} onChange={(event) => { setNickname(event.target.value); clearFeedback(); }} placeholder="A nickname is lovely" />
        <TextField id="wish" label="A little birthday note" variant="outlined" fullWidth multiline minRows={5} slotProps={{ htmlInput: { maxLength: 500 } }} required value={message} onChange={(event) => { setMessage(event.target.value); clearFeedback(); }} placeholder="Write something kind..." />
        <div className="mt-2 text-right text-xs text-[#a99bb0]">{message.length}/500</div>
        {submitError && <Alert severity="error" role="alert" sx={{ mt: 2, backgroundColor: "rgba(242,154,181,.12)", color: "#ffdbe6" }}>{submitError}</Alert>}
        {success && <Alert severity="success" role="status" sx={{ mt: 2, backgroundColor: "rgba(134,223,188,.1)", color: "#c5f5df" }}>{success}</Alert>}
        <motion.div className="mt-5" whileTap={{ scale: 0.98 }}>
          <Button type="submit" variant="contained" fullWidth disabled={submitting} endIcon={<Send size={15} />}>{submitting ? "Saving your wish…" : "Save in this browser"}</Button>
        </motion.div>
      </Paper>
      <div>
        <Typography component="h2" variant="h5" className="serif mb-5 flex items-center gap-3 text-2xl text-[#f7eaf0]" sx={{ fontFamily: 'Georgia, "Times New Roman", serif', mb: 2.5 }}><BookHeart className="text-rose" size={22} /> Kind words</Typography>
        {loading ? <Typography component="p" color="text.secondary" role="status">Gathering the wishes…</Typography> : loadError ? (
          <div>
            <Alert severity="error" role="alert" sx={{ backgroundColor: "rgba(242,154,181,.12)", color: "#ffdbe6" }}>{loadError}</Alert>
            <Button onClick={() => void loadWishes()} variant="outlined" sx={{ mt: 2 }}>Try again</Button>
          </div>
        ) : wishes.length === 0 ? <Paper className="soft-card rounded-2xl p-6 text-[#bcaec4]" sx={{ border: "1px solid rgba(233,175,197,.12)", p: 3, color: "text.secondary" }}>It’s quiet here for now. Add the first birthday wish.</Paper> : (
          <div className="space-y-3">
            {wishes.map((wish, index) => <motion.div key={wish.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: Math.min(index, 6) * 0.04 }}><Paper component="article" className="guestbook-wish soft-card rounded-2xl p-5" sx={{ border: "1px solid rgba(233,175,197,.12)", p: 2.5, background: "rgba(38,29,50,.94)" }}><Typography component="p" sx={{ lineHeight: 1.75, color: "#e6d9e8" }}>{wish.message}</Typography><div className="mt-4 flex justify-between text-xs text-[#a99bb0]"><span>With warmth, {wish.nickname}</span><time dateTime={wish.created_at}>{new Date(wish.created_at).toLocaleDateString()}</time></div></Paper></motion.div>)}
          </div>
        )}
      </div>
    </div>
  );
}
