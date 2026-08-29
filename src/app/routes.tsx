import { createBrowserRouter } from "react-router";
import AppShell from "../components/layout/AppShell";
import { ProtectedRoute } from "../components/ProtectedRoute";
import Landing from "../pages/Landing";
import Login from "../pages/Login";
import Signup from "../pages/Signup";
import CommandCenter from "../pages/CommandCenter";
import Dashboard from "../pages/Dashboard";
import Growth from "../pages/Growth";
import Commerce from "../pages/Commerce";
import Products from "../pages/Products";
import ProductDetail from "../pages/ProductDetail";
import Opportunities from "../pages/Opportunities";
import Leads from "../pages/Leads";
import Deals from "../pages/Deals";
import Approvals from "../pages/Approvals";
import Integrations from "../pages/Integrations";
import SettingsPage from "../pages/Settings";
import Conversations from "../pages/Conversations";
import Diagnostics from "../pages/Diagnostics";
import AuthCallback from "../pages/AuthCallback";
import NotFound from "../pages/NotFound";

const appSubRoutes = [
  { index: true, Component: CommandCenter },
  { path: "dashboard", Component: Dashboard },
  { path: "growth", Component: Growth },
  { path: "commerce", Component: Commerce },
  { path: "products", Component: Products },
  { path: "products/:id", Component: ProductDetail },
  { path: "opportunities", Component: Opportunities },
  { path: "leads", Component: Leads },
  { path: "deals", Component: Deals },
  { path: "approvals", Component: Approvals },
  { path: "integrations", Component: Integrations },
  { path: "settings", Component: SettingsPage },
  { path: "conversations", Component: Conversations },
  { path: "diagnostics", Component: Diagnostics },
];

export const router = createBrowserRouter([
  { path: "/", Component: Landing },
  { path: "/login", Component: Login },
  { path: "/signup", Component: Signup },
  { path: "/auth/callback", Component: AuthCallback },
  {
    path: "/app",
    Component: ProtectedRoute,
    children: [
      {
        path: "",
        Component: AppShell,
        children: appSubRoutes,
      },
      {
        path: "w/:wsId",
        Component: AppShell,
        children: appSubRoutes,
      },
      {
        path: "workspace/:wsId",
        Component: AppShell,
        children: appSubRoutes,
      },
    ],
  },
  { path: "*", Component: NotFound },
]);
