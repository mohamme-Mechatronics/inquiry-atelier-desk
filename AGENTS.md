<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep credential-free n8n PDF continuation regression fixtures in src/test/fixtures; Telegram uploads already send documents, so their confirmed receipts must bypass the second send while WhatsApp retains upload-then-send.
- Customer channel is derived from the stored id (967 + 9 digits = WhatsApp, Telegram chat ids otherwise); panel replies go through src/lib/reply.functions.ts on the customer's own channel, notes are messages with direction 'note'.
- Admin pages build on the shared pieces in src/components/admin.tsx (PageHeader, Panel, EmptyState, Avatar, ChannelBadge, MessageBubble); reuse them so every page keeps the same look.
- Build the combined pump workflow from the previous export plus releases/bot/source using build-pump-workflow.py; regenerate credential-free fixtures from that same output so tests exercise the delivered conversation.
- Agricultural pump quotes select complete, current engineer-approved catalog packages; never substitute hybrid equipment or price/size an unapproved VFD from horsepower alone.
- Payment receipts update the existing customer/quote order through saveBotOrder without changing its sales status; receiving a receipt does not prove settlement.
- Catalog categories are derived from existing product codes/names; technical PDF defaults come from the delivered bot, with PDF_URL spec overrides for the admin library, so no duplicate catalog database is needed.
- Import bot menu products using ACTES_KEYMAP codes and effective ITEM_PRICES defaults into catalog_items with missing-code-only inserts; retain the credential-free export in releases/data so admin edits are never overwritten and imports remain auditable.
- Manual quotations use current catalog prices validated server-side, existing orders and private chat-files storage, and the shared PDF service; agricultural quotes remain restricted to engineer-approved bot packages.
