import { PageHeading } from "@/components/page-heading";
import { ChatRoom } from "@/components/chat-room";

export default function ChatPage() {
  return (
    <section className="mx-auto min-h-[75vh] max-w-5xl px-5 py-16 md:py-24">
      <PageHeading eyebrow="A friendly little gathering" title="The Cozy Corner">
        Say hello, share a birthday wish, or just enjoy the conversation. Choose a nickname to join — no account needed.
      </PageHeading>
      <ChatRoom />
    </section>
  );
}
