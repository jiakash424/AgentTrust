import { RouterProvider } from "react-router";
import { router } from "./app/routes";
import { AuthProvider } from "./contexts/AuthContext";
import { WorkflowProvider } from "./contexts/WorkflowContext";

export default function App() {
  return (
    <AuthProvider>
      <WorkflowProvider>
        <RouterProvider router={router} />
      </WorkflowProvider>
    </AuthProvider>
  );
}
