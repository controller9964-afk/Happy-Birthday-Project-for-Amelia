import { PageHeading } from "@/components/page-heading";
import { ChatRoom } from "@/components/chat-room";

export default function ChatPage() {
  return (
    <section className="mx-auto min-h-[75vh] max-w-5xl px-5 py-16 md:py-24">
      <PageHeading
        eyebrow="A friendly little gathering"
        title="The Cozy Corner"
      >
        Choose a nickname to open the chat stored in this browser. Other
        visitors cannot see these messages, and you can delete any message.
      </PageHeading>
      <ChatRoom />
    </section>
  );
}
