import { 
  LayoutDashboard, 
  Package, 
  Settings, 
  Link, 
  Barcode,
  Download,
  LogOut,
  User,
  Database
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const navigationItems = [
  { 
    title: "Dashboard", 
    url: "/", 
    icon: LayoutDashboard,
    group: "Main"
  },
  { 
    title: "Product Catalog", 
    url: "/products", 
    icon: Database,
    group: "Main"
  },
];

const adminItems = [
  { 
    title: "TCGplayer Mapping", 
    url: "/admin/mapping/tcg", 
    icon: Link,
    group: "Admin"
  },
  { 
    title: "UPC Mapping", 
    url: "/admin/mapping/upc", 
    icon: Barcode,
    group: "Admin"
  },
  { 
    title: "Import Status", 
    url: "/admin/imports", 
    icon: Download,
    group: "Admin"
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { user, signOut } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;
  const collapsed = state === 'collapsed';

  const isActive = (path: string) => {
    if (path === "/") {
      return currentPath === "/";
    }
    return currentPath.startsWith(path);
  };

  const getNavClass = (path: string) => {
    const active = isActive(path);
    return active 
      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
      : "hover:bg-sidebar-accent/50 text-sidebar-foreground";
  };

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarContent>
        {/* Logo section */}
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center space-x-2">
            <Package className="h-6 w-6 text-sidebar-primary" />
            {!collapsed && (
              <span className="font-bold text-sidebar-foreground">BuyList</span>
            )}
          </div>
        </div>

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={getNavClass(item.url)}
                      end={item.url === "/"}
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Administration</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={getNavClass(item.url)}
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer with user info and logout */}
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center justify-between p-2">
              <div className="flex items-center space-x-2 min-w-0">
                <User className="h-4 w-4 flex-shrink-0 text-sidebar-foreground" />
                 {!collapsed && user && (
                   <span className="text-sm text-sidebar-foreground truncate">
                     {user.email}
                   </span>
                 )}
              </div>
              {!collapsed && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={signOut}
                  className="text-sidebar-foreground hover:text-sidebar-accent-foreground h-8 w-8 p-0"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              )}
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}