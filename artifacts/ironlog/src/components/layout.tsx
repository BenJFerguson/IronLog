import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Activity, LayoutDashboard, LogOut, History, Calculator, BarChart3 } from "lucide-react";
import { useLogout, useGetMe } from "@workspace/api-client-react";
import { Button } from "./ui/button";

export function Layout({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const { data: user } = useGetMe();
  const logout = useLogout();

  const navItems = [
    { href: "/dashboard", label: "DASHBOARD", icon: LayoutDashboard },
    { href: "/workout/new", label: "START WORKOUT", icon: Activity },
    { href: "/history", label: "HISTORY", icon: History },
    { href: "/progress", label: "PROGRESS", icon: BarChart3 },
    { href: "/calculator", label: "1RM CALCULATOR", icon: Calculator },
  ];

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => setLocation("/login"),
    });
  };

  return (
    <div className="flex h-screen bg-background text-foreground flex-col md:flex-row">
      <nav className="w-full md:w-64 border-b md:border-b-0 md:border-r border-border bg-card p-4 flex flex-col justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-8 px-2">
            <div className="w-8 h-8 bg-primary text-primary-foreground flex items-center justify-center font-bold">
              I
            </div>
            <span className="text-xl font-bold tracking-tight">IRONLOG</span>
          </div>

          <div className="space-y-1">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex items-center gap-3 px-3 py-3 rounded-md cursor-pointer transition-colors ${
                    location === item.href
                      ? "bg-primary/10 text-primary font-bold"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                  data-testid={`nav-${item.label.toLowerCase().replace(" ", "-")}`}
                >
                  <item.icon size={18} />
                  <span className="text-sm">{item.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {user && (
          <div className="mt-8 pt-4 border-t border-border flex items-center justify-between">
            <div className="text-xs text-muted-foreground truncate px-2" title={user.email}>
              {user.email}
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout" data-testid="btn-logout">
              <LogOut size={16} />
            </Button>
          </div>
        )}
      </nav>

      <main className="flex-1 overflow-auto p-4 md:p-8">
        <div className="max-w-5xl mx-auto h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
