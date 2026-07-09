"use client";
import { useState, useRef } from "react";
import { Upload, FileText, X, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api-client";
import {
  LEVELS,
  SUBJECTS,
  PAPER_TYPES,
  type User,
} from "@/lib/types";
import { useExamHub } from "../store";
import { toast } from "sonner";

export function UploadPaper({ user }: { user: User }) {
  const setTab = useExamHub((s) => s.setTab);
  const bump = useExamHub((s) => s.bump);
  const fileInput = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [level, setLevel] = useState("");
  const [year, setYear] = useState<string>(String(new Date().getFullYear()));
  const [type, setType] = useState("necta");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const onPick = (f: File | null) => {
    setFile(f);
    if (f && !title) {
      setTitle(f.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "));
    }
  };

  const submit = async () => {
    if (!title || !subject || !level || !year) {
      toast.error("Please fill in title, subject, level and year");
      return;
    }
    setSaving(true);
    try {
      await api.createPaper({
        title,
        subject,
        level,
        year: Number(year),
        type,
        description: description || undefined,
        fileName: file?.name,
        fileSize: file ? file.size : undefined,
      });
      setDone(true);
      bump();
      toast.success("Paper uploaded as draft — publish it from the Library to make it visible to students");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <div>
            <p className="font-semibold text-lg">Paper uploaded</p>
            <p className="text-sm text-muted-foreground max-w-md mt-1">
              &ldquo;{title}&rdquo; was saved as a <span className="font-medium">draft</span>. Publish it from the
              Papers Library so students can see it, or build an exam from it now.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setDone(false); reset(); }}>Upload another</Button>
            <Button onClick={() => setTab("library")}>Go to Library</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Upload className="h-6 w-6 text-primary" /> Upload a Paper
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          New papers are saved as drafts. Publish them from the Library when ready.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Paper details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File dropzone (simulated upload — stored as metadata only) */}
          <div>
            <Label>PDF / Document</Label>
            <div
              onClick={() => fileInput.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                onPick(e.dataTransfer.files?.[0] ?? null);
              }}
              className="mt-1.5 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 px-4 py-8 text-center hover:border-primary/50 hover:bg-muted/50 transition-colors"
            >
              {file ? (
                <div className="flex w-full items-center justify-between rounded-md bg-card px-3 py-2 border">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm truncate">{file.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">({(file.size / 1024).toFixed(0)} KB)</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onPick(null); }}
                    className="rounded p-1 hover:bg-accent"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Upload className="h-5 w-5" />
                  </div>
                  <div className="text-sm">
                    <span className="font-medium text-primary">Click to upload</span> or drag &amp; drop
                  </div>
                  <p className="text-xs text-muted-foreground">PDF, DOCX up to 25MB</p>
                </>
              )}
              <input
                ref={fileInput}
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={(e) => onPick(e.target.files?.[0] ?? null)}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Demo note: the file itself isn&apos;t stored, only its name &amp; size metadata.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Biology CSEE 2023 Paper 1" />
            </div>
            <div>
              <Label>Subject *</Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger><SelectValue placeholder="Choose subject" /></SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Level *</Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger><SelectValue placeholder="Choose level" /></SelectTrigger>
                <SelectContent>
                  {LEVELS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="year">Year *</Label>
              <Input id="year" type="number" value={year} onChange={(e) => setYear(e.target.value)} />
            </div>
            <div>
              <Label>Paper type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAPER_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="desc">Description</Label>
              <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Optional notes for students / reviewers" />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setTab("library")}>Cancel</Button>
            <Button onClick={submit} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Save as draft
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  function reset() {
    setTitle(""); setSubject(""); setLevel(""); setYear(String(new Date().getFullYear()));
    setType("necta"); setDescription(""); setFile(null);
  }
}
