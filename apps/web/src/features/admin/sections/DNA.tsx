"use client";

import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dna, Upload, Trash2, FileText, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { api, type Document } from "@/lib/api";

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
];

const ACCEPTED_EXTENSIONS = ".pdf,.doc,.docx,.txt,.md";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function statusBadge(status: Document["status"]) {
  if (status === "processed") {
    return <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 hover:bg-green-100">Processed</Badge>;
  }
  if (status === "processing") {
    return <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-100">Processing</Badge>;
  }
  if (status === "failed") {
    return <Badge variant="destructive" className="text-xs">Failed</Badge>;
  }
  return <Badge variant="secondary" className="text-xs">Uploaded</Badge>;
}

export function DNASection() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: () => api.documents.list(),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => api.documents.upload(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      setUploadError(null);
    },
    onError: (err: Error) => {
      setUploadError(err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.documents.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setUploadError("Unsupported file type. Please upload a PDF, Word document, or plain text file.");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setUploadError("File is too large. Maximum size is 20 MB.");
      return;
    }

    setUploadError(null);
    uploadMutation.mutate(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const documents = data?.documents ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">DNA</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Upload source documents to define your organization's learning DNA.
        </p>
      </div>

      {/* Upload area */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload document"
        className={[
          "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 transition-colors cursor-pointer",
          dragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30",
        ].join(" ")}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click(); }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {uploadMutation.isPending ? (
          <>
            <Spinner className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Uploading...</p>
          </>
        ) : (
          <>
            <Upload className="size-8 text-muted-foreground" />
            <div className="text-center">
              <p className="text-sm font-medium">Drop a file here or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">PDF, Word, TXT, Markdown — up to 20 MB</p>
            </div>
          </>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Upload error */}
      {uploadError && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {uploadError}
        </div>
      )}

      {/* Documents list */}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner className="size-6 text-muted-foreground" />
        </div>
      ) : documents.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 py-12">
          <Dna className="size-10 text-muted-foreground" />
          <CardContent className="p-0 text-center">
            <p className="text-sm font-medium text-muted-foreground">No documents uploaded yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Upload your first document to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3"
            >
              <FileText className="size-5 shrink-0 text-muted-foreground" />

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{doc.name}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(doc.sizeBytes)}</p>
              </div>

              {statusBadge(doc.status)}

              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground hover:text-destructive"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(doc.id)}
                aria-label={`Delete ${doc.name}`}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
