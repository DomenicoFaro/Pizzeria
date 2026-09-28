import type { OpeningHour } from "@/lib/types";
import { WEEKDAY_LABELS } from "@/lib/time";

const ORDER = [1, 2, 3, 4, 5, 6, 0];
const hhmm = (t: string) => t.slice(0, 5);

export function HoursTable({ hours, className = "", highlightToday }: { hours: OpeningHour[]; className?: string; highlightToday?: number }) {
  return (
    <table className={`w-full text-sm ${className}`}>
      <tbody>
        {ORDER.map((wd) => {
          const ranges = hours.filter((h) => h.weekday === wd).sort((a, b) => a.open_time.localeCompare(b.open_time));
          const today = highlightToday === wd;
          return (
            <tr key={wd} className={today ? "font-semibold" : ""}>
              <th scope="row" className="py-1.5 pr-4 text-left font-medium">
                {WEEKDAY_LABELS[wd]}
                {today && <span className="ml-2 rounded-full bg-oro/20 px-2 py-0.5 text-xs">oggi</span>}
              </th>
              <td className="py-1.5 text-right tabular-nums">
                {ranges.length === 0 ? (
                  <span className="text-brace">Chiuso</span>
                ) : (
                  ranges.map((r) => `${hhmm(r.open_time)} – ${hhmm(r.close_time)}`).join(" · ")
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
