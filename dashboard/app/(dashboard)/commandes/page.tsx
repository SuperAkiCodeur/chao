import { PageShell } from "@/components/PageShell";

const BD  = "1px solid rgba(255,255,255,0.08)";
const BD2 = "1px solid rgba(255,255,255,0.12)";

type Param   = { name: string; description: string; required: boolean; choices?: string[] };
type Command = { name: string; description: string; adminOnly?: boolean; auto?: boolean; params?: Param[]; note?: string };
type Module  = { emoji: string; name: string; href: string; commands: Command[] };

const MODULES: Module[] = [
  {
    emoji: "🎬", name: "Cinéma", href: "/cinema",
    commands: [
      {
        name: "/cinema", adminOnly: true,
        description: "Ouvre un menu éphémère avec trois actions disponibles pour gérer les séances.",
        params: [
          { name: "🎬 Programmer une diffusion", required: false, description: "Ouvre un formulaire : type (film/série), titre, date et heure. Le bot recherche les métadonnées sur TMDB puis publie l'annonce dans le salon configuré." },
          { name: "⏹ Terminer une diffusion",    required: false, description: "Clôt une diffusion active et ouvre automatiquement un vote de notation pendant 1 heure." },
          { name: "❓ Aide",                      required: false, description: "Affiche la liste de toutes les actions disponibles." },
        ],
      },
    ],
  },
  {
    emoji: "👥", name: "Membres", href: "/membres",
    commands: [
      {
        name: "Auto-rôle à l'arrivée", auto: true,
        description: "À chaque fois qu'un nouveau membre rejoint le serveur, le bot lui attribue automatiquement le rôle configuré dans les paramètres.",
        note: "Ce n'est pas une commande slash — c'est un comportement automatique déclenché par l'événement guildMemberAdd de Discord.",
      },
      {
        name: "/selfrole create", adminOnly: true,
        description: "Poste un message interactif dans un salon avec des boutons permettant aux membres de s'attribuer ou de retirer eux-mêmes un rôle d'un simple clic.",
        params: [
          { name: "channel",       required: true,  description: "Salon texte où le message de sélection de rôles sera posté." },
          { name: "title",         required: true,  description: "Titre affiché en haut de l'embed du message." },
          { name: "role1",         required: true,  description: "Premier rôle à proposer (au moins un requis)." },
          { name: "role2 … role5", required: false, description: "Rôles supplémentaires à proposer (jusqu'à 5 au total)." },
          { name: "description",   required: false, description: "Texte affiché sous le titre dans l'embed." },
          { name: "color",         required: false, description: "Couleur de la barre latérale de l'embed en hexadécimal — ex : #ff4655." },
        ],
      },
    ],
  },
  {
    emoji: "🎮", name: "Steam", href: "/steam",
    commands: [
      {
        name: "/steam",
        description: "Ouvre un menu interactif éphémère avec 5 actions : 🔍 Ajouter un jeu, 📋 Voir la liste, 💰 Comparer les prix, 🗑️ Retirer un jeu, 🔥 Voir les promos en cours.",
        note: "La comparaison de prix multi-boutiques nécessite une clé ITAD_API_KEY configurée sur le serveur.",
      },
    ],
  },
  {
    emoji: "⚔️", name: "Valorant", href: "/valorant",
    commands: [
      {
        name: "/valorant",
        description: "Ouvre un menu éphémère avec cinq actions pour gérer les comptes Riot liés.",
        params: [
          { name: "🔗 Lier mon compte",   required: false, description: "Associe ton Riot ID (format Pseudo#Tag) à ton profil Discord." },
          { name: "📊 Mes résultats",     required: false, description: "Affiche tes derniers matchs : mode, résultat, K/D/A et évolution de rang." },
          { name: "📈 Mes stats",         required: false, description: "Statistiques détaillées : Global, Par agent, Par map, Temps de jeu." },
          { name: "🏆 Classement",        required: false, description: "Classement des membres du serveur ayant lié leur compte, triés par rang." },
          { name: "❓ Aide",               required: false, description: "Affiche la liste de toutes les actions disponibles." },
        ],
      },
    ],
  },
];

function CommandCard({ cmd }: { cmd: Command }) {
  return (
    <div style={{ padding: "16px 20px", borderTop: BD }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <code style={{
          fontSize: 13, fontFamily: "ui-monospace, monospace", fontWeight: 700,
          color: "#fff", background: "rgba(255,255,255,0.08)",
          padding: "3px 9px", borderRadius: 4,
        }}>
          {cmd.name}
        </code>
        {cmd.adminOnly && (
          <span style={{
            fontSize: 10, fontWeight: 700, color: "#f59e0b",
            background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.18)",
            padding: "2px 8px", borderRadius: 99,
          }}>Admin</span>
        )}
        {cmd.auto && (
          <span style={{
            fontSize: 10, fontWeight: 700, color: "#60a5fa",
            background: "rgba(96,165,250,0.10)", border: "1px solid rgba(96,165,250,0.18)",
            padding: "2px 8px", borderRadius: 99,
          }}>Automatique</span>
        )}
      </div>

      {/* Description */}
      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.52)", lineHeight: 1.6, marginBottom: cmd.params || cmd.note ? 10 : 0 }}>
        {cmd.description}
      </p>

      {/* Params */}
      {cmd.params && cmd.params.length > 0 && (
        <div style={{ paddingLeft: 12, borderLeft: "2px solid rgba(255,255,255,0.09)", display: "flex", flexDirection: "column", gap: 7, marginBottom: cmd.note ? 10 : 0 }}>
          {cmd.params.map((p) => (
            <div key={p.name} style={{ display: "flex", alignItems: "baseline", gap: 7, flexWrap: "wrap" }}>
              <code style={{ fontSize: 11, fontFamily: "ui-monospace, monospace", color: "#fff", flexShrink: 0, fontWeight: 600 }}>
                {p.name}
              </code>
              <span style={{ fontSize: 10, fontWeight: 600, flexShrink: 0, color: p.required ? "rgba(239,68,68,0.75)" : "rgba(255,255,255,0.22)" }}>
                {p.required ? "requis" : "optionnel"}
              </span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.42)", flex: 1, minWidth: 0, lineHeight: 1.5 }}>
                {p.description}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Note */}
      {cmd.note && (
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.30)", fontStyle: "italic", lineHeight: 1.5 }}>
          {cmd.note}
        </p>
      )}
    </div>
  );
}

export default function CommandesPage() {
  const totalCommands = MODULES.reduce((s, m) => s + m.commands.length, 0);

  return (
    <PageShell title="Commandes" description="Référence complète des commandes et comportements du bot">

      {/* Summary pills */}
      <div className="anim-scale-in" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignSelf: "flex-start" }}>
        {MODULES.map((m) => (
          <a key={m.href} href={m.href} style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "#242424", border: BD, borderRadius: 99,
            padding: "5px 12px", textDecoration: "none",
            fontSize: 12, color: "rgba(255,255,255,0.55)",
            transition: "color 0.15s, background 0.15s",
          }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#2e2e2e"; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#242424"; e.currentTarget.style.color = "rgba(255,255,255,0.55)"; }}
          >
            <span style={{ fontSize: 13 }}>{m.emoji}</span>
            <span style={{ fontWeight: 600 }}>{m.name}</span>
            <span style={{ color: "rgba(255,255,255,0.28)" }}>{m.commands.length}</span>
          </a>
        ))}
        <div style={{ display: "flex", alignItems: "center", padding: "5px 12px", borderRadius: 99, background: "rgba(255,255,255,0.04)", border: BD, fontSize: 12, color: "rgba(255,255,255,0.30)" }}>
          {totalCommands} commande{totalCommands !== 1 ? "s" : ""} au total
        </div>
      </div>

      {/* Module sections */}
      {MODULES.map((mod, mi) => (
        <div key={mod.name} className="anim-fade-up" style={{ background: "#202020", borderRadius: 12, border: BD, overflow: "hidden", animationDelay: `${mi * 60}ms` }}>
          {/* Module header */}
          <div style={{ padding: "14px 20px", borderBottom: BD, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 16 }}>{mod.emoji}</span>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#fff", fontFamily: "var(--font-serif)", letterSpacing: "0.01em" }}>{mod.name}</p>
              <span style={{
                fontSize: 11, fontWeight: 600,
                color: "rgba(255,255,255,0.35)",
                background: "rgba(255,255,255,0.07)",
                padding: "2px 8px", borderRadius: 99,
              }}>
                {mod.commands.length} commande{mod.commands.length !== 1 ? "s" : ""}
              </span>
            </div>
            <a href={mod.href} style={{
              fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.35)",
              textDecoration: "none", display: "flex", alignItems: "center", gap: 4,
              transition: "color 0.15s",
            }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.35)"; }}
            >
              Voir la page ↗
            </a>
          </div>
          {/* Commands */}
          {mod.commands.map((cmd) => (
            <CommandCard key={cmd.name} cmd={cmd} />
          ))}
        </div>
      ))}

    </PageShell>
  );
}
