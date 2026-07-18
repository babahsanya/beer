"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, Download, Upload, AlertTriangle, Loader2, CheckCircle2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ImportPreview {
  favorites?: number;
  tastingJournal?: number;
  viewHistory?: number;
  searchHistory?: number;
  achievements?: number;
  stats?: {
    totalFavorites?: number;
    totalTastings?: number;
    totalStylesExplored?: number;
  };
}

interface ImportResult {
  imported: {
    favorites: number;
    tastings: number;
    viewHistory: number;
    searchHistory: number;
    achievements: number;
  };
  errors: string[];
}

export function DataManager() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [fileSizeEstimate, setFileSizeEstimate] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const fetchSizeEstimate = useCallback(async () => {
    try {
      const res = await fetch("/api/export", { method: "HEAD" });
      const sizeKB = res.headers.get("X-File-Size-KB");
      if (sizeKB) setFileSizeEstimate(`${sizeKB} КБ`);
    } catch {
      // ignore
    }
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/export");
      if (!res.ok) {
        throw new Error("Ошибка сервера");
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="(.+?)"/);
      const filename = match ? match[1] : `beerid-backup-${new Date().toISOString().slice(0, 10)}.json`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Данные экспортированы",
        description: `Файл ${filename} загружен`,
      });
    } catch {
      toast({
        title: "Ошибка экспорта",
        description: "Не удалось экспортировать данные",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const parseFile = async (file: File): Promise<ImportPreview | null> => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.version) {
        toast({
          title: "Неверный формат файла",
          description: "Файл не является бэкапом BeerID",
          variant: "destructive",
        });
        return null;
      }
      return data as ImportPreview;
    } catch {
      toast({
        title: "Ошибка чтения",
        description: "Не удалось прочитать JSON-файл",
        variant: "destructive",
      });
      return null;
    }
  };

  const handleFileSelect = async (file: File) => {
    if (!file.name.endsWith(".json")) {
      toast({
        title: "Неверный формат",
        description: "Выберите файл с расширением .json",
        variant: "destructive",
      });
      return;
    }
    setSelectedFile(file);
    const preview = await parseFile(file);
    setImportPreview(preview);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const clearFile = () => {
    setSelectedFile(null);
    setImportPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImport = async () => {
    if (!selectedFile) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("/api/import", {
        method: "POST",
        body: selectedFile,
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Ошибка сервера");
      }

      const result: ImportResult = await res.json();
      const parts: string[] = [];
      if (result.imported.favorites > 0) parts.push(`${result.imported.favorites} избранных`);
      if (result.imported.tastings > 0) parts.push(`${result.imported.tastings} записей журнала`);
      if (result.imported.viewHistory > 0) parts.push(`${result.imported.viewHistory} просмотров`);
      if (result.imported.searchHistory > 0) parts.push(`${result.imported.searchHistory} запросов`);
      if (result.imported.achievements > 0) parts.push(`${result.imported.achievements} достижений`);

      const summary = parts.length > 0 ? parts.join(", ") : "Новых данных не найдено";

      toast({
        title: "Импорт завершён",
        description: `Импортировано: ${summary}`,
      });

      if (result.errors.length > 0) {
        toast({
          title: "Предупреждения",
          description: `${result.errors.length} ошибок при импорте (данные пропущены)`,
          variant: "destructive",
        });
      }

      clearFile();
    } catch (err) {
      toast({
        title: "Ошибка импорта",
        description: err instanceof Error ? err.message : "Не удалось импортировать данные",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  const previewItems = [
    ...(importPreview?.favorites ? [{ label: "Избранных", count: importPreview.favorites }] : []),
    ...(importPreview?.tastingJournal ? [{ label: "Записей журнала", count: importPreview.tastingJournal }] : []),
    ...(importPreview?.viewHistory ? [{ label: "Просмотров", count: importPreview.viewHistory }] : []),
    ...(importPreview?.searchHistory ? [{ label: "Поисковых запросов", count: importPreview.searchHistory }] : []),
    ...(importPreview?.achievements ? [{ label: "Достижений", count: importPreview.achievements }] : []),
  ];

  return (
    <Card className="border-amber-200/60 dark:border-amber-900/40 bg-white/70 dark:bg-stone-800/70 backdrop-blur-xl">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Database className="h-5 w-5 text-amber-500" />
          Резервное копирование
        </CardTitle>
        <p className="text-xs text-muted-foreground -mt-1">
          Экспортируйте и импортируйте ваши данные
        </p>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* Export Section */}
        <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-900/15 border border-amber-100 dark:border-amber-800/30">
          <div className="flex items-start gap-3">
            <Download className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Экспорт данных</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Скачать все ваши данные в формате JSON
              </p>
              {fileSizeEstimate && (
                <p className="text-xs text-muted-foreground mt-1">
                  Примерный размер: {fileSizeEstimate}
                </p>
              )}
              <Button
                size="sm"
                className="mt-2.5 bg-amber-500 hover:bg-amber-600 text-white border-0"
                onClick={handleExport}
                disabled={exporting}
                onMouseEnter={fetchSizeEstimate}
                onFocus={fetchSizeEstimate}
              >
                {exporting ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-1.5" />
                )}
                {exporting ? "Экспорт..." : "Экспортировать данные"}
              </Button>
            </div>
          </div>
        </div>

        {/* Import Section */}
        <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-900/15 border border-amber-100 dark:border-amber-800/30">
          <div className="flex items-start gap-3">
            <Upload className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0 space-y-3">
              <div>
                <p className="text-sm font-medium">Импорт данных</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Загрузить ранее сохранённые данные
                </p>
              </div>

              {/* Drop zone */}
              <div
                className={`
                  relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer
                  transition-colors duration-200
                  ${dragOver
                    ? "border-amber-400 bg-amber-100/50 dark:bg-amber-900/30"
                    : "border-amber-200 dark:border-amber-800 hover:border-amber-300 dark:hover:border-amber-700 hover:bg-amber-50/40 dark:hover:bg-amber-900/10"
                  }
                `}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click(); }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleInputChange}
                  aria-label="Выбрать JSON файл для импорта"
                />
                <Upload className="h-8 w-8 mx-auto text-amber-400 mb-2" />
                <p className="text-sm text-foreground/80">
                  {selectedFile ? selectedFile.name : "Выберите файл или перетащите сюда"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Поддерживаемый формат: .json
                </p>
              </div>

              {/* Preview & Confirm */}
              <AnimatePresence>
                {importPreview && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-white/80 dark:bg-stone-900/60 rounded-xl p-3 border border-amber-100 dark:border-amber-800/30 space-y-2.5">
                      {/* File header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                          <span className="text-xs text-muted-foreground truncate">
                            Файл проверен (v{importPreview.version || importPreview.stats ? "1.0" : "?"})
                          </span>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); clearFile(); }}
                          className="p-1 rounded-md hover:bg-muted transition-colors"
                          aria-label="Убрать файл"
                        >
                          <X className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      </div>

                      {/* Preview counts */}
                      {previewItems.length > 0 && (
                        <div className="grid grid-cols-2 gap-2">
                          {previewItems.map((item) => (
                            <div
                              key={item.label}
                              className="text-center py-1.5 px-2 rounded-lg bg-amber-50/80 dark:bg-amber-900/20"
                            >
                              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                                {item.count}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                {item.label}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Warning */}
                      <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-800/30">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                          Импорт добавит данные к существующим. Дубликаты не создаются.
                        </p>
                      </div>

                      {/* Confirm button */}
                      <Button
                        size="sm"
                        className="w-full bg-amber-500 hover:bg-amber-600 text-white border-0"
                        onClick={handleImport}
                        disabled={importing}
                      >
                        {importing ? (
                          <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4 mr-1.5" />
                        )}
                        {importing ? "Импортирование..." : "Подтвердить импорт"}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}