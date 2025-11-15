"use client";
import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Square,
  Eraser,
  Undo,
  Redo,
  Download,
  Trash2,
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Layers,
  Save,
  MousePointer2,
  Pencil,
  Circle,
  ChevronLeft,
  ChevronRight,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/redux/store";
import { setProgressNum } from "@/features/progress/ProgressSlice";
import PDFLoader from "./PDFLoader";

interface ManualRedactionProps {
  file: File | null;
  onComplete?: () => void;
}

interface RedactionBox {
  id: string;
  type: "rectangle" | "freehand" | "circle";
  x: number;
  y: number;
  width?: number;
  height?: number;
  points?: { x: number; y: number }[];
  style: "blackout" | "blur" | "pixelate" | "whiteout";
  visible: boolean;
  pageNumber: number;
}

const ManualRedaction: React.FC<ManualRedactionProps> = ({
  file,
  onComplete,
}) => {
  const dispatch: AppDispatch = useDispatch();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  // File and loading state
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isPDF, setIsPDF] = useState(false);
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [pdfLib, setPdfLib] = useState<any>(null);
  const [pdfError, setPdfError] = useState<Error | null>(null);
  const [isRendering, setIsRendering] = useState(false);

  // PDF Page state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pdfPages, setPdfPages] = useState<Map<number, HTMLCanvasElement>>(new Map());

  // Tool state
  const [activeTool, setActiveTool] = useState<"select" | "rectangle" | "freehand" | "circle" | "eraser">("select");
  const [redactionStyle, setRedactionStyle] = useState<"blackout" | "blur" | "pixelate" | "whiteout">("blackout");
  const [brushSize, setBrushSize] = useState(20);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([]);

  // Redaction state
  const [redactions, setRedactions] = useState<RedactionBox[]>([]);
  const [history, setHistory] = useState<RedactionBox[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [selectedRedactionId, setSelectedRedactionId] = useState<string | null>(null);

  // View state
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [showLayers, setShowLayers] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Effect to handle file loading
  useEffect(() => {
    if (!file) return;
    
    // Reset state for new file
    resetState();

    if (file.type === "application/pdf") {
      setIsPDF(true);
      if (pdfLib) {
        loadPDF(file);
      }
    } else if (file.type.startsWith("image/")) {
      setIsPDF(false);
      loadImage(file);
    }
  }, [file, pdfLib]);

  const resetState = () => {
    setImage(null);
    setImageLoaded(false);
    setIsPDF(false);
    setPdfDocument(null);
    setCurrentPage(1);
    setTotalPages(1);
    setPdfPages(new Map());
    setRedactions([]);
    setHistory([]);
    setHistoryIndex(-1);
    setZoom(1);
    setRotation(0);
  };

  const loadImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setImage(img);
        setImageLoaded(true);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const loadPDF = async (file: File) => {
    if (!pdfLib) return;
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      setPdfDocument(pdf);
      setTotalPages(pdf.numPages);
      setImageLoaded(true); // Indicates that the file is ready to be rendered
    } catch (error) {
      console.error("Error loading PDF:", error);
      setPdfError(error instanceof Error ? error : new Error(String(error)));
    }
  };

  // Effect to render the current page when it changes or file loads
  useEffect(() => {
    if (imageLoaded) {
      if (isPDF && pdfDocument) {
        renderPDFPage(pdfDocument, currentPage);
      } else if (!isPDF && image) {
        drawCanvas();
      }
    }
  }, [imageLoaded, isPDF, pdfDocument, currentPage, image]);

  // Effect to redraw canvases when view changes
  useEffect(() => {
    drawCanvas();
    drawRedactions();
  }, [zoom, rotation, redactions, selectedRedactionId, pdfPages, currentPage]);

  const renderPDFPage = async (pdf: any, pageNumber: number) => {
    if (pdfPages.has(pageNumber)) {
      drawCanvas();
      return;
    }
    setIsRendering(true);
    try {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.5 }); // Render at a higher scale for quality
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      if (context) {
        await page.render({ canvasContext: context, viewport }).promise;
        setPdfPages(prev => new Map(prev).set(pageNumber, canvas));
      }
    } catch (error) {
      console.error(`Error rendering PDF page ${pageNumber}:`, error);
    } finally {
      setIsRendering(false);
    }
  };

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let sourceCanvas: HTMLCanvasElement | HTMLImageElement | null = null;
    if (isPDF) {
      sourceCanvas = pdfPages.get(currentPage) || null;
    } else {
      sourceCanvas = image;
    }

    if (!sourceCanvas) {
      // Clear canvas if no source
      canvas.width = overlayCanvasRef.current?.width || 800;
      canvas.height = overlayCanvasRef.current?.height || 600;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const scaledWidth = sourceCanvas.width * zoom;
    const scaledHeight = sourceCanvas.height * zoom;

    canvas.width = scaledWidth;
    canvas.height = scaledHeight;
    if (overlayCanvasRef.current) {
      overlayCanvasRef.current.width = scaledWidth;
      overlayCanvasRef.current.height = scaledHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(sourceCanvas, -scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight);
    ctx.restore();
  };

  const drawRedactions = () => {
    const canvas = overlayCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);

    const pageRedactions = redactions.filter(r => r.pageNumber === currentPage);

    pageRedactions.forEach(redaction => {
      if (!redaction.visible) return;

      const x = redaction.x * zoom;
      const y = redaction.y * zoom;

      ctx.fillStyle = "#000"; // For blackout
      ctx.strokeStyle = "#000";
      ctx.lineWidth = brushSize * zoom;

      switch (redaction.type) {
        case "rectangle":
          ctx.fillRect(x, y, redaction.width! * zoom, redaction.height! * zoom);
          break;
        case "circle":
            ctx.beginPath();
            ctx.arc(x + (redaction.width! * zoom / 2), y + (redaction.height! * zoom / 2), (redaction.width! * zoom / 2), 0, 2 * Math.PI);
            ctx.fill();
            break;
        case "freehand":
          if (redaction.points && redaction.points.length > 1) {
            ctx.beginPath();
            ctx.moveTo(redaction.points[0].x * zoom, redaction.points[0].y * zoom);
            for (let i = 1; i < redaction.points.length; i++) {
              ctx.lineTo(redaction.points[i].x * zoom, redaction.points[i].y * zoom);
            }
            ctx.stroke();
          }
          break;
      }
    });
    ctx.restore();
  };

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    // Transform coordinates to account for zoom and rotation
    const x = (e.clientX - rect.left);
    const y = (e.clientY - rect.top);

    // Inverse transform
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const angle = -rotation * Math.PI / 180;

    const rotatedX = (x - centerX) * Math.cos(angle) - (y - centerY) * Math.sin(angle) + centerX;
    const rotatedY = (x - centerX) * Math.sin(angle) + (y - centerY) * Math.cos(angle) + centerY;

    return { x: rotatedX / zoom, y: rotatedY / zoom };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);
    setIsDrawing(true);
    setStartPoint(pos);
    if (activeTool === "freehand") {
      setCurrentPoints([pos]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const pos = getMousePos(e);
    if (activeTool === "freehand") {
      setCurrentPoints(prev => [...prev, pos]);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const pos = getMousePos(e);

    let newRedaction: RedactionBox | null = null;
    const baseRedaction = {
      id: Date.now().toString(),
      visible: true,
      style: redactionStyle,
      pageNumber: currentPage,
    };

    if (activeTool === "rectangle") {
      newRedaction = {
        ...baseRedaction,
        type: "rectangle",
        x: Math.min(startPoint.x, pos.x),
        y: Math.min(startPoint.y, pos.y),
        width: Math.abs(pos.x - startPoint.x),
        height: Math.abs(pos.y - startPoint.y),
      };
    } else if (activeTool === "circle") {
        const width = Math.abs(pos.x - startPoint.x);
        const height = Math.abs(pos.y - startPoint.y);
        newRedaction = {
            ...baseRedaction,
            type: "circle",
            x: Math.min(startPoint.x, pos.x),
            y: Math.min(startPoint.y, pos.y),
            width: width,
            height: height,
        };
    } else if (activeTool === "freehand") {
      newRedaction = {
        ...baseRedaction,
        type: "freehand",
        points: [...currentPoints, pos],
        x: Math.min(...currentPoints.map(p => p.x)),
        y: Math.min(...currentPoints.map(p => p.y)),
      };
    }

    if (newRedaction) {
      const newRedactions = [...redactions, newRedaction];
      setRedactions(newRedactions);
      addToHistory(newRedactions);
    }

    setIsDrawing(false);
    setCurrentPoints([]);
    dispatch(setProgressNum(85));
  };

  const addToHistory = (newRedactions: RedactionBox[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newRedactions);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setRedactions(history[newIndex]);
    } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setRedactions([]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setRedactions(history[newIndex]);
    }
  };

  const handleClearAll = () => {
    setRedactions([]);
    addToHistory([]);
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Show loading/error state for PDF library
  if (isPDF && !pdfLib) {
    return (
      <div>
        <PDFLoader onLoad={setPdfLib} onError={setPdfError} />
        <div className="flex items-center justify-center min-h-[600px]">
          <div className="text-center">
            {pdfError ? (
              <div className="text-red-500">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
                <p>Failed to load PDF library.</p>
                <p className="text-sm">{pdfError.message}</p>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading PDF Library...</p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Controls Panel */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-lg">Tools</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drawing Tools */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-700">Drawing Tools</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant={activeTool === "select" ? "default" : "outline"} size="sm" onClick={() => setActiveTool("select")} className="flex flex-col items-center p-5"><MousePointer2 className="-mb-2" /><span className="text-xs">Select</span></Button>
              <Button variant={activeTool === "rectangle" ? "default" : "outline"} size="sm" onClick={() => setActiveTool("rectangle")} className="flex flex-col items-center p-5"><Square className="-mb-2" /><span className="text-xs">Rectangle</span></Button>
              <Button variant={activeTool === "circle" ? "default" : "outline"} size="sm" onClick={() => setActiveTool("circle")} className="flex flex-col items-center p-5"><Circle className="-mb-2" /><span className="text-xs">Circle</span></Button>
              <Button variant={activeTool === "freehand" ? "default" : "outline"} size="sm" onClick={() => setActiveTool("freehand")} className="flex flex-col items-center p-5"><Pencil className="-mb-2" /><span className="text-xs">Freehand</span></Button>
              <Button variant={activeTool === "eraser" ? "default" : "outline"} size="sm" onClick={() => setActiveTool("eraser")} className="flex flex-col items-center p-5"><Eraser className="-mb-2" /><span className="text-xs">Eraser</span></Button>
            </div>
          </div>

          {/* History Controls */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-700">History</p>
            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" size="sm" onClick={handleUndo} disabled={historyIndex < 0}><Undo className="w-4 h-4" /></Button>
              <Button variant="outline" size="sm" onClick={handleRedo} disabled={historyIndex >= history.length - 1}><Redo className="w-4 h-4" /></Button>
              <Button variant="outline" size="sm" onClick={handleClearAll}><Trash2 className="w-4 h-4" /></Button>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-4 border-t">
            <Button onClick={onComplete} disabled={isSaving || redactions.length === 0} className="w-full">
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? "Saving..." : "Save Redaction"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Canvas Area */}
      <div className="lg:col-span-3 space-y-4">
        <Card>
          <CardContent className="p-4">
            <div className="relative bg-gray-100 rounded-lg overflow-auto" style={{ minHeight: '600px' }}>
              <div className="flex items-center justify-center">
                {(!imageLoaded || (isPDF && isRendering)) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75 z-10">
                    <div className="text-center">
                      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-gray-600">{isPDF ? `Rendering Page ${currentPage}...` : 'Loading Image...'}</p>
                    </div>
                  </div>
                )}
                <div className="relative">
                  <canvas ref={canvasRef} className="absolute top-0 left-0" />
                  <canvas
                    ref={overlayCanvasRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    className="relative cursor-crosshair"
                  />
                </div>
              </div>
            </div>

            {/* Info Bar */}
            <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center gap-4">
                <span>Redactions: {redactions.length}</span>
                {isPDF && (
                  <span className="flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    Page {currentPage} of {totalPages}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4">
                <span>Zoom: {Math.round(zoom * 100)}%</span>
                <span>Tool: {activeTool}</span>
              </div>
            </div>

            {/* PDF Navigation Controls */}
            {isPDF && totalPages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <Button variant="outline" size="sm" onClick={goToPreviousPage} disabled={currentPage === 1} className="flex items-center gap-2"><ChevronLeft className="w-4 h-4" />Previous</Button>
                <div className="flex items-center gap-2 px-4 py-2 bg-white rounded border">
                  <span className="font-medium">Page</span>
                  <input type="number" min="1" max={totalPages} value={currentPage} onChange={(e) => setCurrentPage(Number(e.target.value))} className="w-16 text-center border rounded px-2 py-1" />
                  <span className="text-gray-500">of {totalPages}</span>
                </div>
                <Button variant="outline" size="sm" onClick={goToNextPage} disabled={currentPage === totalPages} className="flex items-center gap-2">Next<ChevronRight className="w-4 h-4" /></Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ManualRedaction;
