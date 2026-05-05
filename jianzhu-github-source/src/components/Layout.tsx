import {
  BarChart3,
  BookOpenCheck,
  ClipboardList,
  Home,
  Settings,
  TriangleAlert
} from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/", label: "首页", icon: Home },
  { to: "/practice", label: "刷题", icon: BookOpenCheck },
  { to: "/wrong-book", label: "错题本", icon: TriangleAlert },
  { to: "/bank", label: "题库", icon: ClipboardList },
  { to: "/stats", label: "统计", icon: BarChart3 },
  { to: "/settings", label: "设置", icon: Settings }
];

export default function Layout() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#dffaf3,_transparent_34%),linear-gradient(180deg,_#f8fafc_0%,_#eef7f4_100%)]">
      <header className="sticky top-0 z-20 border-b border-white/80 bg-white/90 backdrop-blur">
        <div className="page-shell flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <NavLink to="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-equipment-600 text-white shadow-soft">
              <BookOpenCheck size={22} />
            </div>
            <div>
              <div className="text-lg font-black text-slate-900">
                建筑设备刷题系统
              </div>
              <div className="text-xs font-medium text-slate-500">
                概念 · 填空 · 判断 · 选择 · 简答
              </div>
            </div>
          </NavLink>
          <nav className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  className={({ isActive }) =>
                    [
                      "inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition",
                      isActive
                        ? "bg-equipment-600 text-white"
                        : "text-slate-600 hover:bg-white hover:text-equipment-700"
                    ].join(" ")
                  }
                >
                  <Icon size={17} />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="page-shell">
        <Outlet />
      </main>
    </div>
  );
}
