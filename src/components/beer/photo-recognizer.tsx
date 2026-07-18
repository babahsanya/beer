"use client";

import { useState, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "./empty-state";
import { RatingStars } from "./rating-stars";
import {
  Upload,
  Camera,
  X,
  Loader2,
  Lightbulb,
  ImageIcon,
} from "lucide-react";
import { useBeerStore } from "@/store/beer-store";
import { motion, AnimatePresence } from "framer-motion";

interface RecognitionMatch {
  beer: {
    id: string;
    name: string;
    style: string;
    abv: number;
    brewery: string;
    country: string;
    rating: number;
    label: string;
  };
  confidence: number;
}

export function PhotoRecognizer() {
  const { selectBeer } = useBeerStore();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<RecognitionMatch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Пожалуйста, загрузите изображение");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setImagePreview(result);
      // Extract base64 from data URL
      const base64 = result.split(",")[1];
      setImageBase64(base64);
      setResults([]);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const recognize = async () => {
    if (!imageBase64) return;
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      const res = await fetch("/api/recognize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageBase64 }),
      });
      if (!res.ok) throw new Error("Ошибка распознавания");
      const data = await res.json();
      setResults(data.matches || []);
      if (!data.matches?.length) {
        setError("Не удалось распознать этикетку");
      }
    } catch {
      setError("Не удалось распознать этикетку. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  };

  const clearImage = () => {
    setImagePreview(null);
    setImageBase64(null);
    setResults([]);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const tips = [
    "Целиком этикетка в кадре",
    "Хорошее освещение",
    "Без бликов и теней",
    "Чёткий фокус",
  ];

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <AnimatePresence mode="wait">
        {!imagePreview ? (
          <motion.div
            key="upload"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Card
              className={`border-2 border-dashed transition-colors ${
                dragActive
                  ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20"
                  : "border-amber-300 dark:border-amber-700 bg-white dark:bg-stone-800"
              }`}
              onDrop={handleDrop}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
            >
              <CardContent className="p-8 sm:p-12">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <Camera className="h-8 w-8 text-amber-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">
                      Загрузите фото этикетки пива
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Перетащите изображение или нажмите кнопку ниже
                    </p>
                  </div>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-2 bg-amber-500 hover:bg-amber-600"
                  >
                    <Upload className="h-4 w-4" />
                    Выбрать фото
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <Card className="border-amber-200 dark:border-amber-900/50 bg-white dark:bg-stone-800 overflow-hidden">
              <CardContent className="p-4">
                <div className="relative">
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-amber-50 dark:bg-amber-900/20">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8"
                    onClick={clearImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  onClick={recognize}
                  disabled={loading}
                  className="w-full mt-4 gap-2 bg-amber-500 hover:bg-amber-600 h-12 text-base font-semibold"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Распознаю этикетку...
                    </>
                  ) : (
                    <>
                      <ImageIcon className="h-5 w-5" />
                      Распознать
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading State */}
      {loading && (
        <Card className="border-amber-200 dark:border-amber-900/50">
          <CardContent className="p-6 text-center">
            <Loader2 className="h-8 w-8 text-amber-500 animate-spin mx-auto" />
            <p className="mt-3 text-sm text-muted-foreground">
              ⏳ Распознаю этикетку...
            </p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground">
            Результаты распознавания
          </h3>
          {results.map((match) => (
            <Card
              key={match.beer.id}
              className="group cursor-pointer border-amber-200 dark:border-amber-900/50 bg-white dark:bg-stone-800 hover:border-amber-400 dark:hover:border-amber-600 transition-all duration-200"
              onClick={() => selectBeer(match.beer as any)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-sm text-foreground truncate">
                      {match.beer.name}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {match.beer.brewery} • {match.beer.style}
                    </p>
                    <div className="mt-1">
                      <RatingStars
                        rating={match.beer.rating}
                        size={12}
                      />
                    </div>
                  </div>
                  <Badge
                    className={`shrink-0 font-semibold ${
                      match.confidence > 80
                        ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                        : match.confidence > 50
                        ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                        : "bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-600"
                    }`}
                  >
                    {match.confidence}%
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <EmptyState title={error} description="Попробуйте загрузить другое фото" />
      )}

      {/* Tips */}
      {!results.length && !loading && (
        <Card className="border-amber-200/50 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-900/10">
          <CardContent className="p-4">
            <h4 className="text-sm font-medium text-foreground flex items-center gap-2 mb-3">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              Советы для лучшего распознавания
            </h4>
            <ul className="space-y-2">
              {tips.map((tip) => (
                <li
                  key={tip}
                  className="text-sm text-muted-foreground flex items-center gap-2"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                  {tip}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}