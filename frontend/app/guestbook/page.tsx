import { PageHeading } from "@/components/page-heading";
import { Guestbook } from "@/components/guestbook";

export default function GuestbookPage() {
  return (
    <section className="mx-auto min-h-[75vh] max-w-5xl px-5 py-20 md:py-28">
      <PageHeading
        eyebrow="Leave a little kindness"
        title="The birthday guestbook"
      >
        Add a friendly note to a collection saved only in this browser. Wishes
        are not shared with other visitors.
      </PageHeading>
      <Guestbook />
    </section>
  );
}
