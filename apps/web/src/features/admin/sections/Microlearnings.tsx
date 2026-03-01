"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  ListOrdered,
  X,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { Separator } from "@/components/ui/separator";
import {
  api,
  type Microlearning,
  type MicrolearningSequence,
  type DnaTopic,
  type ConversationPattern,
  type Avatar,
} from "@/lib/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function topicName(topicId: string | null, topics: DnaTopic[]): string {
  if (!topicId) return "—";
  return topics.find((t) => t.id === topicId)?.name ?? "—";
}

function patternName(patternId: string | null, patterns: ConversationPattern[]): string {
  if (!patternId) return "—";
  return patterns.find((p) => p.id === patternId)?.name ?? "—";
}

function subtopicNames(ids: string[] | null, topics: DnaTopic[]): string {
  if (!ids || ids.length === 0) return "—";
  const all = topics.flatMap((t) => t.subtopics);
  const names = ids.map((id) => all.find((s) => s.id === id)?.name).filter(Boolean);
  return names.length > 0 ? names.join(", ") : "—";
}

// ─── Styled select ────────────────────────────────────────────────────────────

function Select({
  value,
  onChange,
  children,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
    >
      {placeholder && <option value="">{placeholder}</option>}
      {children}
    </select>
  );
}

// ─── Microlearning form ───────────────────────────────────────────────────────

interface MlFormValues {
  title: string;
  topicId: string;
  subtopicIds: string[];
  patternId: string;
  avatarId: string;
  sequenceId: string;
}

interface MlFormProps {
  initial?: Partial<MlFormValues>;
  topics: DnaTopic[];
  patterns: ConversationPattern[];
  avatars: Avatar[];
  sequences: MicrolearningSequence[];
  onSave: (values: MlFormValues) => void;
  onCancel: () => void;
  isLoading: boolean;
  submitLabel?: string;
}

function MlForm({
  initial = {},
  topics,
  patterns,
  avatars,
  sequences,
  onSave,
  onCancel,
  isLoading,
  submitLabel = "Save",
}: MlFormProps) {
  const [title, setTitle] = useState(initial.title ?? "");
  const [topicId, setTopicId] = useState(initial.topicId ?? "");
  const [subtopicIds, setSubtopicIds] = useState<string[]>(initial.subtopicIds ?? []);
  const [patternId, setPatternId] = useState(initial.patternId ?? "");
  const [avatarId, setAvatarId] = useState(initial.avatarId ?? "");
  const [sequenceId, setSequenceId] = useState(initial.sequenceId ?? "");

  const selectedTopic = topics.find((t) => t.id === topicId);

  function handleTopicChange(id: string) {
    setTopicId(id);
    setSubtopicIds([]);
  }

  function toggleSubtopic(id: string) {
    setSubtopicIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  const valid = title.trim().length > 0;

  return (
    <div className="flex flex-col gap-3 p-4 border rounded-lg bg-muted/30">
      <Input
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
      />

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">Topic</label>
          <Select value={topicId} onChange={handleTopicChange} placeholder="No topic">
            {topics.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">Pattern</label>
          <Select value={patternId} onChange={setPatternId} placeholder="No pattern">
            {patterns.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>
        </div>
      </div>

      {selectedTopic && selectedTopic.subtopics.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">Subtopics</label>
          <div className="flex flex-wrap gap-2 p-3 border rounded-md bg-background">
            {selectedTopic.subtopics.map((s) => (
              <label key={s.id} className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={subtopicIds.includes(s.id)}
                  onChange={() => toggleSubtopic(s.id)}
                  className="rounded border-input"
                />
                <span className="text-sm">{s.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">Avatar</label>
          <Select value={avatarId} onChange={setAvatarId} placeholder="No avatar">
            {avatars.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">Sequence</label>
          <Select value={sequenceId} onChange={setSequenceId} placeholder="No sequence">
            {sequences.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={!valid || isLoading}
          onClick={() =>
            onSave({ title, topicId, subtopicIds, patternId, avatarId, sequenceId })
          }
        >
          {isLoading ? <Spinner className="size-3 mr-1" /> : null}
          {submitLabel}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ─── Microlearning card ───────────────────────────────────────────────────────

interface MlCardProps {
  ml: Microlearning;
  topics: DnaTopic[];
  patterns: ConversationPattern[];
  avatars: Avatar[];
  sequences: MicrolearningSequence[];
}

function MlCard({ ml, topics, patterns, avatars, sequences }: MlCardProps) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const updateMutation = useMutation({
    mutationFn: (values: {
      title: string;
      topicId: string;
      subtopicIds: string[];
      patternId: string;
      avatarId: string;
      sequenceId: string;
    }) =>
      api.microlearnings.update(ml.id, {
        title: values.title,
        topicId: values.topicId || null,
        subtopicIds: values.subtopicIds,
        patternId: values.patternId || null,
        avatarId: values.avatarId || null,
        sequenceId: values.sequenceId || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["microlearnings"] });
      queryClient.invalidateQueries({ queryKey: ["ml-sequences"] });
      setEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.microlearnings.delete(ml.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["microlearnings"] });
      queryClient.invalidateQueries({ queryKey: ["ml-sequences"] });
    },
  });

  if (editing) {
    return (
      <MlForm
        initial={{
          title: ml.title,
          topicId: ml.topicId ?? "",
          subtopicIds: ml.subtopicIds ?? [],
          patternId: ml.patternId ?? "",
          avatarId: ml.avatarId ?? "",
          sequenceId: ml.sequenceId ?? "",
        }}
        topics={topics}
        patterns={patterns}
        avatars={avatars}
        sequences={sequences}
        onSave={(values) => updateMutation.mutate(values)}
        onCancel={() => setEditing(false)}
        isLoading={updateMutation.isPending}
        submitLabel="Update"
      />
    );
  }

  return (
    <Card className="group">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0 space-y-1">
            <p className="font-medium leading-none">{ml.title}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
              <span>Topic: {topicName(ml.topicId, topics)}</span>
              <span>Subtopics: {subtopicNames(ml.subtopicIds, topics)}</span>
              <span>Pattern: {patternName(ml.patternId, patterns)}</span>
              <span>Avatar: {ml.avatarId ? (avatars.find((a) => a.id === ml.avatarId)?.name ?? "—") : "—"}</span>
              {ml.sequenceId && (
                <span>Sequence: {sequences.find((s) => s.id === ml.sequenceId)?.name ?? "—"}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => setEditing(true)}
              aria-label="Edit microlearning"
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
              aria-label="Delete microlearning"
            >
              {deleteMutation.isPending ? (
                <Spinner className="size-3.5" />
              ) : (
                <Trash2 className="size-3.5" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Sequence editor (drag-and-drop reorder) ──────────────────────────────────

interface SequenceEditorProps {
  sequence: MicrolearningSequence;
  allMicrolearnings: Microlearning[];
  topics: DnaTopic[];
  patterns: ConversationPattern[];
}

function SequenceEditor({ sequence, allMicrolearnings, topics, patterns }: SequenceEditorProps) {
  const queryClient = useQueryClient();
  const [items, setItems] = useState<Microlearning[]>(sequence.microlearnings);
  const [showAddPicker, setShowAddPicker] = useState(false);
  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Keep items in sync when sequence changes externally
  const seqMlIds = sequence.microlearnings.map((m) => m.id).join(",");
  const prevSeqMlIdsRef = useRef(seqMlIds);
  if (prevSeqMlIdsRef.current !== seqMlIds) {
    prevSeqMlIdsRef.current = seqMlIds;
    setItems(sequence.microlearnings);
  }

  const reorderMutation = useMutation({
    mutationFn: (ids: string[]) =>
      api.microlearnings.reorderSequence(sequence.id, ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ml-sequences"] });
      queryClient.invalidateQueries({ queryKey: ["microlearnings"] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (mlId: string) =>
      api.microlearnings.update(mlId, { sequenceId: null, position: null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ml-sequences"] });
      queryClient.invalidateQueries({ queryKey: ["microlearnings"] });
    },
  });

  const addMutation = useMutation({
    mutationFn: (mlId: string) =>
      api.microlearnings.update(mlId, {
        sequenceId: sequence.id,
        position: items.length,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ml-sequences"] });
      queryClient.invalidateQueries({ queryKey: ["microlearnings"] });
      setShowAddPicker(false);
    },
  });

  function handleDragStart(index: number) {
    dragIndexRef.current = index;
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    setDragOverIndex(index);
  }

  function handleDrop(index: number) {
    const from = dragIndexRef.current;
    if (from === null || from === index) {
      dragIndexRef.current = null;
      setDragOverIndex(null);
      return;
    }

    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(index, 0, moved);
    setItems(next);
    dragIndexRef.current = null;
    setDragOverIndex(null);
    reorderMutation.mutate(next.map((m) => m.id));
  }

  function handleDragEnd() {
    dragIndexRef.current = null;
    setDragOverIndex(null);
  }

  const assignedIds = new Set(items.map((m) => m.id));
  const unassigned = allMicrolearnings.filter((m) => !assignedIds.has(m.id));

  return (
    <div className="space-y-2 pt-1">
      {items.length === 0 && !showAddPicker && (
        <p className="text-sm text-muted-foreground py-2">
          No microlearnings in this sequence yet.
        </p>
      )}

      {items.map((ml, index) => (
        <div
          key={ml.id}
          draggable
          onDragStart={() => handleDragStart(index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDrop={() => handleDrop(index)}
          onDragEnd={handleDragEnd}
          className={[
            "flex items-center gap-2 rounded-md border bg-card px-3 py-2.5 cursor-grab active:cursor-grabbing transition-colors",
            dragOverIndex === index && dragIndexRef.current !== index
              ? "border-primary bg-primary/5"
              : "",
          ].join(" ")}
        >
          <GripVertical className="size-4 shrink-0 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{ml.title}</p>
            <p className="text-xs text-muted-foreground truncate">
              {topicName(ml.topicId, topics)}
              {ml.subtopicIds && ml.subtopicIds.length > 0
                ? ` · ${subtopicNames(ml.subtopicIds, topics)}`
                : ""}
            </p>
          </div>
          <Badge variant="secondary" className="text-xs shrink-0">
            #{index + 1}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
            disabled={removeMutation.isPending}
            onClick={() => removeMutation.mutate(ml.id)}
            aria-label={`Remove ${ml.title} from sequence`}
          >
            <X className="size-3.5" />
          </Button>
        </div>
      ))}

      {showAddPicker ? (
        <div className="flex flex-col gap-2 p-3 border rounded-lg bg-muted/30">
          {unassigned.length === 0 ? (
            <p className="text-sm text-muted-foreground">All microlearnings are already in this sequence.</p>
          ) : (
            <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
              {unassigned.map((ml) => (
                <button
                  key={ml.id}
                  onClick={() => addMutation.mutate(ml.id)}
                  disabled={addMutation.isPending}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
                >
                  <span className="font-medium">{ml.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {topicName(ml.topicId, topics)}
                  </span>
                </button>
              ))}
            </div>
          )}
          <Button size="sm" variant="ghost" onClick={() => setShowAddPicker(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => setShowAddPicker(true)}
          disabled={unassigned.length === 0}
        >
          <Plus className="size-3 mr-1" />
          Add microlearning
        </Button>
      )}

      {reorderMutation.isPending && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Spinner className="size-3" /> Saving order...
        </p>
      )}
    </div>
  );
}

// ─── Sequence card ────────────────────────────────────────────────────────────

interface SequenceCardProps {
  sequence: MicrolearningSequence;
  allMicrolearnings: Microlearning[];
  topics: DnaTopic[];
  patterns: ConversationPattern[];
}

function SequenceCard({ sequence, allMicrolearnings, topics, patterns }: SequenceCardProps) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(sequence.name);
  const [editDescription, setEditDescription] = useState(sequence.description ?? "");

  const updateMutation = useMutation({
    mutationFn: () =>
      api.microlearnings.updateSequence(sequence.id, {
        name: editName,
        description: editDescription,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ml-sequences"] });
      setEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.microlearnings.deleteSequence(sequence.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ml-sequences"] }),
  });

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start gap-2">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="shrink-0 mt-0.5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </button>

          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="flex flex-col gap-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Sequence name"
                  autoFocus
                />
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Description (optional)"
                  rows={2}
                  className="resize-none text-sm"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={!editName.trim() || updateMutation.isPending}
                    onClick={() => updateMutation.mutate()}
                  >
                    {updateMutation.isPending ? <Spinner className="size-3 mr-1" /> : null}
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div
                className="cursor-pointer"
                onClick={() => setExpanded((v) => !v)}
              >
                <div className="flex items-center gap-2">
                  <p className="font-medium leading-none">{sequence.name}</p>
                  <Badge variant="secondary" className="text-xs">
                    {sequence.microlearnings.length} ML{sequence.microlearnings.length !== 1 ? "s" : ""}
                  </Badge>
                </div>
                {sequence.description && (
                  <p className="text-sm text-muted-foreground mt-1">{sequence.description}</p>
                )}
              </div>
            )}

            {expanded && !editing && (
              <SequenceEditor
                sequence={sequence}
                allMicrolearnings={allMicrolearnings}
                topics={topics}
                patterns={patterns}
              />
            )}
          </div>

          {!editing && (
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground"
                onClick={() => {
                  setEditName(sequence.name);
                  setEditDescription(sequence.description ?? "");
                  setEditing(true);
                }}
                aria-label="Edit sequence"
              >
                <Pencil className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-destructive"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate()}
                aria-label="Delete sequence"
              >
                {deleteMutation.isPending ? (
                  <Spinner className="size-3.5" />
                ) : (
                  <Trash2 className="size-3.5" />
                )}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Sequence form ────────────────────────────────────────────────────────────

interface SequenceFormProps {
  onSave: (values: { name: string; description: string }) => void;
  onCancel: () => void;
  isLoading: boolean;
}

function SequenceForm({ onSave, onCancel, isLoading }: SequenceFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  return (
    <div className="flex flex-col gap-3 p-4 border rounded-lg bg-muted/30">
      <Input
        placeholder="Sequence name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
      />
      <Textarea
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        className="resize-none text-sm"
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={!name.trim() || isLoading}
          onClick={() => onSave({ name, description })}
        >
          {isLoading ? <Spinner className="size-3 mr-1" /> : null}
          Create Sequence
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ─── Main section ─────────────────────────────────────────────────────────────

type Tab = "microlearnings" | "sequences";

export function MicrolearningsSection() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("microlearnings");
  const [creatingMl, setCreatingMl] = useState(false);
  const [creatingSeq, setCreatingSeq] = useState(false);

  const mlQuery = useQuery({
    queryKey: ["microlearnings"],
    queryFn: () => api.microlearnings.list(),
  });

  const seqQuery = useQuery({
    queryKey: ["ml-sequences"],
    queryFn: () => api.microlearnings.listSequences(),
  });

  const dnaQuery = useQuery({
    queryKey: ["dna"],
    queryFn: () => api.dna.list(),
  });

  const patternsQuery = useQuery({
    queryKey: ["patterns"],
    queryFn: () => api.patterns.list(),
  });

  const avatarsQuery = useQuery({
    queryKey: ["avatars"],
    queryFn: () => api.avatars.list(),
  });

  const createMlMutation = useMutation({
    mutationFn: (values: {
      title: string;
      topicId: string;
      subtopicIds: string[];
      patternId: string;
      avatarId: string;
      sequenceId: string;
    }) =>
      api.microlearnings.create({
        title: values.title,
        topicId: values.topicId || null,
        subtopicIds: values.subtopicIds,
        patternId: values.patternId || null,
        avatarId: values.avatarId || null,
        sequenceId: values.sequenceId || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["microlearnings"] });
      queryClient.invalidateQueries({ queryKey: ["ml-sequences"] });
      setCreatingMl(false);
    },
  });

  const createSeqMutation = useMutation({
    mutationFn: (values: { name: string; description: string }) =>
      api.microlearnings.createSequence(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ml-sequences"] });
      setCreatingSeq(false);
    },
  });

  const mls = mlQuery.data?.microlearnings ?? [];
  const sequences = seqQuery.data?.sequences ?? [];
  const topics = dnaQuery.data?.topics ?? [];
  const patterns = patternsQuery.data?.patterns ?? [];
  const avatars = avatarsQuery.data?.avatars ?? [];

  const isLoadingMl = mlQuery.isLoading || dnaQuery.isLoading || patternsQuery.isLoading || avatarsQuery.isLoading;
  const isLoadingSeq = seqQuery.isLoading || dnaQuery.isLoading || patternsQuery.isLoading || avatarsQuery.isLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Microlearnings</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Create bite-sized lessons and organize them into sequences.
          </p>
        </div>
        {tab === "microlearnings" && !creatingMl && (
          <Button size="sm" onClick={() => setCreatingMl(true)}>
            <Plus className="size-4 mr-1" />
            New Microlearning
          </Button>
        )}
        {tab === "sequences" && !creatingSeq && (
          <Button size="sm" onClick={() => setCreatingSeq(true)}>
            <Plus className="size-4 mr-1" />
            New Sequence
          </Button>
        )}
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        <button
          onClick={() => setTab("microlearnings")}
          className={[
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
            tab === "microlearnings"
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground",
          ].join(" ")}
        >
          <BookOpen className="size-3.5" />
          Microlearnings
          {mls.length > 0 && (
            <Badge variant="secondary" className="text-xs ml-1 h-4 px-1">
              {mls.length}
            </Badge>
          )}
        </button>
        <button
          onClick={() => setTab("sequences")}
          className={[
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
            tab === "sequences"
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground",
          ].join(" ")}
        >
          <ListOrdered className="size-3.5" />
          Sequences
          {sequences.length > 0 && (
            <Badge variant="secondary" className="text-xs ml-1 h-4 px-1">
              {sequences.length}
            </Badge>
          )}
        </button>
      </div>

      <Separator />

      {/* Microlearnings tab */}
      {tab === "microlearnings" && (
        <div className="space-y-3">
          {creatingMl && (
            <MlForm
              topics={topics}
              patterns={patterns}
              avatars={avatars}
              sequences={sequences}
              onSave={(values) => createMlMutation.mutate(values)}
              onCancel={() => setCreatingMl(false)}
              isLoading={createMlMutation.isPending}
              submitLabel="Create Microlearning"
            />
          )}

          {isLoadingMl && (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          )}

          {!isLoadingMl && mls.length === 0 && !creatingMl && (
            <Card className="min-h-64 flex flex-col items-center justify-center gap-3">
              <BookOpen className="size-10 text-muted-foreground" />
              <CardContent className="p-0 text-center">
                <p className="text-sm font-medium text-muted-foreground">No microlearnings yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Create your first microlearning to get started.
                </p>
                <Button size="sm" className="mt-4" onClick={() => setCreatingMl(true)}>
                  <Plus className="size-3 mr-1" />
                  New Microlearning
                </Button>
              </CardContent>
            </Card>
          )}

          {!isLoadingMl && mls.length > 0 && (
            <div className="space-y-2">
              {mls.map((ml) => (
                <MlCard
                  key={ml.id}
                  ml={ml}
                  topics={topics}
                  patterns={patterns}
                  avatars={avatars}
                  sequences={sequences}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sequences tab */}
      {tab === "sequences" && (
        <div className="space-y-3">
          {creatingSeq && (
            <SequenceForm
              onSave={(values) => createSeqMutation.mutate(values)}
              onCancel={() => setCreatingSeq(false)}
              isLoading={createSeqMutation.isPending}
            />
          )}

          {isLoadingSeq && (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          )}

          {!isLoadingSeq && sequences.length === 0 && !creatingSeq && (
            <Card className="min-h-64 flex flex-col items-center justify-center gap-3">
              <ListOrdered className="size-10 text-muted-foreground" />
              <CardContent className="p-0 text-center">
                <p className="text-sm font-medium text-muted-foreground">No sequences yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Group microlearnings into ordered sequences.
                </p>
                <Button size="sm" className="mt-4" onClick={() => setCreatingSeq(true)}>
                  <Plus className="size-3 mr-1" />
                  New Sequence
                </Button>
              </CardContent>
            </Card>
          )}

          {!isLoadingSeq && sequences.length > 0 && (
            <div className="space-y-2">
              {sequences.map((seq) => (
                <SequenceCard
                  key={seq.id}
                  sequence={seq}
                  allMicrolearnings={mls}
                  topics={topics}
                  patterns={patterns}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
