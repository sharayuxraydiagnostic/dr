import { bilingual } from '../lib/lang'

/** Patient-language text (Devanagari font) with the English original underneath in small grey text. */
export function LangText({ en, local, strong }: { en?: string; local?: string; strong?: boolean }) {
  const { main, sub } = bilingual(en, local)
  if (!main) return null
  return (
    <span className="block">
      <span className={`${sub ? 'font-indic' : ''} ${strong ? 'font-medium' : ''} whitespace-pre-line`}>{main}</span>
      {sub && <span className="block whitespace-pre-line text-xs text-slate-500">{sub}</span>}
    </span>
  )
}
