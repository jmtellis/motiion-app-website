import { BuyerEmptyIntro } from "@/components/talent-buyers/dashboard/BuyerEmptyIntro";

function GhostConversationRow() {
  return (
    <div className="buyer-inbox-empty__row" aria-hidden>
      <span className="buyer-empty__bone buyer-empty__bone--avatar" />
      <div className="buyer-inbox-empty__row-copy">
        <div className="buyer-inbox-empty__row-top">
          <span className="buyer-empty__bone buyer-empty__bone--title buyer-inbox-empty__name" />
          <span className="buyer-empty__bone buyer-inbox-empty__time" />
        </div>
        <span className="buyer-empty__bone buyer-empty__bone--line-mid" />
        <span className="buyer-empty__bone buyer-empty__bone--line-short" />
      </div>
    </div>
  );
}

export function InboxEmptyState() {
  return (
    <div className="buyer-empty buyer-inbox-empty">
      <BuyerEmptyIntro
        title="Your inbox will live here"
        lede="When you message talent or respond to invites, threads will show up here."
        primaryLabel="Find Talent"
        primaryHref="/talent"
      />

      <div className="buyer-inbox-empty__shell" aria-hidden>
        <aside className="buyer-inbox-empty__list">
          <div className="buyer-inbox-empty__search">
            <span className="buyer-empty__bone buyer-inbox-empty__search-bone" />
          </div>
          {Array.from({ length: 6 }, (_, index) => (
            <GhostConversationRow key={index} />
          ))}
        </aside>

        <section className="buyer-inbox-empty__pane">
          <div className="buyer-inbox-empty__pane-header">
            <span className="buyer-empty__bone buyer-empty__bone--avatar" />
            <div className="buyer-inbox-empty__pane-header-copy">
              <span className="buyer-empty__bone buyer-empty__bone--title" />
              <span className="buyer-empty__bone buyer-empty__bone--line-short" />
            </div>
          </div>
          <div className="buyer-inbox-empty__pane-body">
            <span className="buyer-empty__bone buyer-inbox-empty__bubble buyer-inbox-empty__bubble--left" />
            <span className="buyer-empty__bone buyer-inbox-empty__bubble buyer-inbox-empty__bubble--right" />
            <span className="buyer-empty__bone buyer-inbox-empty__bubble buyer-inbox-empty__bubble--left buyer-inbox-empty__bubble--short" />
          </div>
          <div className="buyer-inbox-empty__composer">
            <span className="buyer-empty__bone buyer-inbox-empty__composer-bone" />
          </div>
        </section>
      </div>
    </div>
  );
}
