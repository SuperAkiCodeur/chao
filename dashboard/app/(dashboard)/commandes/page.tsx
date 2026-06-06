"use client";

import { useState, useMemo } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { PageShell } from "@/components/PageShell";

const BD  = "1px solid rgba(255,255,255,0.08)";
const BDI = "1px solid rgba(255,255,255,0.12)";

type Param   = { name: string; description: string; required: boolean };
type Command = { name: string; description: string; adminOnly?: boolean; auto?: boolean; params?: Param[]; note?: string };

type AutoBehavior = { name: string; description: string; note?: string };

const AUTO_BEHAVIORS: AutoBehavior[] = [
  {
    name: "Deals tracker",
    description: "Toutes les 6h, le bot vérifie les prix Steam de chaque jeu suivi et envoie une alerte dans le salon de notifications si un jeu passe en promotion.",
    note: "Nécessite une ITAD_API_KEY pour la comparaison multi-boutiques.",
  },
];

const COMMANDS: Command[] = [
  {
    name: "/cinema", adminOnly: true,
    description: "Ouvre un menu éphémère avec trois actions disponibles pour gérer les séances.",
    params: [
      { name: "🎬 Programmer une diffusion", required: false, description: "Ouvre un formulaire : type (film/série), titre, date et heure. Le bot recherche les métadonnées sur TMDB puis publie l'annonce dans le salon configuré." },
      { name: "⏹ Terminer une diffusion",    required: false, description: "Clôt une diffusion active et ouvre automatiquement un vote de notation pendant 1 heure." },
      { name: "❓ Aide",                      required: false, description: "Affiche la liste de toutes les actions disponibles." },
    ],
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
  {
    name: "/deals",
    description: "Ouvre un menu interactif éphémère pour gérer la liste de jeux du salon. Actions : 📋 Voir la liste, 🔍 Ajouter un jeu, 🗑 Retirer un jeu, 🔥 Promos en cours, 💰 Comparer les prix, ✏️ Renommer la liste, ⚙️ Salon de notifications.",
    note: "La comparaison de prix multi-boutiques nécessite une clé ITAD_API_KEY configurée sur le serveur.",
  },
];

export default function CommandesPage() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COMMANDS;
    return COMMANDS.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.params?.some((p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q))
    );
  }, [query]);

  return (
    <PageShell title="Commandes" description="Référence complète des commandes et comportements du bot">

      {/* Automatic behaviors */}
      <div className="anim-fade-up" style={{ background: "#202020", borderRadius: 12, border: BD, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: BD }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>Comportements automatiques</p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.40)", marginTop: 3 }}>
            Actions déclenchées par le bot sans intervention — configurables via le dashboard
          </p>
        </div>
        {AUTO_BEHAVIORS.map((b, i) => (
          <div key={b.name} style={{ padding: "16px 20px", borderTop: i > 0 ? BD : undefined }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <code style={{
                fontSize: 14, fontFamily: "ui-monospace, monospace", fontWeight: 700,
                color: "#fff", background: "rgba(255,255,255,0.08)", padding: "3px 9px", borderRadius: 4,
              }}>
                {b.name}
              </code>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#38bdf8", background: "rgba(56,189,248,0.10)", border: "1px solid rgba(56,189,248,0.18)", padding: "2px 8px", borderRadius: 99 }}>
                Automatique
              </span>
            </div>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.52)", lineHeight: 1.6, marginBottom: b.note ? 8 : 0 }}>
              {b.description}
            </p>
            {b.note && (
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.28)", fontStyle: "italic", lineHeight: 1.5 }}>
                {b.note}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="anim-fade-in" style={{ position: "relative" }}>
        <MagnifyingGlass size={13} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.30)", pointerEvents: "none" }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Rechercher parmi ${COMMANDS.length} commandes…`}
          autoComplete="off"
          style={{
            width: "100%", height: 38,
            background: "rgba(255,255,255,0.05)", border: BDI,
            borderRadius: 8, paddingLeft: 34, paddingRight: 12,
            fontSize: 14, color: "#fff", outline: "none",
          }}
        />
      </div>

      {/* List */}
      <div className="anim-fade-up d-50" style={{ background: "#202020", borderRadius: 12, border: BD, overflow: "hidden" }}>

        {filtered.length === 0 ? (
          <p style={{ padding: "24px 20px", fontSize: 14, color: "rgba(255,255,255,0.28)", textAlign: "center" }}>
            Aucune commande pour «&nbsp;{query}&nbsp;»
          </p>
        ) : filtered.map((cmd, i) => (
          <div
            key={cmd.name}
            style={{
              padding: "16px 20px",
              borderTop: i > 0 ? BD : undefined,
              transition: "background 0.12s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.025)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            {/* Name + badges */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
              <code style={{
                fontSize: 14, fontFamily: "ui-monospace, monospace", fontWeight: 700,
                color: "#fff", background: "rgba(255,255,255,0.08)",
                padding: "3px 9px", borderRadius: 4,
              }}>
                {cmd.name}
              </code>
              {cmd.adminOnly && (
                <span style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b", background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.18)", padding: "2px 8px", borderRadius: 99 }}>
                  Admin
                </span>
              )}
              {cmd.auto && (
                <span style={{ fontSize: 11, fontWeight: 700, color: "#60a5fa", background: "rgba(96,165,250,0.10)", border: "1px solid rgba(96,165,250,0.18)", padding: "2px 8px", borderRadius: 99 }}>
                  Automatique
                </span>
              )}
            </div>

            {/* Description */}
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.52)", lineHeight: 1.6, marginBottom: (cmd.params || cmd.note) ? 10 : 0 }}>
              {cmd.description}
            </p>

            {/* Params */}
            {cmd.params && cmd.params.length > 0 && (
              <div style={{ paddingLeft: 12, borderLeft: "2px solid rgba(255,255,255,0.09)", display: "flex", flexDirection: "column", gap: 7, marginBottom: cmd.note ? 10 : 0 }}>
                {cmd.params.map((p) => (
                  <div key={p.name} style={{ display: "flex", alignItems: "baseline", gap: 7, flexWrap: "wrap" }}>
                    <code style={{ fontSize: 12, fontFamily: "ui-monospace, monospace", color: "#fff", flexShrink: 0, fontWeight: 600 }}>
                      {p.name}
                    </code>
                    <span style={{ fontSize: 11, fontWeight: 600, flexShrink: 0, color: p.required ? "rgba(239,68,68,0.75)" : "rgba(255,255,255,0.22)" }}>
                      {p.required ? "requis" : "optionnel"}
                    </span>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.42)", flex: 1, minWidth: 0, lineHeight: 1.5 }}>
                      {p.description}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Note */}
            {cmd.note && (
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.28)", fontStyle: "italic", lineHeight: 1.5 }}>
                {cmd.note}
              </p>
            )}
          </div>
        ))}
      </div>

    </PageShell>
  );
}
