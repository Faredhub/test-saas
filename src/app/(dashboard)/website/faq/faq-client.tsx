"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Pencil,
  Trash2,
  HelpCircle,
  Search,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  createFAQItem,
  updateFAQItem,
  deleteFAQItem,
  reorderFAQItems,
} from "@/lib/actions/website";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FAQItemType = any;

const FAQ_CATEGORIES = [
  "general",
  "billing",
  "technical",
  "shipping",
  "returns",
  "account",
];

export function FAQClient({ initialItems }: { initialItems: FAQItemType[] }) {
  const [items, setItems] = useState<FAQItemType[]>(initialItems);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FAQItemType | null>(null);
  const [pending, startTransition] = useTransition();

  // Form state
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [category, setCategory] = useState("general");
  const [isPublished, setIsPublished] = useState(true);

  const filtered = items.filter((item: FAQItemType) => {
    const matchSearch =
      item.question.toLowerCase().includes(search.toLowerCase()) ||
      item.answer.toLowerCase().includes(search.toLowerCase());
    const matchCategory =
      categoryFilter === "ALL" || item.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  // Group by category
  const grouped = filtered.reduce(
    (acc: Record<string, FAQItemType[]>, item: FAQItemType) => {
      const cat = item.category || "general";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    },
    {}
  );

  const openCreate = () => {
    setEditing(null);
    setQuestion("");
    setAnswer("");
    setCategory("general");
    setIsPublished(true);
    setDialogOpen(true);
  };

  const openEdit = (item: FAQItemType) => {
    setEditing(item);
    setQuestion(item.question);
    setAnswer(item.answer);
    setCategory(item.category || "general");
    setIsPublished(item.isPublished);
    setDialogOpen(true);
  };

  const handleSave = () => {
    startTransition(async () => {
      if (editing) {
        const updated = await updateFAQItem(editing.id, {
          question,
          answer,
          category,
          isPublished,
        });
        setItems((prev) =>
          prev.map((i: FAQItemType) => (i.id === editing.id ? updated : i))
        );
      } else {
        const created = await createFAQItem({
          question,
          answer,
          category,
          isPublished,
        });
        setItems((prev) => [...prev, created]);
      }
      setDialogOpen(false);
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this FAQ item?")) return;
    startTransition(async () => {
      await deleteFAQItem(id);
      setItems((prev) => prev.filter((i: FAQItemType) => i.id !== id));
    });
  };

  const handleTogglePublish = (item: FAQItemType) => {
    startTransition(async () => {
      const updated = await updateFAQItem(item.id, {
        isPublished: !item.isPublished,
      });
      setItems((prev) =>
        prev.map((i: FAQItemType) => (i.id === item.id ? updated : i))
      );
    });
  };

  const handleMove = (item: FAQItemType, direction: -1 | 1) => {
    const sameCategory = items.filter(
      (i: FAQItemType) => i.category === item.category
    );
    const idx = sameCategory.findIndex((i: FAQItemType) => i.id === item.id);
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= sameCategory.length) return;

    const updated = [...sameCategory];
    [updated[idx], updated[targetIdx]] = [updated[targetIdx], updated[idx]];

    const reordered = updated.map((i: FAQItemType, index: number) => ({
      ...i,
      sortOrder: index,
    }));

    setItems((prev) => {
      const others = prev.filter(
        (i: FAQItemType) => i.category !== item.category
      );
      return [...others, ...reordered].sort(
        (a: FAQItemType, b: FAQItemType) => {
          if (a.category < b.category) return -1;
          if (a.category > b.category) return 1;
          return a.sortOrder - b.sortOrder;
        }
      );
    });

    startTransition(async () => {
      await reorderFAQItems(
        reordered.map((i: FAQItemType) => ({
          id: i.id,
          sortOrder: i.sortOrder,
        }))
      );
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">FAQ</h1>
          <p className="text-muted-foreground">
            Manage frequently asked questions
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          New FAQ
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search FAQ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={(v) => v && setCategoryFilter(v)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Categories</SelectItem>
            {FAQ_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <HelpCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">No FAQ items</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Add your first frequently asked question
            </p>
            <Button onClick={openCreate} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add FAQ
            </Button>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([cat, catItems]) => (
          <div key={cat} className="space-y-2">
            <h2 className="text-lg font-semibold capitalize flex items-center gap-2">
              {cat}
              <Badge variant="secondary" className="text-xs">
                {(catItems as FAQItemType[]).length}
              </Badge>
            </h2>
            <Card>
              <Accordion className="w-full">
                {(catItems as FAQItemType[]).map(
                  (item: FAQItemType, idx: number) => (
                    <AccordionItem key={item.id} value={item.id}>
                      <div className="flex items-center gap-2 pr-4">
                        <AccordionTrigger className="flex-1 text-left px-4">
                          <div className="flex items-center gap-2">
                            {!item.isPublished && (
                              <EyeOff className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            )}
                            <span
                              className={
                                !item.isPublished ? "text-muted-foreground" : ""
                              }
                            >
                              {item.question}
                            </span>
                          </div>
                        </AccordionTrigger>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMove(item, -1);
                            }}
                            disabled={idx === 0}
                          >
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMove(item, 1);
                            }}
                            disabled={
                              idx === (catItems as FAQItemType[]).length - 1
                            }
                          >
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTogglePublish(item);
                            }}
                          >
                            {item.isPublished ? (
                              <Eye className="h-3.5 w-3.5" />
                            ) : (
                              <EyeOff className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEdit(item);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(item.id);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <AccordionContent className="px-4 pb-4">
                        <p className="text-sm whitespace-pre-wrap">
                          {item.answer}
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                  )
                )}
              </Accordion>
            </Card>
          </div>
        ))
      )}

      {/* Create/Edit FAQ dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit FAQ" : "New FAQ Item"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Question</Label>
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="What is the question?"
              />
            </div>
            <div className="space-y-2">
              <Label>Answer</Label>
              <Textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Provide a clear answer..."
                rows={5}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={(v) => v && setCategory(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FAQ_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch
                  checked={isPublished}
                  onCheckedChange={setIsPublished}
                />
                <Label>Published</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!question.trim() || !answer.trim() || pending}
            >
              {pending ? "Saving..." : editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
