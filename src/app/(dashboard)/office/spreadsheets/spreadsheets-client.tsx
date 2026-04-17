"use client";

import { useState, useTransition, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  Table2,
  Loader2,
  MoreVertical,
  Trash2,
  Pencil,
  ArrowLeft,
  Save,
  PlusCircle,
  MinusCircle,
} from "lucide-react";
import {
  createSpreadsheet,
  updateSpreadsheet,
  deleteSpreadsheet,
} from "@/lib/actions/office";
import { toast } from "sonner";

type SheetData = {
  name: string;
  data: string[][];
  columns: string[];
};

type Spreadsheet = {
  id: string;
  title: string;
  sheets: unknown;
  sharedWith: unknown;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: { id: string; name: string | null; email: string | null };
};

type Props = {
  initialSheets: Spreadsheet[];
};

function getColumnLabel(index: number): string {
  let label = "";
  let n = index;
  while (n >= 0) {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  }
  return label;
}

export function SpreadsheetsClient({ initialSheets }: Props) {
  const [sheets, setSheets] = useState(initialSheets);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  // Editor state
  const [editing, setEditing] = useState<Spreadsheet | null>(null);
  const [sheetData, setSheetData] = useState<SheetData[]>([]);
  const [activeSheetIdx, setActiveSheetIdx] = useState(0);
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [cellValue, setCellValue] = useState("");
  const [editorTitle, setEditorTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Auto-save timer
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const filteredSheets = sheets.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase())
  );

  function handleCreate() {
    if (!newTitle.trim()) return;
    startTransition(async () => {
      try {
        const sheet = await createSpreadsheet({ title: newTitle });
        setSheets((prev) => [
          { ...sheet, createdBy: { id: sheet.createdById, name: "You", email: null } } as Spreadsheet,
          ...prev,
        ]);
        setCreateOpen(false);
        setNewTitle("");
        toast.success("Spreadsheet created");
      } catch {
        toast.error("Failed to create spreadsheet");
      }
    });
  }

  function openEditor(spreadsheet: Spreadsheet) {
    setEditing(spreadsheet);
    setEditorTitle(spreadsheet.title);
    const parsed = spreadsheet.sheets as SheetData[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Ensure each sheet has at least 20 rows and 10 columns
      const normalized = parsed.map((s) => {
        const rows = Math.max(s.data?.length ?? 0, 20);
        const cols = Math.max(s.columns?.length ?? 0, 10);
        const data = Array.from({ length: rows }, (_, r) =>
          Array.from({ length: cols }, (_, c) => s.data?.[r]?.[c] ?? "")
        );
        const columns = Array.from({ length: cols }, (_, i) =>
          s.columns?.[i] ?? getColumnLabel(i)
        );
        return { name: s.name ?? `Sheet${parsed.indexOf(s) + 1}`, data, columns };
      });
      setSheetData(normalized);
    } else {
      setSheetData([
        {
          name: "Sheet1",
          data: Array.from({ length: 20 }, () => Array.from({ length: 10 }, () => "")),
          columns: Array.from({ length: 10 }, (_, i) => getColumnLabel(i)),
        },
      ]);
    }
    setActiveSheetIdx(0);
  }

  function updateCellValue(row: number, col: number, value: string) {
    setSheetData((prev) => {
      const updated = [...prev];
      const sheet = { ...updated[activeSheetIdx] };
      const data = sheet.data.map((r) => [...r]);
      data[row][col] = value;
      sheet.data = data;
      updated[activeSheetIdx] = sheet;
      return updated;
    });

    // Debounced auto-save
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      autoSave();
    }, 2000);
  }

  const autoSave = useCallback(() => {
    if (!editing) return;
    startTransition(async () => {
      try {
        await updateSpreadsheet(editing.id, { sheets: sheetData });
      } catch {
        // Silent fail for auto-save
      }
    });
  }, [editing, sheetData]);

  function handleSave() {
    if (!editing) return;
    setIsSaving(true);
    startTransition(async () => {
      try {
        await updateSpreadsheet(editing.id, { title: editorTitle, sheets: sheetData });
        setSheets((prev) =>
          prev.map((s) => (s.id === editing.id ? { ...s, title: editorTitle } : s))
        );
        toast.success("Spreadsheet saved");
      } catch {
        toast.error("Failed to save");
      } finally {
        setIsSaving(false);
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteSpreadsheet(id);
        setSheets((prev) => prev.filter((s) => s.id !== id));
        if (editing?.id === id) setEditing(null);
        toast.success("Spreadsheet deleted");
      } catch {
        toast.error("Failed to delete spreadsheet");
      }
    });
  }

  function addRow() {
    setSheetData((prev) => {
      const updated = [...prev];
      const sheet = { ...updated[activeSheetIdx] };
      const cols = sheet.columns.length;
      sheet.data = [...sheet.data, Array.from({ length: cols }, () => "")];
      updated[activeSheetIdx] = sheet;
      return updated;
    });
  }

  function addColumn() {
    setSheetData((prev) => {
      const updated = [...prev];
      const sheet = { ...updated[activeSheetIdx] };
      const newColIdx = sheet.columns.length;
      sheet.columns = [...sheet.columns, getColumnLabel(newColIdx)];
      sheet.data = sheet.data.map((row) => [...row, ""]);
      updated[activeSheetIdx] = sheet;
      return updated;
    });
  }

  function removeLastRow() {
    setSheetData((prev) => {
      const updated = [...prev];
      const sheet = { ...updated[activeSheetIdx] };
      if (sheet.data.length <= 1) return prev;
      sheet.data = sheet.data.slice(0, -1);
      updated[activeSheetIdx] = sheet;
      return updated;
    });
  }

  function removeLastColumn() {
    setSheetData((prev) => {
      const updated = [...prev];
      const sheet = { ...updated[activeSheetIdx] };
      if (sheet.columns.length <= 1) return prev;
      sheet.columns = sheet.columns.slice(0, -1);
      sheet.data = sheet.data.map((row) => row.slice(0, -1));
      updated[activeSheetIdx] = sheet;
      return updated;
    });
  }

  function addSheet() {
    const newName = `Sheet${sheetData.length + 1}`;
    setSheetData((prev) => [
      ...prev,
      {
        name: newName,
        data: Array.from({ length: 20 }, () => Array.from({ length: 10 }, () => "")),
        columns: Array.from({ length: 10 }, (_, i) => getColumnLabel(i)),
      },
    ]);
    setActiveSheetIdx(sheetData.length);
  }

  function renameSheet(idx: number) {
    const name = prompt("Sheet name:", sheetData[idx].name);
    if (!name) return;
    setSheetData((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], name };
      return updated;
    });
  }

  const activeSheet = sheetData[activeSheetIdx];

  // Editor view
  if (editing && activeSheet) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <div className="flex items-center gap-3 p-3 border-b bg-background shrink-0">
          <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <Input
            value={editorTitle}
            onChange={(e) => setEditorTitle(e.target.value)}
            className="max-w-md font-semibold"
          />
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={addRow} title="Add row">
              <PlusCircle className="h-4 w-4 mr-1" /> Row
            </Button>
            <Button variant="outline" size="sm" onClick={addColumn} title="Add column">
              <PlusCircle className="h-4 w-4 mr-1" /> Column
            </Button>
            <Button variant="outline" size="sm" onClick={removeLastRow} title="Remove last row">
              <MinusCircle className="h-4 w-4 mr-1" /> Row
            </Button>
            <Button variant="outline" size="sm" onClick={removeLastColumn} title="Remove last column">
              <MinusCircle className="h-4 w-4 mr-1" /> Col
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Save
            </Button>
          </div>
        </div>

        {/* Spreadsheet grid */}
        <div className="flex-1 overflow-auto">
          <table className="border-collapse w-full">
            <thead className="sticky top-0 z-10">
              <tr className="bg-muted">
                <th className="border border-border p-1 w-12 text-center text-xs font-medium text-muted-foreground bg-muted sticky left-0 z-20">
                  #
                </th>
                {activeSheet.columns.map((col, ci) => (
                  <th
                    key={ci}
                    className="border border-border p-1 min-w-[100px] text-center text-xs font-medium text-muted-foreground bg-muted"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeSheet.data.map((row, ri) => (
                <tr key={ri} className="hover:bg-muted/30">
                  <td className="border border-border p-1 text-center text-xs text-muted-foreground bg-muted sticky left-0">
                    {ri + 1}
                  </td>
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className="border border-border p-0 relative"
                      onClick={() => {
                        setEditingCell({ row: ri, col: ci });
                        setCellValue(cell);
                      }}
                    >
                      {editingCell?.row === ri && editingCell?.col === ci ? (
                        <input
                          autoFocus
                          value={cellValue}
                          onChange={(e) => setCellValue(e.target.value)}
                          onBlur={() => {
                            updateCellValue(ri, ci, cellValue);
                            setEditingCell(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              updateCellValue(ri, ci, cellValue);
                              // Move to next row
                              if (ri < activeSheet.data.length - 1) {
                                setEditingCell({ row: ri + 1, col: ci });
                                setCellValue(activeSheet.data[ri + 1][ci]);
                              } else {
                                setEditingCell(null);
                              }
                            }
                            if (e.key === "Tab") {
                              e.preventDefault();
                              updateCellValue(ri, ci, cellValue);
                              if (ci < activeSheet.columns.length - 1) {
                                setEditingCell({ row: ri, col: ci + 1 });
                                setCellValue(activeSheet.data[ri][ci + 1]);
                              } else {
                                setEditingCell(null);
                              }
                            }
                            if (e.key === "Escape") {
                              setEditingCell(null);
                            }
                          }}
                          className="w-full h-full px-2 py-1 text-sm border-2 border-blue-500 outline-none bg-white absolute inset-0"
                        />
                      ) : (
                        <div className="px-2 py-1 text-sm min-h-[28px] truncate">
                          {cell}
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Sheet tabs */}
        <div className="flex items-center gap-1 p-2 border-t bg-muted/50 shrink-0">
          {sheetData.map((s, idx) => (
            <button
              key={idx}
              onClick={() => setActiveSheetIdx(idx)}
              onDoubleClick={() => renameSheet(idx)}
              className={`px-3 py-1 text-sm rounded-t border border-b-0 ${
                idx === activeSheetIdx
                  ? "bg-background font-medium border-border"
                  : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
              }`}
            >
              {s.name}
            </button>
          ))}
          <button
            onClick={addSheet}
            className="px-2 py-1 text-sm text-muted-foreground hover:text-foreground"
            title="Add sheet"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Spreadsheets</h1>
          <p className="text-muted-foreground">Create and edit spreadsheets</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" /> New Spreadsheet
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Spreadsheet</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Spreadsheet title"
                />
              </div>
              <div className="flex justify-end gap-2">
                <DialogClose className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
                  Cancel
                </DialogClose>
                <Button onClick={handleCreate} disabled={isPending || !newTitle.trim()}>
                  {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Create
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search spreadsheets..."
          className="pl-9"
        />
      </div>

      {filteredSheets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Table2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No spreadsheets found</h3>
            <p className="text-muted-foreground text-sm mt-1">
              {search ? "Try a different search term" : "Create your first spreadsheet to get started"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSheets.map((sheet) => (
            <Card
              key={sheet.id}
              className="hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => openEditor(sheet)}
            >
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="flex items-center gap-2">
                  <Table2 className="h-5 w-5 text-green-600" />
                  <CardTitle className="text-base truncate">{sheet.title}</CardTitle>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 inline-flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditor(sheet);
                      }}
                    >
                      <Pencil className="h-4 w-4 mr-2" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(sheet.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {(sheet.sheets as SheetData[])?.length ?? 1} sheet(s) &middot; By{" "}
                  {sheet.createdBy.name ?? sheet.createdBy.email} &middot;{" "}
                  {new Date(sheet.updatedAt).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
