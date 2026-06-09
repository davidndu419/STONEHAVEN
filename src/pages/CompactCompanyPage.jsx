import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { dataService } from "../lib/dataService";
import { Modal } from "../components/UI";
import { PublicContentLayout } from "../components/PublicContentChrome";

export function CompactCompanyPage() {
  const [company, setCompany] = useState(null);
  const [team, setTeam] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    Promise.all([
      dataService.list("companyContent", "GLOBAL", true),
      dataService.list("teamMembers", "GLOBAL", true),
    ]).then(([content, members]) => {
      setCompany(content.find((item) => item.key === "overview"));
      setTeam(members.filter((item) => item.visible).sort((a, b) => a.displayOrder - b.displayOrder));
    });
  }, []);

  return (
    <PublicContentLayout title="Company">
      <section className="bg-navy px-5 py-20 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="section-kicker">Our institution</p>
          <h1 className="display-title mt-4 max-w-4xl text-5xl md:text-7xl">{company?.title || "Stonehaven Investment Group"}</h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-white/55">{company?.overview}</p>
        </div>
      </section>
      <main className="mx-auto max-w-6xl px-4 py-14 sm:px-5">
        <div className="grid gap-4 sm:grid-cols-3">
          {company?.stats?.map((stat) => <div key={stat.label} className="glass-card p-5 text-center"><p className="display-title text-3xl text-navy">{stat.value}</p><p className="mt-2 text-[10px] uppercase tracking-widest text-slate-400">{stat.label}</p></div>)}
        </div>
        <section className="mt-14">
          <p className="section-kicker">Leadership</p>
          <h2 className="display-title mt-3 text-3xl text-navy md:text-4xl">A tradition of considered leadership.</h2>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {team.map((member) => (
              <article key={member.id} className="glass-card flex min-w-0 flex-col items-center p-3 text-center sm:p-4">
                <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full bg-navy text-gold sm:h-24 sm:w-24 lg:h-28 lg:w-28">
                  {member.photoUrl ? <img src={member.photoUrl} alt={member.name} className="h-full w-full object-cover" /> : <span className="font-display text-3xl">{member.name?.[0]}</span>}
                </div>
                <h3 className="mt-3 line-clamp-2 font-display text-base font-bold leading-tight text-navy">{member.name}</h3>
                <p className="mt-1 line-clamp-2 text-[9px] font-bold uppercase tracking-wider text-gold">{member.position}</p>
                <p className="mt-2 line-clamp-2 text-xs italic leading-5 text-slate-500">{member.quote ? `"${member.quote}"` : ""}</p>
                <p className="mt-2 flex items-center justify-center gap-1 text-[10px] text-slate-400"><MapPin size={11} /> <span className="line-clamp-1">{member.location}</span></p>
                {(member.previousCompanies || member.education || member.linkedin) && <button onClick={() => setSelected(member)} className="mt-auto pt-3 text-[10px] font-bold uppercase tracking-wider text-gold">View profile</button>}
              </article>
            ))}
          </div>
        </section>
        <section className="mt-14 grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl bg-navy p-7 text-white"><h2 className="display-title text-3xl">Our values</h2><div className="mt-6 flex flex-wrap gap-3">{company?.values?.map((value) => <span key={value} className="rounded-full border border-gold/30 px-4 py-2 text-sm text-gold">{value}</span>)}</div></div>
          <div className="glass-card p-7"><h2 className="display-title text-3xl text-navy">Global offices</h2><div className="mt-6 grid grid-cols-2 gap-3">{company?.offices?.map((office) => <div key={office} className="rounded-xl bg-stone p-4 text-sm font-bold text-navy">{office}</div>)}</div></div>
        </section>
      </main>
      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.name || "Leadership profile"}>
        {selected && <div className="space-y-4 text-sm leading-6 text-slate-600"><p className="font-bold text-gold">{selected.position}</p>{selected.previousCompanies && <div><p className="label">Experience</p><p>{selected.previousCompanies}</p></div>}{selected.education && <div><p className="label">Education</p><p>{selected.education}</p></div>}<p><strong>Location:</strong> {selected.location}</p>{selected.linkedin && <a href={selected.linkedin} target="_blank" rel="noreferrer" className="font-bold text-gold">LinkedIn profile</a>}</div>}
      </Modal>
    </PublicContentLayout>
  );
}
