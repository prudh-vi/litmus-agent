type StatCardProps = {
  label: string;
  value: string;
  accent?: boolean;
};

export function StatCard({ label, value, accent = false }: StatCardProps) {
  return (
    <article className={`rounded-[18px] border-[3px] border-ink px-6 py-5 shadow-brutal ${accent ? "bg-lime" : "bg-white"}`}>
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate">{label}</p>
      <p className="mt-3 text-3xl font-black tracking-[-0.06em] sm:text-4xl">{value}</p>
    </article>
  );
}
