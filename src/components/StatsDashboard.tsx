import React from "react";
import { motion } from "motion/react";
import { 
  Grid, 
  Tag, 
  CalendarClock, 
  Sparkles 
} from "lucide-react";
import { Stats } from "../types";

interface StatsDashboardProps {
  stats: Stats;
  activeFilter: string;
  onFilterChange: (filter: "all" | "flyer" | "photo" | "recent") => void;
}

export const StatsDashboard: React.FC<StatsDashboardProps> = ({ 
  stats, 
  activeFilter, 
  onFilterChange 
}) => {
  const statItems = [
    {
      id: "flyer",
      label: "Flyer Story",
      value: stats.totalWithFlyers,
      icon: Sparkles,
      bgColor: "bg-emerald-50/60 text-emerald-950 border-emerald-100/80",
      iconBg: "bg-emerald-100/80 text-emerald-600",
      desc: "Stiker / Gambar Story Drive",
      selectable: true,
      filterKey: "flyer" as const
    },
    {
      id: "recent",
      label: "Baru Di-update",
      value: stats.recentlyUpdatedCount,
      icon: CalendarClock,
      bgColor: "bg-amber-50/60 text-amber-950 border-amber-100/80",
      iconBg: "bg-amber-100/80 text-amber-600",
      desc: "Flyer dengan tanggal update",
      selectable: true,
      filterKey: "recent" as const
    },
    {
      id: "categories",
      label: "Kategori",
      value: stats.categoriesCount,
      icon: Grid,
      bgColor: "bg-purple-50/60 text-purple-950 border-purple-100/80",
      iconBg: "bg-purple-100/80 text-purple-600",
      desc: "Pengelompokan jenis barang",
      selectable: false
    },
    {
      id: "brands",
      label: "Merk / Brand",
      value: stats.brandsCount,
      icon: Tag,
      bgColor: "bg-rose-50/60 text-rose-950 border-rose-100/80",
      iconBg: "bg-rose-100/80 text-rose-600",
      desc: "Pabrikan & produsen terdaftar",
      selectable: false
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-5 mb-8">
      {statItems.map((item, index) => {
        const isSelected = item.selectable && activeFilter === item.filterKey;
        const Icon = item.icon;

        return (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            onClick={() => {
              if (item.selectable && item.filterKey) {
                onFilterChange(item.filterKey);
              }
            }}
            className={`relative p-5 rounded-2xl border transition-all duration-300 ${
              item.selectable ? "cursor-pointer select-none" : ""
            } ${
              isSelected 
                ? "bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-900/15 -translate-y-1" 
                : `${item.bgColor} border-slate-200/60 shadow-sm hover:shadow-md hover:border-slate-300/80 hover:-translate-y-1`
            }`}
          >
            {/* Visual Header */}
            <div className="flex items-center justify-between mb-3">
              <span className={`p-2 rounded-xl transition-colors ${
                isSelected ? "bg-white/10 text-white" : `${item.iconBg}`
              }`}>
                <Icon size={18} className="stroke-[2.25]" />
              </span>
              
              {item.selectable && !isSelected && (
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600 bg-white/80 px-2 py-0.5 rounded-md border border-slate-200">
                  Filter
                </span>
              )}
              {item.selectable && isSelected && (
                <span className="text-[9px] font-bold uppercase tracking-wider text-sky-400 bg-slate-850 px-2 py-0.5 rounded-md border border-white/10">
                  Aktif
                </span>
              )}
            </div>

            {/* Metric values */}
            <div className="space-y-0.5">
              <h4 className="text-3xl font-black tracking-tight leading-none">
                {item.value}
              </h4>
              <p className="text-xs font-bold uppercase tracking-tight mt-1">
                {item.label}
              </p>
              <p className={`text-[10px] mt-1.5 leading-snug font-medium ${isSelected ? "text-slate-400" : "text-slate-600"}`}>
                {item.desc}
              </p>
            </div>
            
            {/* Indicator Dot */}
            {isSelected && (
              <span className="absolute top-2 right-2 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-400"></span>
              </span>
            )}
          </motion.div>
        );
      })}
    </div>
  );
};
