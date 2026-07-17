"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Search,
  Keyboard,
  Eraser,
  Home,
  ArrowLeft,
} from "lucide-react";
import { motion } from "framer-motion";

const sections = [
  {
    emoji: "🔍",
    title: "Поиск",
    description: "Мощная система поиска с поддержкой двух языков и нечёткого matching.",
    items: [
      "Поиск на русском и английском — «стаут» найдёт все Stouts, «ипа» найдёт все IPAs",
      "Нечёткий поиск — находит пиво даже с опечатками в названии",
      "Автодополнение — при наборе текста под строкой поиска появляются подсказки",
      "Поиск по названию, стилю, пивоварне, стране и описанию",
    ],
  },
  {
    emoji: "🎛️",
    title: "Фильтры",
    description: "Тонкая настройка результатов поиска.",
    items: [
      "Слайдер ABV — фильтр по крепости пива от 0% до 15%",
      "Слайдер IBU — фильтр по горечи от 0 до 120 IBU",
      "Сортировка — по рейтингу, крепости (ABV) или количеству чекинов",
      "Чипы стилей — быстрые фильтры по популярным стилям пива на главной",
      "Экспорт CSV — загрузка результатов поиска в формате CSV",
    ],
  },
  {
    emoji: "📸",
    title: "Распознавание",
    description: "Определение пива по фотографии этикетки.",
    items: [
      "Сфотографируйте этикетку пива или загрузите изображение",
      "ИИ распознает пиво и найдёт его в базе данных",
      "Если пиво найдено — откроется карточка с полной информацией",
    ],
  },
  {
    emoji: "⚖️",
    title: "Сравнение",
    description: "Сравните два сорта пива бок о бок.",
    items: [
      "Нажмите иконку весов на карточке пива чтобы добавить в сравнение",
      "Выберите до 2 сортов — внизу появится плавающая панель",
      "Нажмите «Сравнить» чтобы увидеть детальное сравнение",
      "Лучшие характеристики выделяются зелёным цветом",
    ],
  },
  {
    emoji: "❤️",
    title: "Избранное",
    description: "Сохраняйте любимые сорта пива.",
    items: [
      "На странице пива нажмите ❤️ чтобы добавить в избранное",
      "Все избранные пива доступны во вкладке «Избранное»",
      "Нажмите ещё раз чтобы убрать из избранного",
    ],
  },
  {
    emoji: "🍽️",
    title: "Гастрономия",
    description: "Подборки закусок к каждому стилю пива.",
    items: [
      "На странице пива во вкладке «Описание» показаны гастрономические пары",
      "Пары подбираются автоматически на основе стиля пива",
      "IPA отлично сочетается с острой едой и сырами",
      "Стаут — с шоколадом и барбекю",
    ],
  },
  {
    emoji: "🏆",
    title: "Топ-5",
    description: "Лучшие сорта пива по рейтингу.",
    items: [
      "На главной странице показаны 5 лучших пив по рейтингу",
      "Нажмите на карточку чтобы открыть подробности",
      "Медали 🥇🥈🥉 для тройки лидеров",
    ],
  },
];

const shortcuts = [
  {
    keys: ["⌘", "K"],
    description: "Фокус на поиск",
    icon: <Search className="h-4 w-4 text-amber-500" />,
  },
  {
    keys: ["Esc"],
    description: "Вернуться на главную",
    icon: <Home className="h-4 w-4 text-amber-500" />,
  },
  {
    keys: ["←"],
    description: "Назад (из деталей)",
    icon: <ArrowLeft className="h-4 w-4 text-amber-500" />,
  },
  {
    keys: ["⌘", "K"],
    description: "Закрыть подсказки поиска",
    icon: <Eraser className="h-4 w-4 text-amber-500" />,
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export function HelpView() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="text-center"
      >
        <h2 className="text-2xl font-bold beer-gradient-text">Справка</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Как пользоваться BeerID
        </p>
      </motion.div>

      {/* Sections */}
      <motion.div
        className="space-y-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {sections.map((section) => (
          <motion.div key={section.title} variants={itemVariants}>
            <Card className="border-amber-200/60 dark:border-amber-900/40 bg-white/70 dark:bg-stone-800/70 backdrop-blur-xl overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <span className="text-xl">{section.emoji}</span>
                  {section.title}
                </CardTitle>
                <p className="text-xs sm:text-sm text-muted-foreground -mt-1">
                  {section.description}
                </p>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-2">
                  {section.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                      <span className="text-amber-500 mt-0.5 shrink-0">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Keyboard Shortcuts */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        <Card className="border-amber-200/60 dark:border-amber-900/40 bg-white/70 dark:bg-stone-800/70 backdrop-blur-xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Keyboard className="h-5 w-5 text-amber-500" />
              Горячие клавиши
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {shortcuts.map((shortcut) => (
                <div
                  key={shortcut.description}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-amber-50/60 dark:bg-amber-900/15 border border-amber-100 dark:border-amber-800/30"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {shortcut.icon}
                    <span className="text-sm text-foreground/80 truncate">
                      {shortcut.description}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {shortcut.keys.map((key, i) => (
                      <span key={i}>
                        <kbd className="inline-flex h-7 min-w-7 items-center justify-center rounded-md border border-amber-300 dark:border-amber-700 bg-white dark:bg-stone-700 px-2 text-xs font-mono font-medium text-amber-800 dark:text-amber-300 shadow-sm">
                          {key}
                        </kbd>
                        {i < shortcut.keys.length - 1 && (
                          <span className="text-muted-foreground text-xs mx-0.5">
                            +
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tips footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="text-center text-xs text-muted-foreground pb-4"
      >
        <p>🍺 BeerID — пивной справочник с открытыми данными</p>
        <p className="mt-1">Все данные доступны без авторизации</p>
      </motion.div>
    </div>
  );
}