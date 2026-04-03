"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Eraser, Undo2 } from "lucide-react";

const COLORS = [
  { value: "#000000", label: "Black" },
  { value: "#1e3a5f", label: "Navy" },
  { value: "#1a1a8b", label: "Blue" },
  { value: "#8b0000", label: "Dark Red" },
];

const THICKNESSES = [
  { value: 1.5, label: "Thin" },
  { value: 2.5, label: "Medium" },
  { value: 4, label: "Thick" },
];

type Props = {
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
};

export function SignaturePad({ onSave, onCancel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState(COLORS[0].value);
  const [thickness, setThickness] = useState(THICKNESSES[1].value);
  const [hasDrawn, setHasDrawn] = useState(false);
  const historyRef = useRef<ImageData[]>([]);

  const getCtx = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext("2d");
  }, []);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas resolution to match display size
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Save initial state
    historyRef.current = [ctx.getImageData(0, 0, canvas.width, canvas.height)];
  }, []);

  function getPosition(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ("touches" in e) {
      const touch = e.touches[0];
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function startDrawing(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    const ctx = getCtx();
    if (!ctx) return;

    const { x, y } = getPosition(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;
    setIsDrawing(true);
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = getCtx();
    if (!ctx) return;

    const { x, y } = getPosition(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  }

  function stopDrawing() {
    if (!isDrawing) return;
    const ctx = getCtx();
    const canvas = canvasRef.current;
    if (ctx && canvas) {
      ctx.closePath();
      // Save state for undo
      historyRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
      // Keep history manageable
      if (historyRef.current.length > 30) {
        historyRef.current = historyRef.current.slice(-20);
      }
    }
    setIsDrawing(false);
  }

  function handleClear() {
    const ctx = getCtx();
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    historyRef.current = [ctx.getImageData(0, 0, canvas.width, canvas.height)];
    setHasDrawn(false);
  }

  function handleUndo() {
    const ctx = getCtx();
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    if (historyRef.current.length <= 1) return;

    historyRef.current.pop();
    const previous = historyRef.current[historyRef.current.length - 1];
    ctx.putImageData(previous, 0, 0);
    setHasDrawn(historyRef.current.length > 1);
  }

  function handleSave() {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;
    const dataUrl = canvas.toDataURL("image/png");
    onSave(dataUrl);
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Color</Label>
          <div className="flex gap-1">
            {COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                title={c.label}
                onClick={() => setColor(c.value)}
                className={`h-7 w-7 rounded-full border-2 transition-all ${
                  color === c.value
                    ? "border-primary scale-110"
                    : "border-transparent hover:border-muted-foreground/30"
                }`}
                style={{ backgroundColor: c.value }}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Thickness</Label>
          <div className="flex gap-1">
            {THICKNESSES.map((t) => (
              <button
                key={t.value}
                type="button"
                title={t.label}
                onClick={() => setThickness(t.value)}
                className={`flex h-7 w-12 items-center justify-center rounded-md border text-xs transition-all ${
                  thickness === t.value
                    ? "border-primary bg-primary/10 font-medium"
                    : "border-border hover:bg-muted"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-1 ml-auto">
          <Button variant="outline" size="sm" onClick={handleUndo} disabled={historyRef.current.length <= 1}>
            <Undo2 className="h-3.5 w-3.5 mr-1" />
            Undo
          </Button>
          <Button variant="outline" size="sm" onClick={handleClear}>
            <Eraser className="h-3.5 w-3.5 mr-1" />
            Clear
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 bg-white overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full cursor-crosshair touch-none"
          style={{ height: 200 }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Draw your signature above using mouse or touch
      </p>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!hasDrawn}>
          Save Signature
        </Button>
      </div>
    </div>
  );
}
