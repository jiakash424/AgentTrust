import { RouterProvider } from "react-router";
import { router } from "./app/routes";
import { AuthProvider } from "./contexts/AuthContext";
import { WorkflowProvider } from "./contexts/WorkflowContext";
import { ThemeProvider } from "./contexts/ThemeContext";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <WorkflowProvider>
          <RouterProvider router={router} />
        </WorkflowProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
