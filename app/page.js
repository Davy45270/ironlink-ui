"use client";

import { useState, useEffect } from "react";
import { DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";

const initialColumns = [
  { id: "backlog", title: "Backlog" },
  { id: "todo", title: "À faire" },
  { id: "doing", title: "En cours" },
  { id: "done", title: "Terminé" },
];

const initialItems = {
  backlog: [
    {
      id: "c1",
      type: "epic",
      title: "Auth",
      priority: "high",
      assignee: "PO",
      status: "backlog",
      description: "SSO + groupes + admin local",
      labels: ["IAM"],
      qa: false,
      rssi: false,
      checklist: [
        { text: "Exigences sécurité validées", done: false },
        { text: "Flux SSO validé", done: false },
      ],
      comments: [
        { author: "RSSI", text: "Prévoir break-glass admin", at: "2026-02-02" },
      ],
      links: ["Bloque: Epic Gouvernance"],
      dates: { created: "2026-02-01", due: "2026-02-10", updated: "2026-02-02" },
      attachments: [
        { name: "spec-auth-v1.pdf", url: "/files/spec-auth-v1.pdf", type: "pdf" },
        { name: "screenshot.png", url: "https://via.placeholder.com/150", type: "image" },
      ],
    },
    {
      id: "c2",
      type: "story",
      title: "Board config",
      priority: "med",
      assignee: "DevOps",
      status: "backlog",
      description: "Config colonnes, WIP",
      labels: ["Kanban"],
      qa: false,
      rssi: false,
      checklist: [
        { text: "WIP limits définis", done: false },
        { text: "Swimlanes validées", done: false },
      ],
      comments: [],
      links: [],
      dates: { created: "2026-02-01", due: "2026-02-08", updated: "2026-02-02" },
      attachments: [],
    },
  ],
  todo: [
    {
      id: "c3",
      type: "story",
      title: "Drag & Drop",
      priority: "high",
      assignee: "Dev Front",
      status: "todo",
      description: "Déplacement cartes",
      labels: ["UI"],
      qa: false,
      rssi: false,
      checklist: [
        { text: "DnD cross-column", done: true },
        { text: "DnD reorder", done: true },
        { text: "Tests UI", done: false },
      ],
      comments: [{ author: "QA", text: "Tester mobile", at: "2026-02-02" }],
      links: ["Dépend de: API items"],
      dates: { created: "2026-02-02", due: "2026-02-06", updated: "2026-02-02" },
      attachments: [{ name: "screen-dnd.png", url: "https://via.placeholder.com/150", type: "image" }],
    },
    {
      id: "c4",
      type: "task",
      title: "WIP limits",
      priority: "med",
      assignee: "PO",
      status: "todo",
      description: "Limites par colonne",
      labels: ["Process"],
      qa: false,
      rssi: false,
      checklist: [{ text: "WIP par colonne défini", done: false }],
      comments: [],
      links: [],
      dates: { created: "2026-02-02", due: "2026-02-09", updated: "2026-02-02" },
      attachments: [],
    },
  ],
  doing: [
    {
      id: "c5",
      type: "story",
      title: "UI cards",
      priority: "low",
      assignee: "UX",
      status: "doing",
      description: "Layout + badges",
      labels: ["UI"],
      qa: false,
      rssi: false,
      checklist: [{ text: "Palette couleurs", done: true }],
      comments: [{ author: "UX", text: "Ajouter drawer détails", at: "2026-02-02" }],
      links: [],
      dates: { created: "2026-02-01", due: "2026-02-05", updated: "2026-02-02" },
      attachments: [],
    },
  ],
  done: [
    {
      id: "c6",
      type: "task",
      title: "API v0",
      priority: "med",
      assignee: "Dev Back",
      status: "done",
      description: "Endpoints init",
      labels: ["API"],
      qa: true,
      rssi: true,
      checklist: [{ text: "Endpoint /v1/items", done: true }],
      comments: [{ author: "Dev Back", text: "Seed OK", at: "2026-02-03" }],
      links: [],
      dates: { created: "2026-02-01", due: "2026-02-03", updated: "2026-02-03" },
      attachments: [{ name: "openapi.yaml", url: "/files/openapi.yaml", type: "yaml" }],
    },
  ],
};

const typeLabel = { epic: "Epic", story: "Story", task: "Tâche" };
const priorityLabel = { high: "Haute", med: "Moyenne", low: "Basse" };

const perms = {
  admin: new Set(["cards:edit", "kanban:move", "comments:add", "attachments:edit", "labels:edit", "links:edit", "checklist:edit", "dates:edit", "qa:validate", "rssi:validate"]),
  po: new Set(["cards:edit", "kanban:move", "comments:add", "attachments:edit", "labels:edit", "links:edit", "checklist:edit", "dates:edit"]),
  pmo: new Set(["cards:edit", "kanban:move", "comments:add", "attachments:edit", "labels:edit", "links:edit", "checklist:edit", "dates:edit"]),
  dev: new Set(["cards:edit", "kanban:move", "comments:add", "attachments:edit", "labels:edit", "links:edit", "checklist:edit", "dates:edit"]),
  qa: new Set(["cards:edit", "kanban:move", "comments:add", "checklist:edit", "qa:validate"]),
  rssi: new Set(["comments:add", "rssi:validate"]),
  ops: new Set(["cards:edit", "kanban:move", "comments:add", "attachments:edit", "labels:edit", "links:edit", "checklist:edit", "dates:edit"]),
  user: new Set(["comments:add"]),
};

function can(role, perm) {
  return perms[role]?.has(perm);
}

function SortableCard({ id, title, meta, onOpen, disabled }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={`card ${disabled ? "disabled" : ""}`} {...(disabled ? {} : attributes)} {...(disabled ? {} : listeners)} onClick={() => onOpen(meta)}>
      <div className={`badge type ${meta.type}`}>{typeLabel[meta.type] || meta.type}</div>
      <div className="title">{title}</div>
      <div className="meta">
        <span className={`prio ${meta.priority}`}>{priorityLabel[meta.priority] || meta.priority}</span>
        <span className="assignee">{meta.assignee}</span>
      </div>
    </div>
  );
}

function Column({ id, title, items, onOpen, dragDisabled }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`column ${isOver ? "over" : ""}`}>
      <div className="columnTitle">{title}</div>
      <div className="cards">
        <SortableContext items={items.map((i) => i.id)}>
          {items.map((c) => (
            <SortableCard key={c.id} id={c.id} title={c.title} meta={c} onOpen={onOpen} disabled={dragDisabled} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

export default function Home() {
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const [itemsByColumn, setItemsByColumn] = useState(initialItems);
  const [columns, setColumns] = useState(initialColumns);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [newLabel, setNewLabel] = useState("");
  const [newComment, setNewComment] = useState("");
  const [newLink, setNewLink] = useState("");
  const [newAttachmentName, setNewAttachmentName] = useState("");
  const [newAttachmentUrl, setNewAttachmentUrl] = useState("");
  const [role, setRole] = useState("admin");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("http://192.168.1.230:13000/v1/items", { headers: { "x-role": role } });
        if (!res.ok) return;
        const data = await res.json();
        const statusTitles = { backlog: "Backlog", todo: "À faire", doing: "En cours", review: "Revue", done: "Terminé" };
        const statusIds = data?.project?.statuses || initialColumns.map((c) => c.id);
        const nextColumns = statusIds.map((id) => ({ id, title: statusTitles[id] || id }));
        const mapped = {};
        for (const col of nextColumns) mapped[col.id] = [];
        for (const it of (data.items || [])) {
          const status = it.status || "todo";
          if (!mapped[status]) mapped[status] = [];
          mapped[status].push({
            id: it.id,
            type: it.type || "story",
            title: it.title || "(sans titre)",
            priority: it.priority || "med",
            assignee: it.assignee || "Unassigned",
            status,
            description: it.description || "",
            labels: it.tags || [],
            qa: false,
            rssi: false,
            checklist: [],
            comments: [],
            links: [],
            dates: {
              created: (it.createdAt || "").slice(0, 10),
              due: "",
              updated: (it.updatedAt || "").slice(0, 10),
            },
            attachments: [],
          });
        }
        setColumns(nextColumns);
        setItemsByColumn(mapped);
      } catch (e) {
        // keep local fallback
      }
    }
    load();
  }, [role]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function findColumnByItemId(itemId) {
    return columns.find((col) => (itemsByColumn[col.id] || []).some((i) => i.id === itemId));
  }

  function updateItem(itemId, patch) {
    const col = findColumnByItemId(itemId);
    if (!col) return;
    const items = itemsByColumn[col.id];
    const idx = items.findIndex((i) => i.id === itemId);
    if (idx < 0) return;
    const updated = { ...items[idx], ...patch, dates: { ...items[idx].dates, updated: new Date().toISOString().split("T")[0] } };
    const nextItems = [...items];
    nextItems[idx] = updated;
    setItemsByColumn({ ...itemsByColumn, [col.id]: nextItems });
    setSelected(updated);
  }

  function onDragEnd(event) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    const activeCol = findColumnByItemId(activeId);
    if (!activeCol) return;

    const overCol = columns.find((c) => c.id === overId) || findColumnByItemId(overId);
    if (!overCol) return;

    if (activeCol.id === overCol.id) {
      const items = itemsByColumn[activeCol.id];
      const oldIndex = items.findIndex((i) => i.id === activeId);
      const newIndex = items.findIndex((i) => i.id === overId);
      if (oldIndex !== newIndex && newIndex >= 0) {
        const next = arrayMove(items, oldIndex, newIndex);
        setItemsByColumn({ ...itemsByColumn, [activeCol.id]: next });
      }
      return;
    }

    const activeItems = itemsByColumn[activeCol.id];
    const overItems = itemsByColumn[overCol.id];
    const moving = activeItems.find((i) => i.id === activeId);
    if (!moving) return;

    const nextActive = activeItems.filter((i) => i.id !== activeId);
    const nextOver = [...overItems, { ...moving, status: overCol.id }];

    setItemsByColumn({
      ...itemsByColumn,
      [activeCol.id]: nextActive,
      [overCol.id]: nextOver,
    });
  }

  const canEdit = can(role, "cards:edit");
  const canMove = can(role, "kanban:move");

  return (
    <main className="page">
      <header className="header">
        <h1>IronLink — Kanban (MVP)</h1>
        <div className="subtitle">Epic → Story → Tâche</div>
        <div className="role">
          <label>Rôle:</label>
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="admin">Admin</option>
            <option value="po">PO</option>
            <option value="pmo">PMO</option>
            <option value="dev">Dev</option>
            <option value="qa">QA</option>
            <option value="rssi">RSSI</option>
            <option value="ops">Ops</option>
            <option value="user">User</option>
          </select>
        </div>
      </header>

      {mounted && canMove ? (
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <section className="board">
            {columns.map((col) => (
              <Column key={col.id} id={col.id} title={col.title} items={itemsByColumn[col.id] || []} onOpen={setSelected} dragDisabled={!canMove} />
            ))}
          </section>
        </DndContext>
      ) : (
        <section className="board">
          {columns.map((col) => (
            <div key={col.id} className="column">
              <div className="columnTitle">{col.title}</div>
              <div className="cards">
                {(itemsByColumn[col.id] || []).map((c) => (
                  <div key={c.id} className="card">
                    {c.title}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {selected && (
        <aside className="drawer">
          <div className="drawerHeader">
            <div className={`badge type ${selected.type}`}>{typeLabel[selected.type]}</div>
            <button className="close" onClick={() => setSelected(null)}>✕</button>
          </div>

          {canEdit && editing === "title" ? (
            <input
              autoFocus
              className="editInput"
              value={selected.title}
              onChange={(e) => updateItem(selected.id, { title: e.target.value })}
              onBlur={() => setEditing(null)}
            />
          ) : (
            <h2 onClick={() => canEdit && setEditing("title")}>{selected.title}</h2>
          )}

          <div className="drawerMeta">
            <div>
              <strong>Priorité:</strong>{" "}
              <select disabled={!canEdit} value={selected.priority} onChange={(e) => updateItem(selected.id, { priority: e.target.value })}>
                <option value="high">Haute</option>
                <option value="med">Moyenne</option>
                <option value="low">Basse</option>
              </select>
            </div>
            <div>
              <strong>Assignée:</strong>{" "}
              {canEdit && editing === "assignee" ? (
                <input
                  autoFocus
                  className="editInput"
                  value={selected.assignee}
                  onChange={(e) => updateItem(selected.id, { assignee: e.target.value })}
                  onBlur={() => setEditing(null)}
                />
              ) : (
                <span onClick={() => canEdit && setEditing("assignee")}>{selected.assignee}</span>
              )}
            </div>
            <div><strong>Statut:</strong> {selected.status}</div>
          </div>

          {canEdit && editing === "description" ? (
            <textarea
              autoFocus
              className="editInput"
              value={selected.description}
              onChange={(e) => updateItem(selected.id, { description: e.target.value })}
              onBlur={() => setEditing(null)}
            />
          ) : (
            <p className="desc" onClick={() => canEdit && setEditing("description")}>{selected.description}</p>
          )}

          <div className="section">
            <div className="sectionTitle">Labels</div>
            <div className="labels">
              {selected.labels?.map((l, i) => (
                <span key={i} className="label">
                  {l} {canEdit && <button className="removeBtn" onClick={() => updateItem(selected.id, { labels: selected.labels.filter((_, idx) => idx !== i) })}>✕</button>}
                </span>
              ))}
            </div>
            {canEdit && (
              <div className="addField">
                <input
                  className="editInput"
                  placeholder="Nouveau label"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newLabel.trim()) {
                      updateItem(selected.id, { labels: [...(selected.labels || []), newLabel.trim()] });
                      setNewLabel("");
                    }
                  }}
                />
              </div>
            )}
          </div>

          <div className="section">
            <div className="sectionTitle">Checklist DoD</div>
            <ul>
              {selected.checklist?.map((c, i) => (
                <li key={i} className={c.done ? "done" : ""}>
                  <input
                    type="checkbox"
                    disabled={!can(role, "checklist:edit")}
                    checked={c.done}
                    onChange={(e) => {
                      const next = [...selected.checklist];
                      next[i] = { ...c, done: e.target.checked };
                      updateItem(selected.id, { checklist: next });
                    }}
                  />{" "}
                  {c.text}
                </li>
              ))}
            </ul>
          </div>

          <div className="section">
            <div className="sectionTitle">Commentaires</div>
            {selected.comments?.length ? (
              <ul>
                {selected.comments.map((c, i) => (
                  <li key={i}><strong>{c.author}</strong> — {c.text} <em>({c.at})</em></li>
                ))}
              </ul>
            ) : (
              <div className="empty">Aucun commentaire</div>
            )}
            {can(role, "comments:add") && (
              <div className="addField">
                <input
                  className="editInput"
                  placeholder="Auteur: commentaire"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newComment.trim()) {
                      const [author, ...rest] = newComment.split(":");
                      const comment = { author: (author || "Anon").trim(), text: rest.join(":").trim(), at: new Date().toISOString().split("T")[0] };
                      updateItem(selected.id, { comments: [...(selected.comments || []), comment] });
                      setNewComment("");
                    }
                  }}
                />
              </div>
            )}
          </div>

          <div className="section">
            <div className="sectionTitle">Liens / Dépendances</div>
            {selected.links?.length ? (
              <ul>{selected.links.map((l, i) => <li key={i}>{l}</li>)}</ul>
            ) : (
              <div className="empty">Aucune dépendance</div>
            )}
            {canEdit && (
              <div className="addField">
                <input
                  className="editInput"
                  placeholder="Ajouter un lien/dépendance"
                  value={newLink}
                  onChange={(e) => setNewLink(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newLink.trim()) {
                      updateItem(selected.id, { links: [...(selected.links || []), newLink.trim()] });
                      setNewLink("");
                    }
                  }}
                />
              </div>
            )}
          </div>

          <div className="section">
            <div className="sectionTitle">Dates</div>
            <div className="dates">
              <div>Création: {selected.dates?.created}</div>
              <div>
                Échéance:{" "}
                <input
                  type="date"
                  disabled={!can(role, "dates:edit")}
                  value={selected.dates?.due || ""}
                  onChange={(e) => updateItem(selected.id, { dates: { ...selected.dates, due: e.target.value } })}
                />
              </div>
              <div>Maj: {selected.dates?.updated}</div>
            </div>
          </div>

          <div className="section">
            <div className="sectionTitle">Pièces jointes</div>
            {selected.attachments?.length ? (
              <div className="attachments">
                {selected.attachments.map((a, i) => (
                  <div key={i} className="attachment">
                    {a.type === "image" ? <img src={a.url} alt={a.name} /> : <div className="fileIcon">📎</div>}
                    <div className="attMeta">
                      <div>{a.name}</div>
                      <a href={a.url} target="_blank" rel="noreferrer">Ouvrir</a>
                    </div>
                    {can(role, "attachments:edit") && (
                      <button className="removeBtn" onClick={() => updateItem(selected.id, { attachments: selected.attachments.filter((_, idx) => idx !== i) })}>✕</button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty">Aucune pièce jointe</div>
            )}
            {can(role, "attachments:edit") && (
              <div className="addField">
                <input
                  className="editInput"
                  placeholder="Nom du fichier"
                  value={newAttachmentName}
                  onChange={(e) => setNewAttachmentName(e.target.value)}
                />
                <input
                  className="editInput"
                  placeholder="URL du fichier"
                  value={newAttachmentUrl}
                  onChange={(e) => setNewAttachmentUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newAttachmentName.trim() && newAttachmentUrl.trim()) {
                      const isImg = /\.(png|jpg|jpeg|gif|webp)$/i.test(newAttachmentUrl) ? "image" : "file";
                      const att = { name: newAttachmentName.trim(), url: newAttachmentUrl.trim(), type: isImg };
                      updateItem(selected.id, { attachments: [...(selected.attachments || []), att] });
                      setNewAttachmentName("");
                      setNewAttachmentUrl("");
                    }
                  }}
                />
              </div>
            )}
          </div>

          <div className="checks">
            <label><input type="checkbox" disabled={!can(role, "qa:validate")} checked={selected.qa} onChange={(e) => updateItem(selected.id, { qa: e.target.checked })} /> QA validé</label>
            <label><input type="checkbox" disabled={!can(role, "rssi:validate")} checked={selected.rssi} onChange={(e) => updateItem(selected.id, { rssi: e.target.checked })} /> RSSI validé</label>
          </div>
        </aside>
      )}

      <style jsx>{`
        :global(body) { margin: 0; }
        .page {
          font-family: Inter, system-ui, sans-serif;
          padding: 24px;
          background: #0b0f14;
          min-height: 100vh;
          color: #e5e7eb;
        }
        .header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .header h1 { font-size: 24px; margin: 0; }
        .subtitle { opacity: 0.8; }
        .role { margin-left: auto; display:flex; gap:6px; align-items:center; }
        .board {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 16px;
        }
        .column {
          background: #111827;
          border: 1px solid #1f2937;
          border-radius: 12px;
          padding: 12px;
          min-height: 140px;
          transition: border-color 120ms ease, box-shadow 120ms ease;
        }
        .column.over {
          border-color: #3b82f6;
          box-shadow: 0 0 0 1px #3b82f6 inset;
        }
        .columnTitle { font-weight: 600; margin-bottom: 8px; }
        .cards { display: grid; gap: 8px; }
        .card {
          background: #0f172a;
          border: 1px solid #1f2937;
          border-radius: 10px;
          padding: 10px;
          cursor: grab;
          user-select: none;
          display: grid;
          gap: 6px;
        }
        .card.disabled { cursor: default; opacity: 0.8; }
        .title { font-weight: 600; }
        .meta { display: flex; justify-content: space-between; font-size: 12px; opacity: 0.85; }
        .badge {
          font-size: 11px;
          padding: 2px 6px;
          border-radius: 8px;
          background: #1f2937;
          width: fit-content;
        }
        .badge.type.epic { background: #4c1d95; }
        .badge.type.story { background: #1d4ed8; }
        .badge.type.task { background: #065f46; }
        .prio.high { color: #f87171; }
        .prio.med { color: #fbbf24; }
        .prio.low { color: #34d399; }
        .card:active { cursor: grabbing; }
        .drawer {
          position: fixed;
          right: 0; top: 0; height: 100%; width: 360px;
          background: #0f172a; border-left: 1px solid #1f2937;
          padding: 16px; display: grid; gap: 12px; overflow: auto;
        }
        .drawerHeader { display: flex; justify-content: space-between; align-items: center; }
        .close { background: transparent; color: #e5e7eb; border: 1px solid #1f2937; border-radius: 6px; padding: 4px 8px; }
        .drawerMeta { display: grid; gap: 4px; font-size: 13px; opacity: 0.9; }
        .desc { font-size: 13px; opacity: 0.9; }
        .labels { display: flex; gap: 6px; flex-wrap: wrap; }
        .label { font-size: 11px; padding: 2px 6px; background: #111827; border: 1px solid #1f2937; border-radius: 6px; display:flex; align-items:center; gap:4px; }
        .removeBtn { background: transparent; border: 1px solid #1f2937; color: #e5e7eb; border-radius: 4px; padding: 0 4px; }
        .checks { display: grid; gap: 6px; font-size: 13px; }
        .section { border-top: 1px solid #1f2937; padding-top: 10px; }
        .sectionTitle { font-weight: 600; margin-bottom: 6px; }
        .empty { opacity: 0.6; font-size: 12px; }
        ul { margin: 0; padding-left: 16px; font-size: 13px; }
        li.done { text-decoration: line-through; opacity: 0.8; }
        .dates { display: grid; gap: 4px; font-size: 13px; }
        .editInput { width: 100%; background: #0b1220; border: 1px solid #1f2937; color: #e5e7eb; border-radius: 6px; padding: 6px; }
        select { background: #0b1220; border: 1px solid #1f2937; color: #e5e7eb; border-radius: 6px; }
        .addField { display: grid; gap: 6px; margin-top: 6px; }
        .attachments { display: grid; gap: 8px; }
        .attachment { display:flex; gap:8px; align-items:center; border:1px solid #1f2937; border-radius:8px; padding:6px; }
        .attachment img { width:48px; height:48px; object-fit:cover; border-radius:6px; }
        .fileIcon { font-size:22px; }
        .attMeta { display:flex; flex-direction:column; gap:2px; font-size:12px; }
        @media (max-width: 640px) {
          .page { padding: 16px; }
          .board {
            display: flex;
            overflow-x: auto;
            gap: 12px;
            padding-bottom: 6px;
            scroll-snap-type: x mandatory;
          }
          .column {
            min-width: 260px;
            scroll-snap-align: start;
          }
          .header h1 { font-size: 20px; }
          .drawer { width: 100%; }
        }
      `}</style>
    </main>
  );
}
